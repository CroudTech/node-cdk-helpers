import * as appmesh from "@aws-cdk/aws-appmesh"
import * as cdk from '@aws-cdk/core';
import * as cdkTypes from "./types"
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as route53 from "@aws-cdk/aws-route53"
import * as servicediscovery from "@aws-cdk/aws-servicediscovery";
import * as ssm from "@aws-cdk/aws-ssm";
import * as templates from "./templates"



export class ResourceImport {
    importedResources: cdkTypes.ImportedResourceMap = {
        securityGroups: {},
        ecsClusters: {},
        vpcs: {},
        cloudmapNamespaces: {},
        appmeshes: {},
        hostedZones: {},
        subnets: {},
    }
    context: cdk.Stack
    parameter_name_prefix: string
    _props: cdkTypes.BaseCdkExtensionProps

    constructor(context: cdk.Stack, props: cdkTypes.BaseCdkExtensionProps) {
        this.context = context
        this._props = props
        this.parameter_name_prefix = templates.cfParameterPrefix(this._props["organisation"], this._props["department"], this._props["environment"])
    }

    getCfSSMValue(key: string, stack: string): string {
        const parameter_name: string = templates.cfParameterName(this.parameter_name_prefix, stack, key)
        return ssm.StringParameter.valueForStringParameter(this.context, parameter_name)
    }

    importSubnet(name: string, props: cdkTypes.ImportSubnetProps): ec2.ISubnet {
        if (!(name in this.importedResources.subnets)) {
            this.importedResources.subnets[name] = ec2.Subnet.fromSubnetAttributes(this.context, name, {
                subnetId: props.subnetId
            })
        }
        return this.importedResources.subnets[name]
    }

    importVpc(name: string, props: cdkTypes.ImportVpcProps): ec2.IVpc {
        if (!(name in this.importedResources.vpcs)) {
            const region = cdk.Stack.of(this.context).region
            const availabilityZones: string[] = []
            const defaultProps: cdkTypes.ImportVpcProps = {
                vpcId: "",
                availabilityZoneSuffixes: [
                    "a", "b", "c"
                ],
                publicSubnetIds: [
                    this.getCfSSMValue("PublicSubnetAId", "Root"),
                    this.getCfSSMValue("PublicSubnetBId", "Root"),
                    this.getCfSSMValue("PublicSubnetCId", "Root"),
                ],
                privateSubnetIds: [
                    this.getCfSSMValue("PrivateSubnetAId", "Root"),
                    this.getCfSSMValue("PrivateSubnetBId", "Root"),
                    this.getCfSSMValue("PrivateSubnetCId", "Root"),
                ],
                publicSubnetRouteTableIds: [
                    this.getCfSSMValue("PublicRouteTableAId", "Root"),
                    this.getCfSSMValue("PublicRouteTableAId", "Root"),
                    this.getCfSSMValue("PublicRouteTableAId", "Root"),
                ],
                privateSubnetRouteTableIds: [
                    this.getCfSSMValue("PrivateRouteTableAId", "Root"),
                    this.getCfSSMValue("PrivateRouteTableBId", "Root"),
                    this.getCfSSMValue("PrivateRouteTableCId", "Root"),
                ]
            }
            const mergedProps: cdkTypes.ImportVpcProps = { ...defaultProps, ...props }
            mergedProps.availabilityZoneSuffixes?.forEach(suffix => {
                availabilityZones.push(`${region}${suffix}`)
            });
            this.importedResources.vpcs[name] = ec2.Vpc.fromVpcAttributes(this.context, `Vpc${name}`, {
                vpcId: this.getCfSSMValue("VPC", "Root"),
                availabilityZones: availabilityZones,
                publicSubnetIds: mergedProps.publicSubnetIds,
                privateSubnetIds: mergedProps.privateSubnetIds,
                publicSubnetRouteTableIds: mergedProps.publicSubnetRouteTableIds,
                privateSubnetRouteTableIds: mergedProps.privateSubnetRouteTableIds,
            })
        }
        return this.importedResources.vpcs[name]
    }

    importSecuritygroup(name: string, securityGroupId: string): ec2.ISecurityGroup {
        if (!(securityGroupId in this.importedResources.securityGroups)) {
            this.importedResources.securityGroups[name] = ec2.SecurityGroup.fromSecurityGroupId(this.context, `SecurityGroup${name}`, securityGroupId)
        }
        return this.importedResources.securityGroups[name]
    }

    importEcsCluster(name: string, props: cdkTypes.ImportEcsClusterProps): ecs.ICluster {
        if (!(name in this.importedResources.ecsClusters)) {
            const clusterName: string = this.context.splitArn(props.clusterArn, cdk.ArnFormat.SLASH_RESOURCE_NAME).resourceName || ""

            this.importedResources.ecsClusters[name] = ecs.Cluster.fromClusterAttributes(this.context, `EcsCluster${name}`, {
                vpc: props.vpc,
                clusterName: clusterName,
                securityGroups: [
                    props.securityGroup
                ]
            })
        }

        return this.importedResources.ecsClusters[name]
    }

    importCloudmapNamespace(name: string, props: Partial<cdkTypes.ImportCloudmapNamespaceProps> = {}): servicediscovery.INamespace {
        if (!(name in this.importedResources.cloudmapNamespaces)) {
            const defaultProps: cdkTypes.ImportCloudmapNamespaceProps = {
                namespaceId: this.getCfSSMValue("ECSServiceDiscoveryNamespace", "Apps"),
                namespaceName: this.getCfSSMValue("ECSServiceDiscoveryDomainName", "Apps"),
            }
            const mergedProps = { ...defaultProps, ...props }

            this.importedResources.cloudmapNamespaces[name] = servicediscovery.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(this.context, `ServiceDiscoveryNamespace${name}`, {
                namespaceId: mergedProps.namespaceId,
                namespaceName: mergedProps.namespaceName,
                namespaceArn: cdk.Fn.sub("arn:aws:servicediscovery:${AWS::Region}:${AWS::AccountId}:namespace/${NamespaceId}", {
                    NamespaceId: mergedProps.namespaceId
                })
            })
        }

        return this.importedResources.cloudmapNamespaces[name]
    }

    importMesh(name: string, props: Partial<cdkTypes.ImportAppMeshProps> = {}): appmesh.IMesh {
        if (!(name in this.importedResources.appmeshes)) {
            const defaultProps: cdkTypes.ImportAppMeshProps = {
                meshArn: this.getCfSSMValue("AppMeshArn", "Apps")
            }
            const mergedProps = { ...defaultProps, ...props }

            this.importedResources.appmeshes[name] = appmesh.Mesh.fromMeshArn(
                this.context,
                `AppMesh${name}`,
                mergedProps.meshArn,
            )
        }
        return this.importedResources.appmeshes[name]
    }

    importHostedZone(name: string, props: Partial<cdkTypes.ImportHostedZoneProps> = {}) {
        if (!(name in this.importedResources.hostedZones)) {
            const defaultProps: Partial<cdkTypes.ImportHostedZoneProps> = {}
            if ("existingType" in props) {
                const defaultProps: cdkTypes.ImportHostedZoneProps = {
                    hostedZoneId: this.getCfSSMValue(`${props.existingType}HostedZoneId`, "Root"),
                    zoneName: this.getCfSSMValue(`${props.existingType}HostedZoneTld`, "Root"),
                }
            }

            const mergedProps:Partial<cdkTypes.ImportHostedZoneProps> = { ...defaultProps, ...props }
            
            this.importedResources.hostedZones[name] = route53.HostedZone.fromHostedZoneAttributes(
                this.context,
                name,
                {
                    hostedZoneId: mergedProps.hostedZoneId,
                    zoneName: mergedProps.zoneName
                }
            )
        }
        return this.importedResources.hostedZones[name]
    } 
}

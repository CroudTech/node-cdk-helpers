"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceImport = void 0;
const appmesh = __importStar(require("@aws-cdk/aws-appmesh"));
const cdk = __importStar(require("@aws-cdk/core"));
const ec2 = __importStar(require("@aws-cdk/aws-ec2"));
const ecs = __importStar(require("@aws-cdk/aws-ecs"));
const route53 = __importStar(require("@aws-cdk/aws-route53"));
const servicediscovery = __importStar(require("@aws-cdk/aws-servicediscovery"));
const ssm = __importStar(require("@aws-cdk/aws-ssm"));
const templates = __importStar(require("./templates"));
const rds = __importStar(require("@aws-cdk/aws-rds"));
class ResourceImport {
    constructor(context, props) {
        this.importedResources = {
            securityGroups: {},
            ecsClusters: {},
            vpcs: {},
            cloudmapNamespaces: {},
            appmeshes: {},
            hostedZones: {},
            subnets: {},
            rdsInstances: {},
        };
        this.context = context;
        this._props = props;
        this.parameter_name_prefix = templates.cfParameterPrefix(this._props["organisation"], this._props["department"], this._props["environment"]);
    }
    getCfSSMValue(key, stack) {
        const parameter_name = templates.cfParameterName(this.parameter_name_prefix, stack, key);
        return ssm.StringParameter.valueForStringParameter(this.context, parameter_name);
    }
    importSubnet(name, props) {
        if (!(name in this.importedResources.subnets)) {
            this.importedResources.subnets[name] = ec2.Subnet.fromSubnetAttributes(this.context, name, {
                subnetId: props.subnetId
            });
        }
        return this.importedResources.subnets[name];
    }
    importVpc(name, props) {
        var _a;
        if (!(name in this.importedResources.vpcs)) {
            const region = cdk.Stack.of(this.context).region;
            const availabilityZones = [];
            const defaultProps = {
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
            };
            const mergedProps = Object.assign(Object.assign({}, defaultProps), props);
            (_a = mergedProps.availabilityZoneSuffixes) === null || _a === void 0 ? void 0 : _a.forEach(suffix => {
                availabilityZones.push(`${region}${suffix}`);
            });
            this.importedResources.vpcs[name] = ec2.Vpc.fromVpcAttributes(this.context, `Vpc${name}`, {
                vpcId: this.getCfSSMValue("VPC", "Root"),
                availabilityZones: availabilityZones,
                publicSubnetIds: mergedProps.publicSubnetIds,
                privateSubnetIds: mergedProps.privateSubnetIds,
                publicSubnetRouteTableIds: mergedProps.publicSubnetRouteTableIds,
                privateSubnetRouteTableIds: mergedProps.privateSubnetRouteTableIds,
            });
        }
        return this.importedResources.vpcs[name];
    }
    importSecuritygroup(name, securityGroupId) {
        if (!(securityGroupId in this.importedResources.securityGroups)) {
            this.importedResources.securityGroups[name] = ec2.SecurityGroup.fromSecurityGroupId(this.context, `SecurityGroup${name}`, securityGroupId);
        }
        return this.importedResources.securityGroups[name];
    }
    importEcsCluster(name, props) {
        if (!(name in this.importedResources.ecsClusters)) {
            const clusterName = this.context.splitArn(props.clusterArn, cdk.ArnFormat.SLASH_RESOURCE_NAME).resourceName || "";
            this.importedResources.ecsClusters[name] = ecs.Cluster.fromClusterAttributes(this.context, `EcsCluster${name}`, {
                vpc: props.vpc,
                clusterName: clusterName,
                securityGroups: [
                    props.securityGroup
                ]
            });
        }
        return this.importedResources.ecsClusters[name];
    }
    importCloudmapNamespace(name, props = {}) {
        if (!(name in this.importedResources.cloudmapNamespaces)) {
            const defaultProps = {
                namespaceId: this.getCfSSMValue("ECSServiceDiscoveryNamespace", "Apps"),
                namespaceName: this.getCfSSMValue("ECSServiceDiscoveryDomainName", "Apps"),
            };
            const mergedProps = Object.assign(Object.assign({}, defaultProps), props);
            this.importedResources.cloudmapNamespaces[name] = servicediscovery.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(this.context, `ServiceDiscoveryNamespace${name}`, {
                namespaceId: mergedProps.namespaceId,
                namespaceName: mergedProps.namespaceName,
                namespaceArn: cdk.Fn.sub("arn:aws:servicediscovery:${AWS::Region}:${AWS::AccountId}:namespace/${NamespaceId}", {
                    NamespaceId: mergedProps.namespaceId
                })
            });
        }
        return this.importedResources.cloudmapNamespaces[name];
    }
    importMesh(name, props = {}) {
        if (!(name in this.importedResources.appmeshes)) {
            const defaultProps = {
                meshArn: this.getCfSSMValue("AppMeshArn", "Apps")
            };
            const mergedProps = Object.assign(Object.assign({}, defaultProps), props);
            this.importedResources.appmeshes[name] = appmesh.Mesh.fromMeshArn(this.context, `AppMesh${name}`, mergedProps.meshArn);
        }
        return this.importedResources.appmeshes[name];
    }
    importHostedZoneFromCfVpcStack(name, type) {
        if (!(name in this.importedResources.hostedZones)) {
            this.importedResources.hostedZones[name] = route53.HostedZone.fromHostedZoneAttributes(this.context, name, {
                hostedZoneId: this.getCfSSMValue(`${type}HostedZoneId`, "Root"),
                zoneName: this.getCfSSMValue(`${type}HostedZoneTld`, "Root"),
            });
        }
        return this.importedResources.hostedZones[name];
    }
    importHostedZone(name, props) {
        if (!(name in this.importedResources.hostedZones)) {
            this.importedResources.hostedZones[name] = route53.HostedZone.fromHostedZoneAttributes(this.context, name, {
                hostedZoneId: props.hostedZoneId,
                zoneName: props.zoneName
            });
        }
        return this.importedResources.hostedZones[name];
    }
    importRdsInstance(name, props = {}) {
        if (!(name in this.importedResources.rdsInstances)) {
            const defaultProps = {
                instanceIdentifier: this.getCfSSMValue("PostgresInstanceIdentifier", "Apps"),
                instanceEndpointAddress: this.getCfSSMValue("PostgresInstanceHost", "Apps"),
                securityGroups: [this.importSecuritygroup("RdsInstanceSecurityGroup", this.getCfSSMValue("PostgresInstanceSecurityGroup", "Apps"))],
                port: 5432
            };
            const mergedProps = Object.assign(Object.assign({}, defaultProps), props);
            this.importedResources.rdsInstances[name] = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this.context, name, {
                instanceIdentifier: mergedProps.instanceIdentifier,
                instanceEndpointAddress: mergedProps.instanceEndpointAddress,
                securityGroups: mergedProps.securityGroups,
                port: mergedProps.port
            });
        }
        return this.importedResources.rdsInstances[name];
    }
}
exports.ResourceImport = ResourceImport;

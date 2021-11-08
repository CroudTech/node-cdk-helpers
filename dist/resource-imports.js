"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceImport = void 0;
var appmesh = require("@aws-cdk/aws-appmesh");
var cdk = require("@aws-cdk/core");
var ec2 = require("@aws-cdk/aws-ec2");
var ecs = require("@aws-cdk/aws-ecs");
var route53 = require("@aws-cdk/aws-route53");
var servicediscovery = require("@aws-cdk/aws-servicediscovery");
var ssm = require("@aws-cdk/aws-ssm");
var templates = require("./templates");
var rds = require("@aws-cdk/aws-rds");
var ResourceImport = /** @class */ (function () {
    function ResourceImport(context, props) {
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
    ResourceImport.prototype.getCfSSMValue = function (key, stack) {
        var parameter_name = templates.cfParameterName(this.parameter_name_prefix, stack, key);
        return ssm.StringParameter.valueForStringParameter(this.context, parameter_name);
    };
    ResourceImport.prototype.importSubnet = function (name, props) {
        if (!(name in this.importedResources.subnets)) {
            this.importedResources.subnets[name] = ec2.Subnet.fromSubnetAttributes(this.context, name, {
                subnetId: props.subnetId
            });
        }
        return this.importedResources.subnets[name];
    };
    ResourceImport.prototype.importVpc = function (name, props) {
        var _a;
        if (!(name in this.importedResources.vpcs)) {
            var region_1 = cdk.Stack.of(this.context).region;
            var availabilityZones_1 = [];
            var defaultProps = {
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
            var mergedProps = __assign(__assign({}, defaultProps), props);
            (_a = mergedProps.availabilityZoneSuffixes) === null || _a === void 0 ? void 0 : _a.forEach(function (suffix) {
                availabilityZones_1.push("" + region_1 + suffix);
            });
            this.importedResources.vpcs[name] = ec2.Vpc.fromVpcAttributes(this.context, "Vpc" + name, {
                vpcId: this.getCfSSMValue("VPC", "Root"),
                availabilityZones: availabilityZones_1,
                publicSubnetIds: mergedProps.publicSubnetIds,
                privateSubnetIds: mergedProps.privateSubnetIds,
                publicSubnetRouteTableIds: mergedProps.publicSubnetRouteTableIds,
                privateSubnetRouteTableIds: mergedProps.privateSubnetRouteTableIds,
            });
        }
        return this.importedResources.vpcs[name];
    };
    ResourceImport.prototype.importSecuritygroup = function (name, securityGroupId) {
        if (!(securityGroupId in this.importedResources.securityGroups)) {
            this.importedResources.securityGroups[name] = ec2.SecurityGroup.fromSecurityGroupId(this.context, "SecurityGroup" + name, securityGroupId);
        }
        return this.importedResources.securityGroups[name];
    };
    ResourceImport.prototype.importEcsCluster = function (name, props) {
        if (!(name in this.importedResources.ecsClusters)) {
            var clusterName = this.context.splitArn(props.clusterArn, cdk.ArnFormat.SLASH_RESOURCE_NAME).resourceName || "";
            this.importedResources.ecsClusters[name] = ecs.Cluster.fromClusterAttributes(this.context, "EcsCluster" + name, {
                vpc: props.vpc,
                clusterName: clusterName,
                securityGroups: [
                    props.securityGroup
                ]
            });
        }
        return this.importedResources.ecsClusters[name];
    };
    ResourceImport.prototype.importCloudmapNamespace = function (name, props) {
        if (props === void 0) { props = {}; }
        if (!(name in this.importedResources.cloudmapNamespaces)) {
            var defaultProps = {
                namespaceId: this.getCfSSMValue("ECSServiceDiscoveryNamespace", "Apps"),
                namespaceName: this.getCfSSMValue("ECSServiceDiscoveryDomainName", "Apps"),
            };
            var mergedProps = __assign(__assign({}, defaultProps), props);
            this.importedResources.cloudmapNamespaces[name] = servicediscovery.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(this.context, "ServiceDiscoveryNamespace" + name, {
                namespaceId: mergedProps.namespaceId,
                namespaceName: mergedProps.namespaceName,
                namespaceArn: cdk.Fn.sub("arn:aws:servicediscovery:${AWS::Region}:${AWS::AccountId}:namespace/${NamespaceId}", {
                    NamespaceId: mergedProps.namespaceId
                })
            });
        }
        return this.importedResources.cloudmapNamespaces[name];
    };
    ResourceImport.prototype.importMesh = function (name, props) {
        if (props === void 0) { props = {}; }
        if (!(name in this.importedResources.appmeshes)) {
            var defaultProps = {
                meshArn: this.getCfSSMValue("AppMeshArn", "Apps")
            };
            var mergedProps = __assign(__assign({}, defaultProps), props);
            this.importedResources.appmeshes[name] = appmesh.Mesh.fromMeshArn(this.context, "AppMesh" + name, mergedProps.meshArn);
        }
        return this.importedResources.appmeshes[name];
    };
    ResourceImport.prototype.importHostedZoneFromCfVpcStack = function (name, type) {
        if (!(name in this.importedResources.hostedZones)) {
            this.importedResources.hostedZones[name] = route53.HostedZone.fromHostedZoneAttributes(this.context, name, {
                hostedZoneId: this.getCfSSMValue(type + "HostedZoneId", "Root"),
                zoneName: this.getCfSSMValue(type + "HostedZoneTld", "Root"),
            });
        }
        return this.importedResources.hostedZones[name];
    };
    ResourceImport.prototype.importHostedZone = function (name, props) {
        if (!(name in this.importedResources.hostedZones)) {
            this.importedResources.hostedZones[name] = route53.HostedZone.fromHostedZoneAttributes(this.context, name, {
                hostedZoneId: props.hostedZoneId,
                zoneName: props.zoneName
            });
        }
        return this.importedResources.hostedZones[name];
    };
    ResourceImport.prototype.importRdsInstance = function (name, props) {
        if (props === void 0) { props = {}; }
        if (!(name in this.importedResources.rdsInstances)) {
            var defaultProps = {
                instanceIdentifier: this.getCfSSMValue("PostgresInstanceIdentifier", "Apps"),
                instanceEndpointAddress: this.getCfSSMValue("PostgresInstanceHost", "Apps"),
                securityGroups: [this.importSecuritygroup("RdsInstanceSecurityGroup", this.getCfSSMValue("PostgresInstanceSecurityGroup", "Apps"))],
                port: 5432
            };
            var mergedProps = __assign(__assign({}, defaultProps), props);
            this.importedResources.rdsInstances[name] = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this.context, name, {
                instanceIdentifier: mergedProps.instanceIdentifier,
                instanceEndpointAddress: mergedProps.instanceEndpointAddress,
                securityGroups: mergedProps.securityGroups,
                port: mergedProps.port
            });
        }
        return this.importedResources.rdsInstances[name];
    };
    return ResourceImport;
}());
exports.ResourceImport = ResourceImport;

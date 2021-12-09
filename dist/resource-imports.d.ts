import * as appmesh from "@aws-cdk/aws-appmesh";
import * as cdk from '@aws-cdk/core';
import * as cdkTypes from "./types";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as route53 from "@aws-cdk/aws-route53";
import * as servicediscovery from "@aws-cdk/aws-servicediscovery";
import * as rds from "@aws-cdk/aws-rds";
export declare class ResourceImport {
    importedResources: cdkTypes.ImportedResourceMap;
    context: cdk.Stack;
    parameter_name_prefix: string;
    _props: cdkTypes.BaseCdkExtensionProps;
    constructor(context: cdk.Stack, props: cdkTypes.BaseCdkExtensionProps);
    getCfSSMValue(key: string, stack: string): string;
    importSubnet(name: string, props: cdkTypes.ImportSubnetProps): ec2.ISubnet;
    importVpc(name: string, props: cdkTypes.ImportVpcProps): ec2.IVpc;
    importSecuritygroup(name: string, securityGroupId: string): ec2.ISecurityGroup;
    importEcsCluster(name: string, props: cdkTypes.ImportEcsClusterProps): ecs.ICluster;
    importCloudmapNamespace(name: string, props?: Partial<cdkTypes.ImportCloudmapNamespaceProps>): servicediscovery.INamespace;
    importMesh(name: string, props?: Partial<cdkTypes.ImportAppMeshProps>): appmesh.IMesh;
    importHostedZoneFromCfVpcStack(name: string, type: cdkTypes.ImportHostedZoneType): route53.IHostedZone;
    importHostedZone(name: string, props: cdkTypes.ImportHostedZoneProps): route53.IHostedZone;
    importRdsInstance(name: string, props?: Partial<cdkTypes.ImportRdsInstanceProps>): rds.IDatabaseInstance;
}

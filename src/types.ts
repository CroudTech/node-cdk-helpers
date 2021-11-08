import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as appmesh from "@aws-cdk/aws-appmesh";
import * as servicediscovery from "@aws-cdk/aws-servicediscovery";
import * as route53 from "@aws-cdk/aws-route53"
import * as rds from "@aws-cdk/aws-rds"

export type EnvironmentType = {
    [key: string]: string
}

export type ResourceMap = {
    [key: string]: cdk.Construct
}

export type ImportedSecurityGroupMap = {
    [key: string]: ec2.ISecurityGroup
}

export type ImportedEcsClusters = {
    [key: string]: ecs.ICluster
}

export type ImportedVpcs = {
    [key: string]: ec2.IVpc
}

export type DockerLabels = {
    [key: string]: string
}

export type ContainersType = {
    [key: string]: ecs.ContainerDefinition
}

export type ImportedCloudmapNamespaces = {
    [key: string]: servicediscovery.INamespace
}

export type ImportedAppMeshes = {
    [key: string]: appmesh.IMesh
}

export type ImportedHostedZones = {
    [key: string]: route53.IHostedZone
}

export type ImportedSubnets = {
    [key: string]: ec2.ISubnet
}

export type ImportedRdsInstances = {
    [key: string]: rds.IDatabaseInstance
}

export interface ImportedResourceMap {
    securityGroups: ImportedSecurityGroupMap
    ecsClusters: ImportedEcsClusters
    vpcs: ImportedVpcs
    cloudmapNamespaces: ImportedCloudmapNamespaces
    appmeshes: ImportedAppMeshes
    hostedZones: ImportedHostedZones
    subnets: ImportedSubnets
    rdsInstances: ImportedRdsInstances
}

export interface ImportEcsClusterProps {
    readonly clusterArn: string
    readonly vpc: ec2.IVpc
    readonly securityGroup: ec2.ISecurityGroup
}

export interface ImportVpcProps {
    readonly vpcId: string
    readonly publicSubnetIds?: string[]
    readonly privateSubnetIds?: string[]
    readonly publicSubnetRouteTableIds?: string[]
    readonly privateSubnetRouteTableIds?: string[]
    readonly availabilityZoneSuffixes?: string[]
}

export interface ImportAppMeshProps {
    readonly meshArn: string
}
export interface ImportCloudmapNamespaceProps {
    readonly namespaceId: string
    readonly namespaceName: string
}

export interface BaseCdkExtensionProps {
    readonly department: string
    readonly environment: string
    readonly organisation: string
}

export interface EcsApplicationInitProps extends BaseCdkExtensionProps {
    readonly applicationEcrRepository: string
    readonly name: string
}

export enum ImportHostedZoneType {
    PUBLIC = "Public",
    PRIVATE = "Private",
}

export interface ImportHostedZoneProps {
    readonly hostedZoneId: string
    readonly zoneName: string
    readonly existingType?: ImportHostedZoneType
}

export interface ImportRdsInstanceProps {
    readonly instanceIdentifier: string
    readonly instanceEndpointAddress: string 
    readonly securityGroups: ec2.ISecurityGroup[]
    readonly port: number
}

export interface ImportSubnetProps {
    readonly subnetId: string
}

export interface ApplicationVolume {
    readonly rootDirectory: string
    readonly name: string
    readonly containerPath: string
    readonly readOnly: boolean
}

export interface EcsApplicationProps extends BaseCdkExtensionProps {
    readonly name: string
    readonly cpu: string
    readonly envoyProxy?: boolean
    readonly memoryMiB: string
    readonly command?: string[]
    readonly appPort: number
    readonly appHealthCheckPath: string
    readonly environmentVars?: EnvironmentType
    readonly proxyPath?: string
    readonly hostname?: string
    readonly applicationEcrRepository: string
    readonly appVolumes?: ApplicationVolume[]
}

export interface defaultParameters {
    Department: cdk.CfnParameter
    Environment: cdk.CfnParameter
    Organisation: cdk.CfnParameter
};

export interface defaultEcsAppParameters {
    AppEnvironment: cdk.CfnParameter
    AppName: cdk.CfnParameter
    AppPort: cdk.CfnParameter
    EcsRepositoryName: cdk.CfnParameter
    EcsRepositoryTag: cdk.CfnParameter
    MeshArn?: cdk.CfnParameter
    ServiceDiscoveryName: cdk.CfnParameter
    ClusterName: cdk.CfnParameter
    EfsFilesystemId: cdk.CfnParameter,
    ProxyPath: cdk.CfnParameter,
    Hostname?: cdk.CfnParameter,
};

export interface defaultEcsInitParameters {
    EcsRepositoryName: cdk.CfnParameter
    AppName: cdk.CfnParameter
};

export interface CreateServiceProps {
    cluster: ecs.ICluster
    taskDefinition: ecs.TaskDefinition
    cloudmapNamespace: servicediscovery.INamespace
    ecsSecurityGroup: ec2.ISecurityGroup | ec2.SecurityGroup
}
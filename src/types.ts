import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as appmesh from "@aws-cdk/aws-appmesh";
import * as servicediscovery from "@aws-cdk/aws-servicediscovery";



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

export interface ImportedResourceMap {
    securityGroups: ImportedSecurityGroupMap
    ecsClusters: ImportedEcsClusters
    vpcs: ImportedVpcs
    cloudmapNamespaces: ImportedCloudmapNamespaces
    appmeshes: ImportedAppMeshes
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

export interface EcrApplicationInitProps extends BaseCdkExtensionProps {
    readonly applicationEcrRepository: string
    readonly name: string
}

export interface ApplicationVolume {
    readonly rootDirectory: string
    readonly name: string
    readonly containerPath: string
    readonly readOnly: boolean
}

export interface EcrApplicationProps extends BaseCdkExtensionProps {
    readonly name: string
    readonly cpu: string
    readonly envoyProxy?: boolean
    readonly memoryMiB: string
    readonly command?: string[]
    readonly appPort: number
    readonly appHealthCheckPath: string
    readonly environmentVars?: EnvironmentType
    readonly proxyPath?: string
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
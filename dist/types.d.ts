import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as appmesh from "@aws-cdk/aws-appmesh";
import * as servicediscovery from "@aws-cdk/aws-servicediscovery";
import * as route53 from "@aws-cdk/aws-route53";
import * as rds from "@aws-cdk/aws-rds";
export declare type EnvironmentType = {
    [key: string]: string;
};
export declare type ResourceMap = {
    [key: string]: cdk.Construct;
};
export declare type ImportedSecurityGroupMap = {
    [key: string]: ec2.ISecurityGroup;
};
export declare type ImportedEcsClusters = {
    [key: string]: ecs.ICluster;
};
export declare type ImportedVpcs = {
    [key: string]: ec2.IVpc;
};
export declare type DockerLabels = {
    [key: string]: string;
};
export declare type ContainersType = {
    [key: string]: ecs.ContainerDefinition;
};
export declare type ImportedCloudmapNamespaces = {
    [key: string]: servicediscovery.INamespace;
};
export declare type ImportedAppMeshes = {
    [key: string]: appmesh.IMesh;
};
export declare type ImportedHostedZones = {
    [key: string]: route53.IHostedZone;
};
export declare type ImportedSubnets = {
    [key: string]: ec2.ISubnet;
};
export declare type ImportedRdsInstances = {
    [key: string]: rds.IDatabaseInstance;
};
export interface ImportedResourceMap {
    securityGroups: ImportedSecurityGroupMap;
    ecsClusters: ImportedEcsClusters;
    vpcs: ImportedVpcs;
    cloudmapNamespaces: ImportedCloudmapNamespaces;
    appmeshes: ImportedAppMeshes;
    hostedZones: ImportedHostedZones;
    subnets: ImportedSubnets;
    rdsInstances: ImportedRdsInstances;
}
export interface ImportEcsClusterProps {
    readonly clusterArn: string;
    readonly vpc: ec2.IVpc;
    readonly securityGroup: ec2.ISecurityGroup;
}
export interface ImportVpcProps {
    readonly vpcId: string;
    readonly publicSubnetIds?: string[];
    readonly privateSubnetIds?: string[];
    readonly publicSubnetRouteTableIds?: string[];
    readonly privateSubnetRouteTableIds?: string[];
    readonly availabilityZoneSuffixes?: string[];
}
export interface ImportAppMeshProps {
    readonly meshArn: string;
}
export interface ImportCloudmapNamespaceProps {
    readonly namespaceId: string;
    readonly namespaceName: string;
}
export interface BaseCdkExtensionProps {
    readonly department: string;
    readonly environment: string;
    readonly organisation: string;
}
export interface EcsApplicationInitProps extends BaseCdkExtensionProps {
    readonly applicationEcrRepository: string;
    readonly name: string;
}
export declare enum ImportHostedZoneType {
    PUBLIC = "Public",
    PRIVATE = "Private"
}
export interface ImportHostedZoneProps {
    readonly hostedZoneId: string;
    readonly zoneName: string;
    readonly existingType?: ImportHostedZoneType;
}
export interface ImportRdsInstanceProps {
    readonly instanceIdentifier: string;
    readonly instanceEndpointAddress: string;
    readonly port: number;
    readonly securityGroups: ec2.ISecurityGroup[];
}
export interface ImportSubnetProps {
    readonly subnetId: string;
}
export interface ApplicationVolume {
    readonly rootDirectory: string;
    readonly name: string;
    readonly containerPath: string;
    readonly readOnly: boolean;
}
export interface EcsApplicationProps extends BaseCdkExtensionProps {
    readonly name: string;
    readonly nameSuffix: string;
    readonly cpu: string;
    readonly envoyProxy?: boolean;
    readonly memoryMiB: string;
    readonly command?: string[] | undefined;
    readonly appPort: number;
    readonly extraPorts?: number[];
    readonly appHealthCheckPath: string;
    readonly environmentVars?: EnvironmentType;
    readonly proxyPath?: string;
    readonly hostname?: string;
    readonly applicationEcrRepository: string;
    readonly applicationEcrRepositoryTag?: string;
    readonly appVolumes?: ApplicationVolume[];
    readonly ecsClusterSsmKey: string;
    readonly enableCloudmap: boolean;
    readonly enableIngress?: boolean;
    readonly appContainerName?: string;
    readonly dockerLabels?: DockerLabels;
    readonly enableCustomMetrics?: boolean;
}
export interface defaultParameters {
    Department: cdk.CfnParameter;
    Environment: cdk.CfnParameter;
    Organisation: cdk.CfnParameter;
}
export interface defaultEcsAppParameters {
    AppEnvironment: cdk.CfnParameter;
    AppName: cdk.CfnParameter;
    AppNameSuffix: cdk.CfnParameter;
    AppPort: cdk.CfnParameter;
    EcsRepositoryName: cdk.CfnParameter;
    EcsRepositoryTag: cdk.CfnParameter;
    MeshArn?: cdk.CfnParameter;
    ServiceDiscoveryName: cdk.CfnParameter;
    ClusterName: cdk.CfnParameter;
    EfsFilesystemId: cdk.CfnParameter;
}
export interface defaultEcsInitParameters {
    EcsRepositoryName: cdk.CfnParameter;
    AppName: cdk.CfnParameter;
}
export interface CreateServiceProps {
    cluster: ecs.ICluster;
    taskDefinition: ecs.TaskDefinition;
    cloudmapNamespace?: servicediscovery.INamespace;
    ecsSecurityGroup: ec2.ISecurityGroup | ec2.SecurityGroup;
}
export declare type UtilityTaskDefinitionPropsContainerDependency = {
    [key: string]: string;
};
export interface UtilityTaskDefinitionPropsContainer {
    command: string[];
    dockerImage?: string;
    dockerTag?: string;
    essential?: boolean;
    environmentVars?: EnvironmentType;
    portMappings?: ecs.PortMapping[];
    dependencies?: UtilityTaskDefinitionPropsContainerDependency;
}
export declare type ContainerDefinitions = {
    [key: string]: ecs.ContainerDefinition;
};
export declare type UtilityTaskDefinitionPropsContainers = {
    [key: string]: UtilityTaskDefinitionPropsContainer;
};
export interface UtilityTaskDefinitionProps {
    environmentVars?: EnvironmentType;
    containers: UtilityTaskDefinitionPropsContainers;
    enableTracing?: boolean;
}

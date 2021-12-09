import * as appmesh from "@aws-cdk/aws-appmesh";
import * as awslogs from "@aws-cdk/aws-logs";
import * as cdk from '@aws-cdk/core';
import * as cdkBase from "./base-extensions";
import * as cdkTypes from "./types";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ecs from "@aws-cdk/aws-ecs";
import * as iam from "@aws-cdk/aws-iam";
export declare class CdkHelpers extends cdkBase.BaseCdkResourceExtension {
    addTags(): void;
    _createResources(): void;
}
export declare class EcsApplicationInit extends cdkBase.BaseCdkResourceExtension {
    ecrRepository: ecr.CfnRepository;
    defaultEcsInitParameters: cdkTypes.defaultEcsInitParameters;
    _props: cdkTypes.EcsApplicationInitProps;
    constructor(context: cdk.Stack, props: cdkTypes.EcsApplicationInitProps);
    addTags(): void;
    protected _createResources(): void;
    protected _ecrRepository(): ecr.CfnRepository;
    _defaultEcsInitParameters(): void;
}
export declare class EcsApplication extends cdkBase.BaseCdkResourceExtension {
    defaultEcsAppParameters: cdkTypes.defaultEcsAppParameters;
    taskRole: iam.Role;
    _props: cdkTypes.EcsApplicationProps;
    cluster: ecs.ICluster;
    securityGroup: ec2.ISecurityGroup;
    vpc: ec2.IVpc;
    logGroup: awslogs.LogGroup;
    containers: cdkTypes.ContainersType;
    virtualNode: appmesh.VirtualNode;
    mesh: appmesh.IMesh;
    taskDefinition: ecs.FargateTaskDefinition;
    appEcrImage: ecs.EcrImage;
    service: ecs.FargateService;
    defaultProps: Partial<cdkTypes.EcsApplicationProps>;
    constructor(context: cdk.Stack, props: cdkTypes.EcsApplicationProps);
    protected _createLogGroup(): awslogs.LogGroup;
    protected _createNewLogGroup(name: string): awslogs.LogGroup;
    protected _getServiceDiscoveryName(include_tld?: boolean): string;
    protected _createVirtualNode(): appmesh.VirtualNode;
    protected appPorts(): number[];
    protected _createTaskDefinition(): ecs.TaskDefinition;
    protected _createService(props: cdkTypes.CreateServiceProps): ecs.FargateService;
    protected _createResources(): void;
    getEcrImage(name: string, repository?: string, tag?: string): ecs.EcrImage;
    protected _getAppEnvironment(): string;
    getEnvironmentVars(env: cdkTypes.EnvironmentType): cdkTypes.EnvironmentType;
    protected _addAppContainer(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.ILogGroup): void;
    protected _addXrayDaemon(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.LogGroup): ecs.ContainerDefinition;
    protected _addCwAgent(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.LogGroup): ecs.ContainerDefinition;
    protected _addEnvoyProxy(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.LogGroup): ecs.ContainerDefinition;
    protected _taskRole(): iam.Role;
    protected _createTaskRole(name: string): iam.Role;
    protected _resourceName(name: string): string;
    protected _defaultEcsAppParameters(): void;
    resourceName(name: string, suffix: string): string;
    addUtilityTaskDefinition(name: string, props: cdkTypes.UtilityTaskDefinitionProps): ecs.TaskDefinition;
    addTags(): void;
    protected _outputs(): void;
}
export declare class EcsApplicationDjango extends EcsApplication {
    _createResources(): void;
    protected _addMigrationTaskDefinition(): void;
}

import { CfnParameter, Fn } from '@aws-cdk/core';
import * as appmesh from "@aws-cdk/aws-appmesh"
import * as awslogs from "@aws-cdk/aws-logs"
import * as cdk from '@aws-cdk/core';
import * as cdkBase from "./base-extensions"
import * as cdkTypes from "./types"
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ecs from "@aws-cdk/aws-ecs";
import * as iam from "@aws-cdk/aws-iam"
import * as templates from "./templates"
import * as ssm from '@aws-cdk/aws-ssm';

const XRAY_DAEMON_IMAGE = 'infrastructure/xray';
const CLOUDWATCH_AGENT_IMAGE = 'infrastructure/cwagent';
const APP_MESH_ENVOY_SIDECAR_VERSION = 'v1.15.1.0-prod';

export class CdkHelpers extends cdkBase.BaseCdkResourceExtension {
    addTags() {

        this.defaultTags.forEach(tag => {
            if (tag in this.defaultParameters) {
                var tagValue = Fn.ref(tag)
            } else {
                var tagValue = "Unspecified"
            }
            cdk.Tags.of(this.context).add(tag, tagValue, {
                priority: 100
            });
        });
    }

    _createResources() {

    }
}

export class EcsApplicationInit extends cdkBase.BaseCdkResourceExtension {
    ecrRepository: ecr.CfnRepository
    defaultEcsInitParameters: cdkTypes.defaultEcsInitParameters
    _props: cdkTypes.EcsApplicationInitProps
    constructor(context: cdk.Stack, props: cdkTypes.EcsApplicationInitProps) {
        super(context, props)
        this._props = props
        this._defaultEcsInitParameters()
        this.defaultTags = [
            "Organisation",
            "Environment",
            "Department",
        ]

        this._createResources()
        this.addTags()
    }

    addTags() {

        this.defaultTags.forEach(tag => {
            if (tag in this.defaultParameters) {
                var tagValue = Fn.ref(tag)
                cdk.Tags.of(this.context).add(tag, tagValue, {
                    priority: 100
                });
            }
        });
    }

    protected _createResources(): void {
        this._ecrRepository()
    }

    protected _ecrRepository(): ecr.CfnRepository {
        if (this.ecrRepository == undefined) {
            this.ecrRepository = new ecr.CfnRepository(this.context, "ApplicationEcrRepository", {
                repositoryName: this.defaultEcsInitParameters.EcsRepositoryName.valueAsString,
                lifecyclePolicy: {
                    lifecyclePolicyText: JSON.stringify({
                        "rules": [
                            {
                                "rulePriority": 1,
                                "description": "Delete untagged images",
                                "selection": {
                                    "tagStatus": "untagged",
                                    "countType": "sinceImagePushed",
                                    "countUnit": "days",
                                    "countNumber": 14
                                },
                                "action": {
                                    "type": "expire"
                                }
                            }
                        ]
                    })
                }
            })
        }
        return this.ecrRepository
    }

    _defaultEcsInitParameters(): void {
        this.defaultEcsInitParameters = {
            "EcsRepositoryName": new CfnParameter(this.context, "EcsRepositoryName", { type: "String", default: this._props.applicationEcrRepository }),
            "AppName": new CfnParameter(this.context, "AppName", { type: "String", default: this._props.name }),
        }
    }
}

export class EcsApplication extends cdkBase.BaseCdkResourceExtension {
    defaultEcsAppParameters: cdkTypes.defaultEcsAppParameters
    taskRole: iam.Role
    _props: cdkTypes.EcsApplicationProps
    cluster: ecs.ICluster
    securityGroup: ec2.ISecurityGroup
    vpc: ec2.IVpc
    logGroup: awslogs.LogGroup
    containers: cdkTypes.ContainersType
    virtualNode: appmesh.VirtualNode
    mesh: appmesh.IMesh
    taskDefinition: ecs.FargateTaskDefinition
    appEcrImage: ecs.EcrImage
    service: ecs.FargateService

    defaultProps: Partial<cdkTypes.EcsApplicationProps> = {
        enableIngress: true,
        appContainerName: "app",
        extraPorts: [],
        dockerLabels: {},
        enableCustomMetrics: false,
    }

    constructor(context: cdk.Stack, props: cdkTypes.EcsApplicationProps) {
        super(context, props)
        this._props = { ...this.defaultProps, ...props }
        this._defaultEcsAppParameters()
        this._outputs()
        this.defaultTags = [
            "Organisation",
            "Environment",
            "Department",
            "AppName",
        ]
        this.containers = {}
        this._createResources()
        this.addTags()
    }

    protected _createLogGroup(): awslogs.LogGroup {
        if (this.logGroup == null) {
            this.logGroup = new awslogs.LogGroup(this.context, `AppLogGroup`, {
                logGroupName: Fn.sub("${Organisation}-${Department}-${Environment}-EcsServiceLogs-${AppName}-${AppNameSuffix}"),
                retention: awslogs.RetentionDays.ONE_WEEK,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            })
        }
        return this.logGroup
    }

    protected _createNewLogGroup(name: string): awslogs.LogGroup {
        const logGroup = new awslogs.LogGroup(this.context, `${name}LogGroup`, {
            logGroupName: this.resourceName(this._props.name, name),
            retention: awslogs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })

        return logGroup
    }

    protected _getServiceDiscoveryName(include_tld=true): string {
        const service_discovery_name = this.getCfSSMValue("ECSServiceDiscoveryDomainName", "Apps")

        if (this._props.nameSuffix) {
            var name = `${this._props.name}.${this._props.nameSuffix}`
        } else {
            var name = `${this._props.name}`
        }
        if (include_tld) {
            return Fn.join('.', [name, service_discovery_name])
        } else {
            return name.toLowerCase()
        }
    }

    protected _createVirtualNode(): appmesh.VirtualNode {
        if (this.virtualNode == null) {
            this.virtualNode = new appmesh.VirtualNode(this.context, this._resourceName('VirtualNode'), {
                mesh: this.resourceImports.importMesh("DefaultAppMesh"),
                virtualNodeName: Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"),
                listeners: [
                    appmesh.VirtualNodeListener.http({
                        port: this._props.appPort
                    })
                ],
                serviceDiscovery: appmesh.ServiceDiscovery.dns(
                    this._getServiceDiscoveryName(),
                ),
                accessLog: appmesh.AccessLog.fromFilePath("/dev/stdout")
            });
        }
        return this.virtualNode
    }

    protected appPorts(): number[] {
        return [this._props.appPort, ...this._props.extraPorts || []]
    }

    protected _createTaskDefinition(): ecs.TaskDefinition {
        if (this.taskDefinition == null) {
            if (this._props.enableCloudmap) {
                this.taskDefinition = new ecs.FargateTaskDefinition(this.context, 'TaskDefinition', {
                    cpu: parseInt(this._props.cpu),
                    family: this.resourceName(this._props.name, this._props.nameSuffix),
                    memoryLimitMiB: parseInt(this._props.memoryMiB),
                    taskRole: this._taskRole(),
    
                    proxyConfiguration: new ecs.AppMeshProxyConfiguration({
                        containerName: 'envoy',
                        properties: {
                            appPorts: this.appPorts(),
                            proxyEgressPort: 15001,
                            proxyIngressPort: 15000,
                            ignoredUID: 1337,
                            egressIgnoredIPs: [
                                '169.254.170.2',
                                '169.254.169.254'
                            ]
                        }
                    })
                });
            } else {
                this.taskDefinition = new ecs.FargateTaskDefinition(this.context, 'TaskDefinition', {
                    cpu: parseInt(this._props.cpu),
                    family: this.resourceName(this._props.name, this._props.nameSuffix),
                    memoryLimitMiB: parseInt(this._props.memoryMiB),
                    taskRole: this._taskRole(),
                });
            }
            this.taskDefinition.executionRole?.attachInlinePolicy(new iam.Policy(this.context, "ApplicationTaskExecutionRolePolicy", {
                statements: [
                    // policies to allow access to other AWS services from within the container e.g SES (Simple Email Service)
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "ecr:BatchCheckLayerAvailability",
                            "ecr:GetDownloadUrlForLayer",
                            "ecr:BatchGetImage"
                        ],
                        resources: ["*"],
                    }),
                ],
            }))
            this.taskDefinition.executionRole?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"))
        }

        return this.taskDefinition
    }

    protected _createService(props: cdkTypes.CreateServiceProps) : ecs.FargateService {
        if (this._props.enableCloudmap) {            
            var service = new ecs.FargateService(this.context, "Service", {
                cluster: props.cluster,
                taskDefinition: props.taskDefinition,
                enableExecuteCommand: true,
                // serviceName: Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"),
                cloudMapOptions: {
                    cloudMapNamespace: props.cloudmapNamespace,
                    container: this.containers["app"],
                    dnsTtl: cdk.Duration.seconds(20),
                    name: this._getServiceDiscoveryName(false)
                },
                securityGroup: props.ecsSecurityGroup
            });
        } else {
            var service = new ecs.FargateService(this.context, "Service", {
                cluster: props.cluster,
                taskDefinition: props.taskDefinition,
                enableExecuteCommand: true,
                // serviceName: Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"),
                securityGroup: props.ecsSecurityGroup
            });
        }

        service
            .autoScaleTaskCount({
                minCapacity: 1,
                maxCapacity: 3
            })
            .scaleOnCpuUtilization("ScalingPolicy", {
                targetUtilizationPercent: 80
            });
        return service
    }

    protected _createResources() {
        const logGroup = this._createLogGroup()
        const virtualNode = this._createVirtualNode()
        const taskDefinition = this._createTaskDefinition()
        const vpc = this.resourceImports.importVpc("Vpc", {
            vpcId: this.getCfSSMValue("VPC", "Root")
        })
        const ecsSecurityGroup = this.resourceImports.importSecuritygroup("FargateContainerSecurityGroup", this.getCfSSMValue("FargateContainerSecurityGroup", "Root"))
        const clusterArn = ssm.StringParameter.valueForStringParameter(
            this.context, templates.cfParameterName(this.parameter_name_prefix, "Apps", this._props.ecsClusterSsmKey));
        const cluster = this.resourceImports.importEcsCluster("EcsCluster", {
            vpc: vpc,
            clusterArn: clusterArn,
            securityGroup: ecsSecurityGroup
        })
        this._addAppContainer(taskDefinition, logGroup)
        if (this._props.enableCloudmap) {            
            this._addEnvoyProxy(taskDefinition, logGroup)
            this._addXrayDaemon(taskDefinition, logGroup)
            if (this._props.enableCustomMetrics) {
                this._addCwAgent(taskDefinition, logGroup)
            }  

            const cloudmapNamespace = this.resourceImports.importCloudmapNamespace("DefaultCloudmapNamespace")
            this.service = this._createService({
                cluster: cluster,
                ecsSecurityGroup: ecsSecurityGroup,
                cloudmapNamespace: cloudmapNamespace,
                taskDefinition: taskDefinition
            })
        } else {
            this.service = this._createService({
                cluster: cluster,
                ecsSecurityGroup: ecsSecurityGroup,
                taskDefinition: taskDefinition
            })
        }

    }

    public getEcrImage(name: string, repository?: string, tag?: string): ecs.EcrImage {

        const appEcrImage = new ecs.EcrImage(
            ecr.Repository.fromRepositoryName(
                this.context,
                `EcrRepository${name}`,
                repository || this._props.applicationEcrRepository,
            ),
            tag || this._props.applicationEcrRepositoryTag || "latest"
        )

        return appEcrImage
    }

    protected _getAppEnvironment(): string {
        return this._props.environment.toLowerCase()
    }

    public getEnvironmentVars(env: cdkTypes.EnvironmentType): cdkTypes.EnvironmentType {
        const defaultEnvironmentVars = {
            ENVIRONMENT: this._getAppEnvironment(),
            CONFIG_ENVIRONMENT: this._props.environment,
            APPNAME: this._props.name,
            PORT: this._props.appPort.toString(),
        }

        const environmentVars: cdkTypes.EnvironmentType = { ...env, ...defaultEnvironmentVars }
        return environmentVars
    }

    protected _addAppContainer(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.ILogGroup) {
        const image = this.getEcrImage("ApplicationImage", this._props.applicationEcrRepository, this._props.applicationEcrRepositoryTag)
        const IngressDockerLabels: cdkTypes.DockerLabels = {}
        if (this._props.enableIngress) {
            IngressDockerLabels["traefik.http.routers." + this._props.name + ".entrypoints"] = "websecure"
            IngressDockerLabels["traefik.http.routers." + this._props.name + ".tls"] = "true"
            if ("hostname" in this._props) {
                IngressDockerLabels["traefik.http.routers." + this._props.name + ".rule"] = `Host("${this._props.hostname}") && PathPrefix("${this._props.proxyPath}")`
            } else {
                IngressDockerLabels["traefik.http.routers." + this._props.name + ".rule"] = `PathPrefix("${this._props.proxyPath}");`
            }
        }

        const dockerLabels = { ...IngressDockerLabels, ...this._props.dockerLabels }


        var portMappings: ecs.PortMapping[] = []
        this.appPorts().forEach(port => {
            portMappings.push(
                {
                    containerPort: port,
                    protocol: ecs.Protocol.TCP
                }
            )
        })

        this.containers["app"] = taskDefinition.addContainer("appContainer", {
            containerName: this._props.appContainerName,
            image: image,
            stopTimeout: cdk.Duration.seconds(10),
            command: this._props.command,
            essential: true,
            environment: this.getEnvironmentVars(this._props.environmentVars || {}),
            portMappings: portMappings,
            logging: ecs.LogDriver.awsLogs({
                streamPrefix: this._props.appContainerName + "-" + this.defaultEcsAppParameters.AppName.valueAsString,
                logGroup: logGroup
            }),
            dockerLabels: dockerLabels,
        });

        this._props.appVolumes?.forEach(volume => {
            taskDefinition.addVolume({
                efsVolumeConfiguration: {
                    fileSystemId: this.defaultEcsAppParameters.EfsFilesystemId.valueAsString,
                    rootDirectory: volume.rootDirectory
                },
                name: volume.name
            })
            this.containers["app"].addMountPoints({
                containerPath: volume.containerPath,
                sourceVolume: volume.name,
                readOnly: true,
            })
        })
    }

    protected _addXrayDaemon(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.LogGroup): ecs.ContainerDefinition {
        const containerId = `${taskDefinition.toString()}Xray`
        const registry = ecr.Repository.fromRepositoryName(this.context, "XrayRepository", XRAY_DAEMON_IMAGE)

        this.containers[containerId] = new ecs.ContainerDefinition(this.context, containerId, {
            image: ecs.ContainerImage.fromEcrRepository(registry, 'latest'),
            user: "1337",
            logging: new ecs.AwsLogDriver({
                logGroup: logGroup,
                streamPrefix: "xray"
            }),
            portMappings: [
                {
                    containerPort: 2000,
                    protocol: ecs.Protocol.UDP
                }
            ],
            essential: true,
            taskDefinition: taskDefinition,
            containerName: "xray",
        })
        return this.containers[containerId]
    }

    protected _addCwAgent(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.LogGroup): ecs.ContainerDefinition {
        const containerId = `${taskDefinition.toString()}CwAgent`
        const registry = ecr.Repository.fromRepositoryName(this.context, "CwAgentRepository", CLOUDWATCH_AGENT_IMAGE)

        this.containers[containerId] = new ecs.ContainerDefinition(this.context, containerId, {
            image: ecs.ContainerImage.fromEcrRepository(registry, 'latest'),
            user: '0:1338',
            environment: {
                CW_CONFIG_CONTENT: Fn.sub("{ \"metrics\": { \"namespace\":\"ECS/${Environment}/${AppName}\", \"metrics_collected\": { \"statsd\": {}}}}")
            },
            logging: new ecs.AwsLogDriver({
                logGroup: logGroup,
                streamPrefix: "cwagent"
            }),
            essential: true,
            taskDefinition: taskDefinition,
            containerName: "cwagent",
        })
        return this.containers[containerId]
    }

    protected _addEnvoyProxy(taskDefinition: ecs.TaskDefinition, logGroup: awslogs.LogGroup): ecs.ContainerDefinition {
        const virtualNode = this._createVirtualNode()
        const region = cdk.Stack.of(this.context).region
        const partition = cdk.Stack.of(this.context).partition;
        const envoyImageOwnerAccount = this.accountIdForRegion(region)
        const containerId = `${taskDefinition.toString()}EnvoyRepo`
        const appMeshRepo = ecr.Repository.fromRepositoryAttributes(this.context, containerId, {
            repositoryName: 'aws-appmesh-envoy',
            repositoryArn: `arn:${partition}:ecr:${region}:${envoyImageOwnerAccount}:repository/aws-appmesh-envoy`,
        });
        const environment = {
            APPMESH_RESOURCE_ARN: virtualNode.virtualNodeArn,
            ENVOY_LOG_LEVEL: "debug",
            ENABLE_ENVOY_XRAY_TRACING: "1",
            XRAY_DAEMON_PORT: "2000",  
            ENABLE_ENVOY_STATS_TAGS: "0",
            ENABLE_ENVOY_DOG_STATSD: "0"
        }
        if (this._props.enableCustomMetrics) {
            environment["ENABLE_ENVOY_STATS_TAGS"] ='1'
            environment["ENABLE_ENVOY_DOG_STATSD"] ='1'
        }
        this.containers[containerId] = taskDefinition.addContainer("envoyContainer", {
            containerName: "envoy",
            image: ecs.ContainerImage.fromEcrRepository(appMeshRepo, APP_MESH_ENVOY_SIDECAR_VERSION),
            stopTimeout: cdk.Duration.seconds(10),
            essential: true,
            user: "1337",
            environment: environment,
            healthCheck: {
                command: [
                    "CMD-SHELL",
                    "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"
                ],
                retries: 3,
                timeout: cdk.Duration.seconds(5),
                interval: cdk.Duration.seconds(10),
                startPeriod: cdk.Duration.seconds(15)
            },
            logging: ecs.LogDriver.awsLogs({
                streamPrefix: "envoy-" + this.defaultEcsAppParameters.AppName.valueAsString,
                logGroup: logGroup
            }),
        });

        this.containers["app"].addContainerDependencies({
            container: this.containers[containerId],
            condition: ecs.ContainerDependencyCondition.HEALTHY
        });
        return this.containers[containerId]
    }

    protected _taskRole(): iam.Role {
        this.taskRole = this._createTaskRole("ApplicationTaskRole")
        return this.taskRole
    }

    protected _createTaskRole(name: string): iam.Role {
        const taskRole = new iam.Role(this.context, `TaskRole${name}`, {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            // roleName: Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}-TR"),
            description: "Role that the api task definitions use to run the api code",
        })
        taskRole.attachInlinePolicy(
            new iam.Policy(this.context, `${name}Policy`, {
                statements: [
                    // policies to allow access to other AWS services from within the container e.g SES (Simple Email Service)
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "ssm:GetParametersByPath",
                            "ssm:GetParameters",
                            "ssm:GetParameter",
                        ],
                        resources: [
                            Fn.sub(`arn:aws:ssm:eu-west-2:\${AWS::AccountId}:parameter/appconfig/${this._props.name}/${this._props.environment}*`),
                            Fn.sub(`arn:aws:ssm:eu-west-2:\${AWS::AccountId}:parameter/appconfig/common/${this._props.environment}*`),
                        ],
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "ssm:DescribeParameters",
                            "cloudwatch:PutMetricData",
                            "ssmmessages:*",
                        ],
                        resources: [
                            "*"
                        ],
                    }),
                ],
            })
        );
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"))
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshEnvoyAccess"))
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"))
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"))
        return taskRole
    }

    protected _resourceName(name:string): string {
        return `${name}${this._props.name}${this._props.nameSuffix}`
    }

    protected _defaultEcsAppParameters(): void {

        this.defaultEcsAppParameters = {
            "AppName": new CfnParameter(this.context, "AppName", { type: "String", default: this._props.name }),
            "AppNameSuffix": new CfnParameter(this.context, "AppNameSuffix", { type: "String", default: this._props.nameSuffix }),
            "AppPort": new CfnParameter(this.context, "AppPort", { type: "Number", default: this._props.appPort }),
            "AppEnvironment": new CfnParameter(this.context, "AppEnvironment", { type: "String", default: process.env["ENVIRONMENT"]?.toLowerCase() }),
            "EcsRepositoryName": new CfnParameter(this.context, "EcsRepositoryName", { type: "String", default: this._props.applicationEcrRepository }),
            "ServiceDiscoveryName": new CfnParameter(this.context, "ServiceDiscoveryName", { type: "String", default: this._props.name }),
            "EcsRepositoryTag": new CfnParameter(this.context, "EcsRepositoryTag", {
                type: "String",
                default: process.env["DOCKER_TAG"] || "latest"
            }),
            "ClusterName": new CfnParameter(this.context, "ClusterName", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", this._props.ecsClusterSsmKey) }),
            "EfsFilesystemId": new CfnParameter(this.context, "EfsFilesystemId", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", "EfsFilesystemId") })
        }
        if (this._props.envoyProxy) {
            this.defaultEcsAppParameters["MeshArn"] = new CfnParameter(this.context, "MeshArn", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", "AppMeshArn") })
        }
    }

    public resourceName(name: string, suffix: string): string {
        return `${this._props.organisation}-${this._props.department}-${this._props.environment}-${name}${suffix}`
    }

    public addUtilityTaskDefinition(name: string, props: cdkTypes.UtilityTaskDefinitionProps): ecs.TaskDefinition {
        if (props.enableTracing) {
            var taskDefinition = new ecs.FargateTaskDefinition(this.context, `TaskDefinition${name}`, {
                cpu: parseInt(this._props.cpu),
                memoryLimitMiB: parseInt(this._props.memoryMiB),
                family: this.resourceName(this._props.name, name),
                taskRole: this._createTaskRole(name),
                proxyConfiguration: new ecs.AppMeshProxyConfiguration({
                    containerName: 'envoy',
                    properties: {
                        appPorts: [this._props.appPort],
                        proxyEgressPort: 15001,
                        proxyIngressPort: 15000,
                        ignoredUID: 1337,
                        egressIgnoredIPs: [
                            '169.254.170.2',
                            '169.254.169.254'
                        ]
                    }
                })
            })
        } else {
            var taskDefinition = new ecs.FargateTaskDefinition(this.context, `TaskDefinition${name}`, {
                cpu: parseInt(this._props.cpu),
                memoryLimitMiB: parseInt(this._props.memoryMiB),
                family: this.resourceName(this._props.name, name),
                taskRole: this._createTaskRole(name),
            })
        }


        const logGroup = this._createNewLogGroup(name)
        const baseEnvironmentVars = this.getEnvironmentVars(props.environmentVars || this._props.environmentVars || {})
        const containers: cdkTypes.ContainerDefinitions = {}
        for (const containerName in props.containers) {
            const containerProps = props.containers[containerName]
            containers[containerName] = taskDefinition.addContainer(`${name}${containerName}`, {
                containerName: containerName,
                image: this.getEcrImage(containerName, containerProps.dockerImage, containerProps.dockerTag),
                stopTimeout: cdk.Duration.seconds(10),
                command: containerProps.command,
                essential: containerProps.essential,
                environment: { ...baseEnvironmentVars, ...containerProps.environmentVars },
                portMappings: containerProps.portMappings,
                logging: ecs.LogDriver.awsLogs({
                    streamPrefix: name,
                    logGroup: logGroup
                }),
            });
        }

        for (const containerName in props.containers) {
            const containerProps = props.containers[containerName]

            if (containerProps.dependencies) {
                for (const dependencyContainer in containerProps.dependencies) {
                    const dependencyCondition = containerProps.dependencies[dependencyContainer]
                    if (dependencyContainer in containers && containerName in containers) {
                        containers[containerName].addContainerDependencies({
                            condition: (<any>ecs.ContainerDependencyCondition)[dependencyCondition],
                            container: containers[dependencyContainer]
                        })
                    }
                }
            }
        }

        if (props.enableTracing) {
            this._addEnvoyProxy(taskDefinition, logGroup)
            this._addXrayDaemon(taskDefinition, logGroup)
            if (this._props.enableCustomMetrics) {
                this._addCwAgent(taskDefinition, logGroup)
            }            
        }

        return taskDefinition
    }

    addTags() {
        cdk.Tags.of(this.context).add("Organisation", this._props.organisation, {
            priority: 100
        });
        cdk.Tags.of(this.context).add("Department", this._props.department, {
            priority: 100
        });
        cdk.Tags.of(this.context).add("Environment", this._props.environment, {
            priority: 100
        });
        cdk.Tags.of(this.context).add("AppName", this._props.name, {
            priority: 100
        });
    }

    protected _outputs(): void {

    }
}

export class EcsApplicationDjango extends EcsApplication {
    _createResources() {
        super._createResources()
        this._addMigrationTaskDefinition()
    }

    protected _addMigrationTaskDefinition() {
        const migrationTaskDefinition = this.addUtilityTaskDefinition('Migrate', {
            containers: {
                migrate: {
                    command: "python manage.py migrate".split(" "),
                    dependencies: {
                        "create_db": "COMPLETE"
                    }
                },
                create_db: {
                    command: "python3 /app/create_postgres.py".split(" "),
                    dockerImage: "croudtech/db-creator",
                    dockerTag: "latest",
                    essential: false,
                }
            }
        })

        new ssm.StringParameter(this.context, 'DjangoDbMigrationParameter', {
            description: 'Migration task parameter',
            parameterName: templates.cfParameterName(this.parameter_name_prefix, this._props.name, "MigrationTaskArn"),
            stringValue: migrationTaskDefinition.taskDefinitionArn,
            tier: ssm.ParameterTier.INTELLIGENT_TIERING,
        });
    }
}

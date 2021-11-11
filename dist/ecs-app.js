"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsApplication = exports.EcsApplicationInit = exports.CdkHelpers = void 0;
const core_1 = require("@aws-cdk/core");
const appmesh = require("@aws-cdk/aws-appmesh");
const awslogs = require("@aws-cdk/aws-logs");
const cdk = require("@aws-cdk/core");
const cdkBase = require("./base-extensions");
const ecr = require("@aws-cdk/aws-ecr");
const ecs = require("@aws-cdk/aws-ecs");
const iam = require("@aws-cdk/aws-iam");
const templates = require("./templates");
const ssm = require("@aws-cdk/aws-ssm");
const XRAY_DAEMON_IMAGE = 'amazon/aws-xray-daemon:latest';
const CLOUDWATCH_AGENT_IMAGE = 'amazon/cloudwatch-agent:latest';
const APP_MESH_ENVOY_SIDECAR_VERSION = 'v1.15.1.0-prod';
class CdkHelpers extends cdkBase.BaseCdkResourceExtension {
    _createResources() {
    }
}
exports.CdkHelpers = CdkHelpers;
class EcsApplicationInit extends cdkBase.BaseCdkResourceExtension {
    constructor(context, props) {
        super(context, props);
        this._props = props;
        this._defaultEcsInitParameters();
        this.defaultTags = [
            "Organisation",
            "Environment",
            "Department",
            "AppName",
        ];
        this._createResources();
        this.addTags();
    }
    _createResources() {
        this._ecrRepository();
    }
    _ecrRepository() {
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
            });
        }
        return this.ecrRepository;
    }
    _defaultEcsInitParameters() {
        this.defaultEcsInitParameters = {
            "EcsRepositoryName": new core_1.CfnParameter(this.context, "EcsRepositoryName", { type: "String", default: this._props.applicationEcrRepository }),
            "AppName": new core_1.CfnParameter(this.context, "AppName", { type: "String", default: this._props.name }),
        };
    }
}
exports.EcsApplicationInit = EcsApplicationInit;
class EcsApplication extends cdkBase.BaseCdkResourceExtension {
    constructor(context, props) {
        super(context, props);
        this._props = props;
        this._defaultEcsAppParameters();
        this._outputs();
        this.defaultTags = [
            "Organisation",
            "Environment",
            "Department",
            "AppName",
        ];
        this.containers = {};
        this._createResources();
        this.addTags();
    }
    _createLogGroup() {
        if (this.logGroup == null) {
            this.logGroup = new awslogs.LogGroup(this.context, `ApplicationLogGroup`, {
                logGroupName: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-EcsServiceLogs-${AppName}${AppNameSuffix}"),
                retention: awslogs.RetentionDays.ONE_MONTH,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
        }
        return this.logGroup;
    }
    _createVirtualNode() {
        if (this.virtualNode == null) {
            this.virtualNode = new appmesh.VirtualNode(this.context, this._resourceName('VirtualNode'), {
                mesh: this.resourceImports.importMesh("DefaultAppMesh"),
                virtualNodeName: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"),
                listeners: [
                    appmesh.VirtualNodeListener.http({
                        port: this.defaultEcsAppParameters.AppPort.valueAsNumber
                    })
                ],
                serviceDiscovery: appmesh.ServiceDiscovery.dns(this.getCfSSMValue("ECSServiceDiscoveryDomainName", "Apps") + "." + this.defaultEcsAppParameters["ServiceDiscoveryName"].valueAsString),
                accessLog: appmesh.AccessLog.fromFilePath("/dev/stdout")
            });
        }
        return this.virtualNode;
    }
    _createTaskDefinition() {
        var _a, _b;
        if (this.taskDefinition == null) {
            this.taskDefinition = new ecs.FargateTaskDefinition(this.context, 'TaskDefinition', {
                cpu: parseInt(this._props.cpu),
                family: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"),
                memoryLimitMiB: parseInt(this._props.memoryMiB),
                taskRole: this._taskRole(),
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
            });
            (_a = this.taskDefinition.executionRole) === null || _a === void 0 ? void 0 : _a.attachInlinePolicy(new iam.Policy(this.context, "ApplicationTaskExecutionRolePolicy", {
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
            }));
            (_b = this.taskDefinition.executionRole) === null || _b === void 0 ? void 0 : _b.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"));
        }
        return this.taskDefinition;
    }
    _createService(props) {
        if (this._props.enableCloudmap) {
            var service = new ecs.FargateService(this.context, "Service", {
                cluster: props.cluster,
                taskDefinition: props.taskDefinition,
                serviceName: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"),
                cloudMapOptions: {
                    cloudMapNamespace: props.cloudmapNamespace,
                    container: this.containers["app"],
                    dnsTtl: cdk.Duration.seconds(20),
                    name: this.defaultEcsAppParameters["ServiceDiscoveryName"].valueAsString
                },
                securityGroup: props.ecsSecurityGroup
            });
        }
        else {
            var service = new ecs.FargateService(this.context, "Service", {
                cluster: props.cluster,
                taskDefinition: props.taskDefinition,
                serviceName: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"),
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
    }
    _createResources() {
        const logGroup = this._createLogGroup();
        const virtualNode = this._createVirtualNode();
        const taskDefinition = this._createTaskDefinition();
        const vpc = this.resourceImports.importVpc("Vpc", {
            vpcId: this.getCfSSMValue("VPC", "Root")
        });
        const ecsSecurityGroup = this.resourceImports.importSecuritygroup("FargateContainerSecurityGroup", this.getCfSSMValue("FargateContainerSecurityGroup", "Root"));
        const clusterArn = ssm.StringParameter.valueForStringParameter(this.context, templates.cfParameterName(this.parameter_name_prefix, "Apps", this._props.ecsClusterSsmKey));
        const cluster = this.resourceImports.importEcsCluster("EcsCluster", {
            vpc: vpc,
            clusterArn: clusterArn,
            securityGroup: ecsSecurityGroup
        });
        this._addAppContainer(taskDefinition, logGroup);
        this._addEnvoyProxy(taskDefinition, logGroup);
        this._addXrayDaemon(taskDefinition, logGroup);
        this._addCwAgent(taskDefinition, logGroup);
        const cloudmapNamespace = this.resourceImports.importCloudmapNamespace("DefaultCloudmapNamespace");
        this._createService({
            cluster: cluster,
            ecsSecurityGroup: ecsSecurityGroup,
            cloudmapNamespace: cloudmapNamespace,
            taskDefinition: taskDefinition
        });
    }
    _addAppContainer(taskDefinition, logGroup) {
        var _a, _b, _c;
        const repository = ecr.Repository.fromRepositoryName(this.context, "EcrRepository", this.defaultEcsAppParameters.EcsRepositoryName.valueAsString);
        const image = new ecs.EcrImage(repository, this.defaultEcsAppParameters.EcsRepositoryTag.valueAsString);
        const dockerLabels = {};
        dockerLabels["traefik.http.routers." + this._props.name + ".entrypoints"] = "websecure";
        dockerLabels["traefik.http.routers." + this._props.name + ".tls"] = "true";
        if ("hostname" in this._props) {
            const hostnameTld = this.getCfSSMValue("AlbHostname", "EcsIngress");
            dockerLabels["traefik.http.routers." + this._props.name + ".rule"] = `Host("${(_a = this.defaultEcsAppParameters.Hostname) === null || _a === void 0 ? void 0 : _a.valueAsString}.${hostnameTld}") && PathPrefix("${this.defaultEcsAppParameters.ProxyPath.valueAsString}")`;
        }
        else {
            dockerLabels["traefik.http.routers." + this._props.name + ".rule"] = `PathPrefix("${(_b = this.defaultEcsAppParameters.ProxyPath) === null || _b === void 0 ? void 0 : _b.valueAsString}");`;
        }
        const defaultEnvironmentVars = {
            ENVIRONMENT: this.defaultEcsAppParameters["AppEnvironment"].valueAsString,
            CONFIG_ENVIRONMENT: this.defaultParameters["Environment"].valueAsString,
            APPNAME: this.defaultEcsAppParameters["AppName"].valueAsString,
            PORT: this._props.appPort.toString(),
        };
        const environmentVars = Object.assign(Object.assign({}, this._props.environmentVars), defaultEnvironmentVars);
        this.containers["app"] = taskDefinition.addContainer("appContainer", {
            containerName: "app",
            image: image,
            stopTimeout: cdk.Duration.seconds(10),
            command: this._props.command,
            essential: true,
            environment: environmentVars,
            portMappings: [
                {
                    containerPort: this._props.appPort,
                    protocol: ecs.Protocol.TCP
                }
            ],
            logging: ecs.LogDriver.awsLogs({
                streamPrefix: "app-" + this.defaultEcsAppParameters.AppName.valueAsString,
                logGroup: logGroup
            }),
            dockerLabels: dockerLabels,
        });
        (_c = this._props.appVolumes) === null || _c === void 0 ? void 0 : _c.forEach(volume => {
            taskDefinition.addVolume({
                efsVolumeConfiguration: {
                    fileSystemId: this.defaultEcsAppParameters.EfsFilesystemId.valueAsString,
                    rootDirectory: volume.rootDirectory
                },
                name: volume.name
            });
            this.containers["app"].addMountPoints({
                containerPath: volume.containerPath,
                sourceVolume: volume.name,
                readOnly: true,
            });
        });
    }
    _addXrayDaemon(taskDefinition, logGroup) {
        this.containers["xray"] = new ecs.ContainerDefinition(this.context, "XrayContainer", {
            image: ecs.ContainerImage.fromRegistry(XRAY_DAEMON_IMAGE),
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
        });
        return this.containers["xray"];
    }
    _addCwAgent(taskDefinition, logGroup) {
        this.containers["cwagent"] = new ecs.ContainerDefinition(this.context, "CwAgentContainer", {
            image: ecs.ContainerImage.fromRegistry(CLOUDWATCH_AGENT_IMAGE),
            user: '0:1338',
            environment: {
                CW_CONFIG_CONTENT: core_1.Fn.sub("{ \"metrics\": { \"namespace\":\"ECS/${Environment}/${AppName}\", \"metrics_collected\": { \"statsd\": {}}}}")
            },
            logging: new ecs.AwsLogDriver({
                logGroup: logGroup,
                streamPrefix: "cwagent"
            }),
            essential: true,
            taskDefinition: taskDefinition,
            containerName: "cwagent",
        });
        return this.containers["cwagent"];
    }
    _addEnvoyProxy(taskDefinition, logGroup) {
        const virtualNode = this._createVirtualNode();
        const region = cdk.Stack.of(this.context).region;
        const partition = cdk.Stack.of(this.context).partition;
        const envoyImageOwnerAccount = this.accountIdForRegion(region);
        const appMeshRepo = ecr.Repository.fromRepositoryAttributes(this.context, `EnvoyRepo`, {
            repositoryName: 'aws-appmesh-envoy',
            repositoryArn: `arn:${partition}:ecr:${region}:${envoyImageOwnerAccount}:repository/aws-appmesh-envoy`,
        });
        this.containers["envoy"] = taskDefinition.addContainer("envoyContainer", {
            containerName: "envoy",
            image: ecs.ContainerImage.fromEcrRepository(appMeshRepo, APP_MESH_ENVOY_SIDECAR_VERSION),
            stopTimeout: cdk.Duration.seconds(10),
            essential: true,
            user: "1337",
            environment: {
                APPMESH_RESOURCE_ARN: virtualNode.virtualNodeArn,
                ENVOY_LOG_LEVEL: "debug",
                ENABLE_ENVOY_XRAY_TRACING: "1",
                XRAY_DAEMON_PORT: "2000",
                ENABLE_ENVOY_STATS_TAGS: '1',
                ENABLE_ENVOY_DOG_STATSD: '1',
            },
            healthCheck: {
                command: [
                    "CMD-SHELL",
                    "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"
                ],
                retries: 3,
                timeout: cdk.Duration.seconds(2),
                interval: cdk.Duration.seconds(5),
                startPeriod: cdk.Duration.seconds(10)
            },
            logging: ecs.LogDriver.awsLogs({
                streamPrefix: "envoy-" + this.defaultEcsAppParameters.AppName.valueAsString,
                logGroup: logGroup
            }),
        });
        this.containers["app"].addContainerDependencies({
            container: this.containers["envoy"],
            condition: ecs.ContainerDependencyCondition.HEALTHY
        });
        return this.containers["envoy"];
    }
    _taskRole() {
        this.taskRole = new iam.Role(this.context, "ApplicationTaskRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            // roleName: Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}-TR"),
            description: "Role that the api task definitions use to run the api code",
        });
        this.taskRole.attachInlinePolicy(new iam.Policy(this.context, "ApplicationTaskRolePolicy", {
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
                        core_1.Fn.sub("arn:aws:ssm:eu-west-2:${AWS::AccountId}:parameter/appconfig/${AppName}/${Environment}*"),
                        core_1.Fn.sub("arn:aws:ssm:eu-west-2:${AWS::AccountId}:parameter/appconfig/common/${Environment}*"),
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
        }));
        this.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"));
        this.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshEnvoyAccess"));
        this.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"));
        this.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"));
        return this.taskRole;
    }
    _resourceName(name) {
        return `${name}${this._props.name}${this._props.nameSuffix}`;
    }
    _defaultEcsAppParameters() {
        var _a;
        this.defaultEcsAppParameters = {
            "AppName": new core_1.CfnParameter(this.context, "AppName", { type: "String", default: this._props.name }),
            "AppNameSuffix": new core_1.CfnParameter(this.context, "AppNameSuffix", { type: "String", default: this._props.nameSuffix }),
            "AppPort": new core_1.CfnParameter(this.context, "AppPort", { type: "Number", default: this._props.appPort }),
            "ProxyPath": new core_1.CfnParameter(this.context, "ProxyPath", { type: "String", default: this._props.proxyPath }),
            "AppEnvironment": new core_1.CfnParameter(this.context, "AppEnvironment", { type: "String", default: (_a = process.env["ENVIRONMENT"]) === null || _a === void 0 ? void 0 : _a.toLowerCase() }),
            "EcsRepositoryName": new core_1.CfnParameter(this.context, "EcsRepositoryName", { type: "String", default: this._props.applicationEcrRepository }),
            "ServiceDiscoveryName": new core_1.CfnParameter(this.context, "ServiceDiscoveryName", { type: "String", default: this._props.name }),
            "EcsRepositoryTag": new core_1.CfnParameter(this.context, "EcsRepositoryTag", {
                type: "String",
                default: process.env["DOCKER_TAG"] || "latest"
            }),
            "ClusterName": new core_1.CfnParameter(this.context, "ClusterName", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", this._props.ecsClusterSsmKey) }),
            "EfsFilesystemId": new core_1.CfnParameter(this.context, "EfsFilesystemId", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", "EfsFilesystemId") })
        };
        if (this._props.envoyProxy) {
            this.defaultEcsAppParameters["MeshArn"] = new core_1.CfnParameter(this.context, "MeshArn", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", "AppMeshArn") });
        }
        if (this._props.hostname) {
            this.defaultEcsAppParameters["Hostname"] = new core_1.CfnParameter(this.context, "Hostname", { type: "String", default: this._props.hostname });
        }
    }
    _outputs() {
    }
}
exports.EcsApplication = EcsApplication;

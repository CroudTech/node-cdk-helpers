"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.EcsApplication = exports.EcsApplicationInit = exports.CdkHelpers = void 0;
var core_1 = require("@aws-cdk/core");
var appmesh = require("@aws-cdk/aws-appmesh");
var awslogs = require("@aws-cdk/aws-logs");
var cdk = require("@aws-cdk/core");
var ecr = require("@aws-cdk/aws-ecr");
var ecs = require("@aws-cdk/aws-ecs");
var iam = require("@aws-cdk/aws-iam");
var cdkBase = require("./base-extensions");
var templates = require("./templates");
var XRAY_DAEMON_IMAGE = 'amazon/aws-xray-daemon:latest';
var CLOUDWATCH_AGENT_IMAGE = 'amazon/cloudwatch-agent:latest';
var APP_MESH_ENVOY_SIDECAR_VERSION = 'v1.15.1.0-prod';
var CdkHelpers = /** @class */ (function (_super) {
    __extends(CdkHelpers, _super);
    function CdkHelpers() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CdkHelpers.prototype._createResources = function () {
    };
    return CdkHelpers;
}(cdkBase.BaseCdkResourceExtension));
exports.CdkHelpers = CdkHelpers;
var EcsApplicationInit = /** @class */ (function (_super) {
    __extends(EcsApplicationInit, _super);
    function EcsApplicationInit(context, props) {
        var _this = _super.call(this, context, props) || this;
        _this._props = props;
        _this._defaultEcsInitParameters();
        _this.defaultTags = [
            "Organisation",
            "Environment",
            "Department",
            "AppName",
        ];
        _this._createResources();
        _this.addTags();
        return _this;
    }
    EcsApplicationInit.prototype._createResources = function () {
        this._ecrRepository();
    };
    EcsApplicationInit.prototype._ecrRepository = function () {
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
    };
    EcsApplicationInit.prototype._defaultEcsInitParameters = function () {
        this.defaultEcsInitParameters = {
            "EcsRepositoryName": new core_1.CfnParameter(this.context, "EcsRepositoryName", { type: "String", default: this._props.applicationEcrRepository }),
            "AppName": new core_1.CfnParameter(this.context, "AppName", { type: "String", default: this._props.name }),
        };
    };
    return EcsApplicationInit;
}(cdkBase.BaseCdkResourceExtension));
exports.EcsApplicationInit = EcsApplicationInit;
var EcsApplication = /** @class */ (function (_super) {
    __extends(EcsApplication, _super);
    function EcsApplication(context, props) {
        var _this = _super.call(this, context, props) || this;
        _this._props = props;
        _this._defaultEcsAppParameters();
        _this._outputs();
        _this.defaultTags = [
            "Organisation",
            "Environment",
            "Department",
            "AppName",
        ];
        _this.containers = {};
        _this._createResources();
        _this.addTags();
        return _this;
    }
    EcsApplication.prototype._createLogGroup = function () {
        if (this.logGroup == null) {
            this.logGroup = new awslogs.LogGroup(this.context, "ApplicationLogGroup", {
                logGroupName: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-EcsServiceLogs-${AppName}"),
                retention: awslogs.RetentionDays.ONE_MONTH,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
        }
        return this.logGroup;
    };
    EcsApplication.prototype._createVirtualNode = function () {
        if (this.virtualNode == null) {
            this.virtualNode = new appmesh.VirtualNode(this.context, 'VirtualNode', {
                mesh: this.resourceImports.importMesh("DefaultAppMesh"),
                virtualNodeName: "vn-" + this.defaultEcsAppParameters.AppName.valueAsString,
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
    };
    EcsApplication.prototype._createTaskDefinition = function () {
        var _a, _b;
        if (this.taskDefinition == null) {
            this.taskDefinition = new ecs.FargateTaskDefinition(this.context, 'TaskDefinition', {
                cpu: parseInt(this._props.cpu),
                family: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}"),
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
    };
    EcsApplication.prototype._createService = function (props) {
        var service = new ecs.FargateService(this.context, "Service", {
            cluster: props.cluster,
            taskDefinition: props.taskDefinition,
            serviceName: core_1.Fn.sub("${Organisation}-${Department}-${Environment}-${AppName}"),
            cloudMapOptions: {
                cloudMapNamespace: props.cloudmapNamespace,
                container: this.containers["app"],
                dnsTtl: cdk.Duration.seconds(20),
                name: this.defaultEcsAppParameters["ServiceDiscoveryName"].valueAsString
            },
            securityGroup: props.ecsSecurityGroup
        });
        service
            .autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 3
        })
            .scaleOnCpuUtilization("ScalingPolicy", {
            targetUtilizationPercent: 80
        });
    };
    EcsApplication.prototype._createResources = function () {
        var logGroup = this._createLogGroup();
        var virtualNode = this._createVirtualNode();
        var taskDefinition = this._createTaskDefinition();
        var vpc = this.resourceImports.importVpc("Vpc", {
            vpcId: this.getCfSSMValue("VPC", "Root")
        });
        var ecsSecurityGroup = this.resourceImports.importSecuritygroup("FargateContainerSecurityGroup", this.getCfSSMValue("FargateContainerSecurityGroup", "Root"));
        var cluster = this.resourceImports.importEcsCluster("EcsCluster", {
            vpc: vpc,
            clusterArn: this.defaultEcsAppParameters["ClusterName"].valueAsString,
            securityGroup: ecsSecurityGroup
        });
        this._addAppContainer(taskDefinition, logGroup);
        this._addEnvoyProxy(taskDefinition, logGroup);
        this._addXrayDaemon(taskDefinition, logGroup);
        this._addCwAgent(taskDefinition, logGroup);
        var cloudmapNamespace = this.resourceImports.importCloudmapNamespace("DefaultCloudmapNamespace");
        this._createService({
            cluster: cluster,
            ecsSecurityGroup: ecsSecurityGroup,
            cloudmapNamespace: cloudmapNamespace,
            taskDefinition: taskDefinition
        });
    };
    EcsApplication.prototype._addAppContainer = function (taskDefinition, logGroup) {
        var _this = this;
        var _a;
        var repository = ecr.Repository.fromRepositoryName(this.context, "EcrRepository", this.defaultEcsAppParameters.EcsRepositoryName.valueAsString);
        var image = new ecs.EcrImage(repository, this.defaultEcsAppParameters.EcsRepositoryTag.valueAsString);
        var dockerLabels = {};
        dockerLabels["traefik.http.routers." + this._props.name + ".entrypoints"] = "websecure";
        dockerLabels["traefik.http.routers." + this._props.name + ".tls"] = "true";
        if ("hostname" in this._props) {
            var hostnameTld = this.getCfSSMValue("AlbHostname", "EcsIngress");
            dockerLabels["traefik.http.routers." + this._props.name + ".rule"] = "Host(\"" + this.defaultEcsAppParameters.Hostname.valueAsString + "." + hostnameTld + "\") && PathPrefix(\"" + this.defaultEcsAppParameters.ProxyPath.valueAsString + "\")";
        }
        else {
            dockerLabels["traefik.http.routers." + this._props.name + ".rule"] = "PathPrefix(\"" + this.defaultEcsAppParameters.ProxyPath.valueAsString + "\");";
        }
        var defaultEnvironmentVars = {
            ENVIRONMENT: this.defaultEcsAppParameters["AppEnvironment"].valueAsString,
            CONFIG_ENVIRONMENT: this.defaultParameters["Environment"].valueAsString,
            APPNAME: this.defaultEcsAppParameters["AppName"].valueAsString,
            PORT: this._props.appPort.toString(),
        };
        var environmentVars = __assign(__assign({}, this._props.environmentVars), defaultEnvironmentVars);
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
        (_a = this._props.appVolumes) === null || _a === void 0 ? void 0 : _a.forEach(function (volume) {
            taskDefinition.addVolume({
                efsVolumeConfiguration: {
                    fileSystemId: _this.defaultEcsAppParameters.EfsFilesystemId.valueAsString,
                    rootDirectory: volume.rootDirectory
                },
                name: volume.name
            });
            _this.containers["app"].addMountPoints({
                containerPath: volume.containerPath,
                sourceVolume: volume.name,
                readOnly: true,
            });
        });
    };
    EcsApplication.prototype._addXrayDaemon = function (taskDefinition, logGroup) {
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
    };
    EcsApplication.prototype._addCwAgent = function (taskDefinition, logGroup) {
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
    };
    EcsApplication.prototype._addEnvoyProxy = function (taskDefinition, logGroup) {
        var virtualNode = this._createVirtualNode();
        var region = cdk.Stack.of(this.context).region;
        var partition = cdk.Stack.of(this.context).partition;
        var envoyImageOwnerAccount = this.accountIdForRegion(region);
        var appMeshRepo = ecr.Repository.fromRepositoryAttributes(this.context, "EnvoyRepo", {
            repositoryName: 'aws-appmesh-envoy',
            repositoryArn: "arn:" + partition + ":ecr:" + region + ":" + envoyImageOwnerAccount + ":repository/aws-appmesh-envoy",
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
    };
    EcsApplication.prototype._taskRole = function () {
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
    };
    EcsApplication.prototype._defaultEcsAppParameters = function () {
        var _a;
        this.defaultEcsAppParameters = {
            "AppName": new core_1.CfnParameter(this.context, "AppName", { type: "String", default: this._props.name }),
            "AppPort": new core_1.CfnParameter(this.context, "AppPort", { type: "Number", default: this._props.appPort }),
            "ProxyPath": new core_1.CfnParameter(this.context, "ProxyPath", { type: "String", default: this._props.proxyPath }),
            "AppEnvironment": new core_1.CfnParameter(this.context, "AppEnvironment", { type: "String", default: (_a = process.env["ENVIRONMENT"]) === null || _a === void 0 ? void 0 : _a.toLowerCase() }),
            "EcsRepositoryName": new core_1.CfnParameter(this.context, "EcsRepositoryName", { type: "String", default: this._props.applicationEcrRepository }),
            "ServiceDiscoveryName": new core_1.CfnParameter(this.context, "ServiceDiscoveryName", { type: "String", default: this._props.name }),
            "EcsRepositoryTag": new core_1.CfnParameter(this.context, "EcsRepositoryTag", {
                type: "String",
                default: process.env["DOCKER_TAG"] || "latest"
            }),
            "ClusterName": new core_1.CfnParameter(this.context, "ClusterName", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", "FargateClusterArn") }),
            "EfsFilesystemId": new core_1.CfnParameter(this.context, "EfsFilesystemId", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", "EfsFilesystemId") })
        };
        if (this._props.envoyProxy) {
            this.defaultEcsAppParameters["MeshArn"] = new core_1.CfnParameter(this.context, "MeshArn", { type: "AWS::SSM::Parameter::Value<String>", default: templates.cfParameterName(this.parameter_name_prefix, "Apps", "AppMeshArn") });
        }
        if (this._props.hostname) {
            this.defaultEcsAppParameters["Hostname"] = new core_1.CfnParameter(this.context, "Hostname", { type: "String", default: this._props.hostname });
        }
    };
    EcsApplication.prototype._outputs = function () {
    };
    return EcsApplication;
}(cdkBase.BaseCdkResourceExtension));
exports.EcsApplication = EcsApplication;

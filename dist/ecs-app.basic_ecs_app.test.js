"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkStackDeploymentDjangoWithoutSuffix = exports.CdkStackDeploymentDjango = void 0;
require("@aws-cdk/assert/jest");
const cdk = require("@aws-cdk/core");
const helpers = require(".");
const ecs = require("@aws-cdk/aws-ecs");
const XRAY_DAEMON_IMAGE = 'infrastructure/xray';
const CLOUDWATCH_AGENT_IMAGE = 'infrastructure/cwagent';
const organisation = process.env["ORGANISATION"] || "CroudTech";
const department = process.env["DEPARTMENT"] || "CroudControl";
const environment = process.env["ENVIRONMENT"] || "Local";
const ecrRepoName = "croudcontrol/notifications-api";
const networkSubdomain = "services-network";
const appPort = 80;
const cpu = "256";
const memoryMiB = "512";
const envoyProxy = true;
const appVolumes = [];
const appHealthCheckPath = "/status";
class CdkStackDeploymentDjango extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const ecrApp = new helpers.EcsApplication(this, {
            enableCloudmap: true,
            appHealthCheckPath: appHealthCheckPath,
            applicationEcrRepository: ecrRepoName,
            appPort: appPort,
            appVolumes: appVolumes,
            cpu: cpu,
            department: department,
            environment: environment,
            envoyProxy: envoyProxy,
            memoryMiB: memoryMiB,
            name: "TestApp",
            nameSuffix: "Django",
            organisation: organisation,
            proxyPath: "/api/notifications",
            hostname: networkSubdomain,
            ecsClusterSsmKey: "FargateClusterPrivateArn",
            enableCustomMetrics: true,
            command: [
                "gunicorn",
                "app.wsgi:application",
                "--workers",
                "4",
                "--bind",
                ":" + appPort.toString()
            ],
            dockerLabels: {
                "test_label": "test123"
            }
        });
    }
}
exports.CdkStackDeploymentDjango = CdkStackDeploymentDjango;
class CdkStackDeploymentDjangoWithoutSuffix extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const ecrApp = new helpers.EcsApplication(this, {
            enableCloudmap: true,
            appHealthCheckPath: appHealthCheckPath,
            applicationEcrRepository: ecrRepoName,
            appPort: appPort,
            appVolumes: appVolumes,
            cpu: cpu,
            department: department,
            environment: environment,
            envoyProxy: envoyProxy,
            memoryMiB: memoryMiB,
            name: "TestApp",
            nameSuffix: "",
            organisation: organisation,
            proxyPath: "/api/notifications",
            hostname: networkSubdomain,
            ecsClusterSsmKey: "FargateClusterPrivateArn",
            enableCustomMetrics: true,
            command: [
                "gunicorn",
                "app.wsgi:application",
                "--workers",
                "4",
                "--bind",
                ":" + appPort.toString()
            ],
            dockerLabels: {
                "test_label": "test123"
            }
        });
    }
}
exports.CdkStackDeploymentDjangoWithoutSuffix = CdkStackDeploymentDjangoWithoutSuffix;
describe('ECS App Helper', () => {
    describe('When creating an ECS app', () => {
        test('Will add an application task definition', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new CdkStackDeploymentDjango(app, 'MyTestStack');
            const expectNetworkMode = ecs.NetworkMode.AWS_VPC;
            expect(stack).toHaveResourceLike('AWS::ServiceDiscovery::Service', {
                Name: 'testapp.django'
            });
            expect(stack).toHaveResourceLike('AWS::AppMesh::VirtualNode', {
                VirtualNodeName: {
                    "Fn::Sub": "${Organisation}-${Department}-${Environment}-${AppName}${AppNameSuffix}"
                },
                Spec: {
                    ServiceDiscovery: {
                        DNS: {
                            Hostname: {
                                "Fn::Join": [
                                    ".",
                                    [
                                        "TestApp.Django",
                                        {
                                            "Ref": "SsmParameterValueCfParametersCroudTechCroudControlLocalAppsECSServiceDiscoveryDomainNameC96584B6F00A464EAD1953AFF4B05118Parameter"
                                        }
                                    ]
                                ]
                            }
                        }
                    }
                }
            });
            expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
                Cpu: cpu,
                Family: `${organisation}-${department}-${environment}-TestAppDjango`,
                Memory: memoryMiB,
                ContainerDefinitions: [
                    {
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    {
                                        "Ref": "AWS::AccountId"
                                    },
                                    ".dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    `/${ecrRepoName}:latest`
                                ]
                            ]
                        },
                        DockerLabels: {
                            "test_label": "test123"
                        },
                        Command: [
                            "gunicorn",
                            "app.wsgi:application",
                            "--workers",
                            "4",
                            "--bind",
                            ":80"
                        ],
                    },
                    {
                        Name: "envoy",
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    "undefined.dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    "/aws-appmesh-envoy:v1.15.1.0-prod"
                                ]
                            ]
                        },
                    },
                    {
                        Name: "xray",
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    {
                                        "Ref": "AWS::AccountId"
                                    },
                                    ".dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    `/${XRAY_DAEMON_IMAGE}:latest`
                                ]
                            ]
                        },
                    },
                    {
                        Name: "cwagent",
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    {
                                        "Ref": "AWS::AccountId"
                                    },
                                    ".dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    `/${CLOUDWATCH_AGENT_IMAGE}:latest`
                                ]
                            ]
                        },
                    },
                ],
                NetworkMode: expectNetworkMode,
                RequiresCompatibilities: [
                    ecs.LaunchType.FARGATE,
                ],
                TaskRoleArn: {
                    'Fn::GetAtt': [
                        'TaskRoleApplicationTaskRole071E9963',
                        'Arn',
                    ],
                },
            });
        });
        test('Will add an application task definition (nosuffix)', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new CdkStackDeploymentDjangoWithoutSuffix(app, 'MyTestStack');
            const expectNetworkMode = ecs.NetworkMode.AWS_VPC;
            expect(stack).toHaveResourceLike('AWS::ServiceDiscovery::Service', {
                Name: 'testapp'
            });
            expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
                Cpu: cpu,
                Family: `${organisation}-${department}-${environment}-TestApp`,
                Memory: memoryMiB,
                ContainerDefinitions: [
                    {
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    {
                                        "Ref": "AWS::AccountId"
                                    },
                                    ".dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    `/${ecrRepoName}:latest`
                                ]
                            ]
                        },
                        DockerLabels: {
                            "test_label": "test123"
                        },
                        Command: [
                            "gunicorn",
                            "app.wsgi:application",
                            "--workers",
                            "4",
                            "--bind",
                            ":80"
                        ],
                    },
                    {
                        Name: "envoy",
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    "undefined.dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    "/aws-appmesh-envoy:v1.15.1.0-prod"
                                ]
                            ]
                        },
                    },
                    {
                        Name: "xray",
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    {
                                        "Ref": "AWS::AccountId"
                                    },
                                    ".dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    `/${XRAY_DAEMON_IMAGE}:latest`
                                ]
                            ]
                        },
                    },
                    {
                        Name: "cwagent",
                        Image: {
                            "Fn::Join": [
                                "",
                                [
                                    {
                                        "Ref": "AWS::AccountId"
                                    },
                                    ".dkr.ecr.",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".",
                                    {
                                        "Ref": "AWS::URLSuffix"
                                    },
                                    `/${CLOUDWATCH_AGENT_IMAGE}:latest`
                                ]
                            ]
                        },
                    },
                ],
                NetworkMode: expectNetworkMode,
                RequiresCompatibilities: [
                    ecs.LaunchType.FARGATE,
                ],
                TaskRoleArn: {
                    'Fn::GetAtt': [
                        'TaskRoleApplicationTaskRole071E9963',
                        'Arn',
                    ],
                },
            });
        });
    });
});

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkStackDeploymentDjangoWithoutSuffix = exports.CdkStackDeploymentDjango = void 0;
require("@aws-cdk/assert/jest");
const cdk = __importStar(require("@aws-cdk/core"));
const helpers = __importStar(require("."));
const ecs = __importStar(require("@aws-cdk/aws-ecs"));
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
class CdkStackDeploymentDjango extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const ecrApp = new helpers.EcsApplication(this, {
            enableCloudmap: true,
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
            expect(stack).toHaveResourceLike('AWS::ECS::Service', {
                TaskDefinition: {
                    Ref: "TaskDefinitionB36D86D9"
                }
            });
            const expectNetworkMode = ecs.NetworkMode.AWS_VPC;
            expect(stack).toHaveResourceLike('AWS::ServiceDiscovery::Service', {
                Name: 'testapp.django'
            });
            expect(stack).toHaveResourceLike('AWS::AppMesh::VirtualNode', {
                VirtualNodeName: {
                    "Fn::Sub": "${AppName}${AppNameSuffix}"
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

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
exports.CdkStackDeploymentNotifications = void 0;
require("@aws-cdk/assert/jest");
const cdk = __importStar(require("@aws-cdk/core"));
const helpers = __importStar(require("."));
const ecs = __importStar(require("@aws-cdk/aws-ecs"));
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
class CdkStackDeploymentNotifications extends cdk.Stack {
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
            command: [
                "gunicorn",
                "app.wsgi:application",
                "--workers",
                "4",
                "--bind",
                ":" + appPort.toString()
            ],
        });
        ecrApp.addUtilityTaskDefinition('migrate', {
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
                }
            }
        });
    }
}
exports.CdkStackDeploymentNotifications = CdkStackDeploymentNotifications;
describe('ECS App Helper', () => {
    describe('When creating an ECS app', () => {
        test('Will add an application task definition', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new CdkStackDeploymentNotifications(app, 'MyTestStack');
            const expectNetworkMode = ecs.NetworkMode.AWS_VPC;
            expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
                Cpu: cpu,
                Family: `${organisation}-${department}-${environment}-TestAppmigrate`,
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
                        Command: [
                            "python",
                            "manage.py",
                            "migrate",
                        ],
                        Name: "migrate",
                        DependsOn: [
                            {
                                "Condition": "COMPLETE",
                                "ContainerName": "create_db"
                            }
                        ],
                    },
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
                                    "/croudtech/db-creator:latest"
                                ]
                            ]
                        },
                        Command: [
                            "python3",
                            "/app/create_postgres.py",
                        ],
                        Name: "create_db",
                    },
                ],
                NetworkMode: expectNetworkMode,
                RequiresCompatibilities: [
                    ecs.LaunchType.FARGATE,
                ],
                TaskRoleArn: {
                    'Fn::GetAtt': [
                        'TaskRolemigrate7A249F02',
                        'Arn',
                    ],
                },
            });
        });
    });
});

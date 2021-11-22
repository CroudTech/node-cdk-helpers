"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkStackDeploymentNotifications = void 0;
require("@aws-cdk/assert/jest");
const cdk = require("@aws-cdk/core");
const helpers = require(".");
const ecs = require("@aws-cdk/aws-ecs");
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
class CdkStackDeploymentNotifications extends cdk.Stack {
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

import * as ssm from '@aws-cdk/aws-ssm';
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';
import * as helpers from "."
import * as s3 from "@aws-cdk/aws-s3"
import * as ecs from "@aws-cdk/aws-ecs"
import * as ecr from "@aws-cdk/aws-ecr"

import { haveResource } from '@aws-cdk/assert/lib/assertions/have-resource';
import { ecrRepository } from './templates';


const organisation = process.env["ORGANISATION"] || "CroudTech"
const department = process.env["DEPARTMENT"] || "CroudControl"
const environment = process.env["ENVIRONMENT"] || "Local"

const ecrRepoName = "croudcontrol/notifications-api"
const networkSubdomain = "services-network"


const appPort = 80
const cpu = "256"
const memoryMiB = "512"
const envoyProxy = true

const appVolumes: helpers.types.ApplicationVolume[] = []

const appHealthCheckPath = "/status"
export class CdkStackDeploymentNotifications extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
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
        })
    }
}

describe('ECS App Helper', () => {
    describe('When creating an ECS app', () => {
        test('Will add an application task definition', () => {
            // GIVEN
            const app = new cdk.App();
            const stack = new CdkStackDeploymentNotifications(app, 'MyTestStack');
            const expectNetworkMode = ecs.NetworkMode.AWS_VPC;

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
                        Command: [
                            "gunicorn",
                            "app.wsgi:application",
                            "--workers",
                            "4",
                            "--bind",
                            ":80"
                        ],
                    }
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

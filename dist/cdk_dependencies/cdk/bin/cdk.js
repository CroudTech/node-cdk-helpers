#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackName = void 0;
require("source-map-support/register");
const cdk = require("@aws-cdk/core");
const cdk_stack_1 = require("../lib/cdk-stack");
exports.stackName = (stack, appname = process.env["APPNAME"], organisation = process.env["ORGANISATION"], department = process.env["DEPARTMENT"], environment = process.env["ENVIRONMENT"]) => `${organisation}-${department}-${environment}-${appname}-${stack}`;
const app = new cdk.App();
new cdk_stack_1.CdkStack(app, 'CdkStack', {
    stackName: exports.stackName("Initialise", "CdkHelperDependencies")
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    /* Uncomment the next line if you know exactly what Account and Region you
     * want to deploy the stack to. */
    // env: { account: '123456789012', region: 'us-east-1' },
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

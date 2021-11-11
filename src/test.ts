import * as ssm from '@aws-cdk/aws-ssm';
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';
import * as helpers from "."
import * as s3 from "@aws-cdk/aws-s3"

class StackExtensionTest extends helpers.BaseCdkExtension {
    resourceImports: helpers.resource_imports.ResourceImport
    securityGroupArn: string
    constructor(scope: cdk.Stack, id: string, props?: helpers.types.BaseCdkExtensionProps) {
        super(scope, props)
        this._props = props
        this.resourceImports = new helpers.resource_imports.ResourceImport(this.context, {
            organisation: props.organisation,
            department: props.department,
            environment: props.environment,
        })
        this.securityGroupArn = ssm.StringParameter.valueForStringParameter(
            this.context, helpers.templates.cfParameterName(this.parameter_name_prefix, "Apps", "PostgresInstanceSecurityGroup"));

        const ecsSecurityGroup = this.resourceImports.importSecuritygroup("FargateContainerSecurityGroup", this.getCfSSMValue("FargateContainerSecurityGroup", "Root"))

        // const clusterArn = ssm.StringParameter.valueForStringParameter(
        //     this.context, helpers.templates.cfParameterName(this.parameter_name_prefix, "Apps", this._props.ecsClusterSsmKey)); 
        // const cluster = this.resourceImports.importEcsCluster("EcsCluster", {
        //     vpc: vpc,
        //     clusterArn: clusterArn,
        //     securityGroup: ecsSecurityGroup
        // })

    }
}

class StackTest extends cdk.Stack {
    stackExtension: StackExtensionTest
    constructor(scope?: cdk.Construct, id?: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.stackExtension = new StackExtensionTest(this, "Test", {
            organisation: "CroudTech",
            department: "CroudControl",
            environment: "Integration"
        })
    }
}

test('Stack contains bucket', () => {
    const app = new cdk.App();
    const stack = new StackTest(app, 'MyTestStack');
  
    expect(stack).toHaveResource('AWS::S3::Bucket');
  });
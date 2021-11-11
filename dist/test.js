"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ssm = require("@aws-cdk/aws-ssm");
require("@aws-cdk/assert/jest");
const cdk = require("@aws-cdk/core");
const helpers = require(".");
class StackExtensionTest extends helpers.BaseCdkExtension {
    constructor(scope, id, props) {
        super(scope, props);
        this._props = props;
        this.resourceImports = new helpers.resource_imports.ResourceImport(this.context, {
            organisation: props.organisation,
            department: props.department,
            environment: props.environment,
        });
        this.securityGroupArn = ssm.StringParameter.valueForStringParameter(this.context, helpers.templates.cfParameterName(this.parameter_name_prefix, "Apps", "PostgresInstanceSecurityGroup"));
        const ecsSecurityGroup = this.resourceImports.importSecuritygroup("FargateContainerSecurityGroup", this.getCfSSMValue("FargateContainerSecurityGroup", "Root"));
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
    constructor(scope, id, props) {
        super(scope, id, props);
        this.stackExtension = new StackExtensionTest(this, "Test", {
            organisation: "CroudTech",
            department: "CroudControl",
            environment: "Integration"
        });
    }
}
test('Stack contains bucket', () => {
    const app = new cdk.App();
    const stack = new StackTest(app, 'MyTestStack');
    expect(stack).toHaveResource('AWS::S3::Bucket');
});

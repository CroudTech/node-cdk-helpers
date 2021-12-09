import * as cdkTypes from "./types"
import * as ssm from "@aws-cdk/aws-ssm";
import * as cdk from '@aws-cdk/core';
import * as templates from "./templates"
import * as regionInfo from "@aws-cdk/region-info"
import * as resourceImports from "./resource-imports"

export abstract class BaseCdkExtension {
    context: cdk.Stack
    parameter_name_prefix: string
    _props: cdkTypes.BaseCdkExtensionProps

    constructor(context: cdk.Stack, props: cdkTypes.BaseCdkExtensionProps) {
        this.context = context
        this._props = props
        this.parameter_name_prefix = templates.cfParameterPrefix(this._props["organisation"], this._props["department"], this._props["environment"])
    }

    getCfSSMValue(key: string, stack: string): string {
        const parameter_name: string = templates.cfParameterName(this.parameter_name_prefix, stack, key)
        return ssm.StringParameter.valueForStringParameter(this.context, parameter_name)
    }

    accountIdForRegion(region: string) {
        return regionInfo.RegionInfo.get(region).appMeshRepositoryAccount;
    }
}

export class Defaults {
    defaultParameters: cdkTypes.defaultParameters
    context: cdk.Stack

    constructor(context: cdk.Stack) {
        this.context = context
        this._defaultParameters()
    }

    _defaultParameters(): void {
        this.defaultParameters = {
            "Organisation": new cdk.CfnParameter(this.context, "Organisation", { type: "String", default: process.env["ORGANISATION"] }),
            "Department": new cdk.CfnParameter(this.context, "Department", { type: "String", default: process.env["DEPARTMENT"] }),
            "Environment": new cdk.CfnParameter(this.context, "Environment", { type: "String", default: process.env["ENVIRONMENT"] })
        }
    }
}

export abstract class BaseCdkResourceExtension extends BaseCdkExtension {
    defaultTags: string[]
    resources: cdkTypes.ResourceMap
    resourceImports: resourceImports.ResourceImport

    constructor(context: cdk.Stack, props: cdkTypes.BaseCdkExtensionProps) {
        super(context, props)
        const baseStackDefaults = new Defaults(this.context)
        this.defaultParameters = baseStackDefaults.defaultParameters
        this.resourceImports = new resourceImports.ResourceImport(this.context, props)
    }
    defaultParameters: cdkTypes.defaultParameters
    abstract addTags():void

    protected abstract _createResources(): void
}
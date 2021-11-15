"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCdkResourceExtension = exports.Defaults = exports.BaseCdkExtension = void 0;
const ssm = require("@aws-cdk/aws-ssm");
const cdk = require("@aws-cdk/core");
const templates = require("./templates");
const regionInfo = require("@aws-cdk/region-info");
const resourceImports = require("./resource-imports");
class BaseCdkExtension {
    constructor(context, props) {
        this.context = context;
        this._props = props;
        this.parameter_name_prefix = templates.cfParameterPrefix(this._props["organisation"], this._props["department"], this._props["environment"]);
    }
    getCfSSMValue(key, stack) {
        const parameter_name = templates.cfParameterName(this.parameter_name_prefix, stack, key);
        return ssm.StringParameter.valueForStringParameter(this.context, parameter_name);
    }
    accountIdForRegion(region) {
        return regionInfo.RegionInfo.get(region).appMeshRepositoryAccount;
    }
}
exports.BaseCdkExtension = BaseCdkExtension;
class Defaults {
    constructor(context) {
        this.context = context;
        this._defaultParameters();
    }
    _defaultParameters() {
        this.defaultParameters = {
            "Organisation": new cdk.CfnParameter(this.context, "Organisation", { type: "String", default: process.env["ORGANISATION"] }),
            "Department": new cdk.CfnParameter(this.context, "Department", { type: "String", default: process.env["DEPARTMENT"] }),
            "Environment": new cdk.CfnParameter(this.context, "Environment", { type: "String", default: process.env["ENVIRONMENT"] })
        };
    }
}
exports.Defaults = Defaults;
class BaseCdkResourceExtension extends BaseCdkExtension {
    constructor(context, props) {
        super(context, props);
        const baseStackDefaults = new Defaults(this.context);
        this.defaultParameters = baseStackDefaults.defaultParameters;
        this.resourceImports = new resourceImports.ResourceImport(this.context, props);
    }
}
exports.BaseCdkResourceExtension = BaseCdkResourceExtension;

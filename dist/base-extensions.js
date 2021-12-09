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
exports.BaseCdkResourceExtension = exports.Defaults = exports.BaseCdkExtension = void 0;
const ssm = __importStar(require("@aws-cdk/aws-ssm"));
const cdk = __importStar(require("@aws-cdk/core"));
const templates = __importStar(require("./templates"));
const regionInfo = __importStar(require("@aws-cdk/region-info"));
const resourceImports = __importStar(require("./resource-imports"));
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

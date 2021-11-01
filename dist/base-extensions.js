"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCdkResourceExtension = exports.Defaults = exports.BaseCdkExtension = void 0;
var ssm = require("@aws-cdk/aws-ssm");
var cdk = require("@aws-cdk/core");
var templates = require("./templates");
var regionInfo = require("@aws-cdk/region-info");
var resourceImports = require("./resource-imports");
var BaseCdkExtension = /** @class */ (function () {
    function BaseCdkExtension(context, props) {
        this.context = context;
        this._props = props;
        this.parameter_name_prefix = templates.cfParameterPrefix(this._props["organisation"], this._props["department"], this._props["environment"]);
    }
    BaseCdkExtension.prototype.getCfSSMValue = function (key, stack) {
        var parameter_name = templates.cfParameterName(this.parameter_name_prefix, stack, key);
        return ssm.StringParameter.valueForStringParameter(this.context, parameter_name);
    };
    BaseCdkExtension.prototype.accountIdForRegion = function (region) {
        return regionInfo.RegionInfo.get(region).appMeshRepositoryAccount;
    };
    return BaseCdkExtension;
}());
exports.BaseCdkExtension = BaseCdkExtension;
var Defaults = /** @class */ (function () {
    function Defaults(context) {
        this.context = context;
        this._defaultParameters();
    }
    Defaults.prototype._defaultParameters = function () {
        this.defaultParameters = {
            "Organisation": new cdk.CfnParameter(this.context, "Organisation", { type: "String", default: process.env["ORGANISATION"] }),
            "Department": new cdk.CfnParameter(this.context, "Department", { type: "String", default: process.env["DEPARTMENT"] }),
            "Environment": new cdk.CfnParameter(this.context, "Environment", { type: "String", default: process.env["ENVIRONMENT"] })
        };
    };
    return Defaults;
}());
exports.Defaults = Defaults;
var BaseCdkResourceExtension = /** @class */ (function (_super) {
    __extends(BaseCdkResourceExtension, _super);
    function BaseCdkResourceExtension(context, props) {
        var _this = _super.call(this, context, props) || this;
        var baseStackDefaults = new Defaults(_this.context);
        _this.defaultParameters = baseStackDefaults.defaultParameters;
        _this.resourceImports = new resourceImports.ResourceImport(_this.context, props);
        return _this;
    }
    BaseCdkResourceExtension.prototype.addTags = function () {
        var _this = this;
        this.defaultTags.forEach(function (tag) {
            cdk.Tags.of(_this.context).add(tag, cdk.Fn.ref(tag), {
                priority: 300
            });
        });
    };
    return BaseCdkResourceExtension;
}(BaseCdkExtension));
exports.BaseCdkResourceExtension = BaseCdkResourceExtension;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackName = exports.ecrRepository = exports.cfParameterName = exports.cfParameterPrefix = void 0;
exports.cfParameterPrefix = function (organisation, department, environment) { return "/CfParameters/" + organisation + "/" + department + "/" + environment; };
exports.cfParameterName = function (prefix, stack, key) { return prefix + "/" + stack + "/" + key; };
exports.ecrRepository = function (namespace, appname) {
    var _a, _b;
    if (namespace === void 0) { namespace = (_a = process.env["DEPARTMENT"]) === null || _a === void 0 ? void 0 : _a.toLowerCase(); }
    if (appname === void 0) { appname = (_b = process.env["ECR_REPOSITORY"]) === null || _b === void 0 ? void 0 : _b.toLowerCase(); }
    return namespace + "/" + appname;
};
exports.stackName = function (stack, appname, organisation, department, environment) {
    if (appname === void 0) { appname = process.env["APPNAME"]; }
    if (organisation === void 0) { organisation = process.env["ORGANISATION"]; }
    if (department === void 0) { department = process.env["DEPARTMENT"]; }
    if (environment === void 0) { environment = process.env["ENVIRONMENT"]; }
    return organisation + "-" + department + "-" + environment + "-" + appname + "-" + stack;
};

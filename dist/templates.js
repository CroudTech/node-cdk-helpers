"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackName = exports.ecrRepository = exports.cfParameterName = exports.cfParameterPrefix = void 0;
exports.cfParameterPrefix = (organisation, department, environment) => `/CfParameters/${organisation}/${department}/${environment}`;
exports.cfParameterName = (prefix, stack, key) => `${prefix}/${stack}/${key}`;
exports.ecrRepository = (namespace, appname) => { var _a, _b; if (namespace === void 0) { namespace = (_a = process.env["DEPARTMENT"]) === null || _a === void 0 ? void 0 : _a.toLowerCase(); } if (appname === void 0) { appname = (_b = process.env["ECR_REPOSITORY"]) === null || _b === void 0 ? void 0 : _b.toLowerCase(); } return `${namespace}/${appname}`; };
exports.stackName = (stack, appname = process.env["APPNAME"], organisation = process.env["ORGANISATION"], department = process.env["DEPARTMENT"], environment = process.env["ENVIRONMENT"]) => `${organisation}-${department}-${environment}-${appname}-${stack}`;

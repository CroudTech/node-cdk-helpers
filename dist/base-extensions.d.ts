import * as cdkTypes from "./types";
import * as cdk from '@aws-cdk/core';
import * as resourceImports from "./resource-imports";
export declare abstract class BaseCdkExtension {
    context: cdk.Stack;
    parameter_name_prefix: string;
    _props: cdkTypes.BaseCdkExtensionProps;
    constructor(context: cdk.Stack, props: cdkTypes.BaseCdkExtensionProps);
    getCfSSMValue(key: string, stack: string): string;
    accountIdForRegion(region: string): string | undefined;
}
export declare class Defaults {
    defaultParameters: cdkTypes.defaultParameters;
    context: cdk.Stack;
    constructor(context: cdk.Stack);
    _defaultParameters(): void;
}
export declare abstract class BaseCdkResourceExtension extends BaseCdkExtension {
    defaultTags: string[];
    resources: cdkTypes.ResourceMap;
    resourceImports: resourceImports.ResourceImport;
    constructor(context: cdk.Stack, props: cdkTypes.BaseCdkExtensionProps);
    defaultParameters: cdkTypes.defaultParameters;
    abstract addTags(): void;
    protected abstract _createResources(): void;
}

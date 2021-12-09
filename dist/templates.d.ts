export declare const cfParameterPrefix: (organisation: string, department: string, environment: string) => string;
export declare const cfParameterName: (prefix: string, stack: string, key: string) => string;
export declare const ecrRepository: (namespace?: string | undefined, appname?: string | undefined) => string;
export declare const stackName: (stack: string, appname?: string | undefined, organisation?: string | undefined, department?: string | undefined, environment?: string | undefined) => string;

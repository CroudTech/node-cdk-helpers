export const cfParameterPrefix = (organisation:string, department:string, environment:string) => `/CfParameters/${organisation}/${department}/${environment}`

export const cfParameterName = (prefix:string, stack:string, key:string) => `${prefix}/${stack}/${key}`
export const ecrRepository = (namespace=process.env["DEPARTMENT"]?.toLowerCase(), appname=process.env["ECR_REPOSITORY"]?.toLowerCase()) => `${namespace}/${appname}`

export const stackName = (stack:string, appname=process.env["APPNAME"], organisation=process.env["ORGANISATION"], department=process.env["DEPARTMENT"], environment=process.env["ENVIRONMENT"]) => `${organisation}-${department}-${environment}-${appname}-${stack}`
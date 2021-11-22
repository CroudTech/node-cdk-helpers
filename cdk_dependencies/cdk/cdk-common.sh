#!/usr/bin/env bash


if [[ $# -ge 1 ]]; then
    if [ ! -z AWS_DEFAULT_REGION ]; then 
        export AWS_DEFAULT_REGION="eu-west-2"
        export CDK_DEPLOY_REGION=$AWS_DEFAULT_REGION
    fi
    export ENVIRONMENT=$1
    export ORGANISATION=CroudTech
    export DEPARTMENT=CroudControl
    export AWS_ACCOUNT=$(aws sts get-caller-identity | jq -r ".Account")
    export CDK_DEPLOY_ACCOUNT=$AWS_ACCOUNT
    
    shift;
else
    echo 1>&2 "Provide account and region as first two args."
    echo 1>&2 "Additional args are passed through to cdk deploy."
    exit 1
fi

echo "ENVIRONMENT: ${ENVIRONMENT}"
echo "ORGANISATION: ${ORGANISATION}"
echo "DEPARTMENT: ${DEPARTMENT}"
echo "AWS_ACCOUNT: ${AWS_ACCOUNT}"
echo "AWS_DEFAULT_REGION: ${AWS_DEFAULT_REGION}"

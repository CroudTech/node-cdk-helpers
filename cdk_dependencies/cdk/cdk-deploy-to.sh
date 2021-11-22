#!/usr/bin/env bash
source ./cdk-common.sh
npx cdk deploy "$@"
exit $?
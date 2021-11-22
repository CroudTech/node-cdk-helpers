"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkStack = void 0;
const cdk = require("@aws-cdk/core");
const ecr = require("@aws-cdk/aws-ecr");
const ecrassets = require("@aws-cdk/aws-ecr-assets");
const path = require("path");
const ecrdeploy = require("cdk-ecr-deployment");
class CdkStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const xrayRepository = new ecr.Repository(this, "XrayRepository", {
            repositoryName: "infrastructure/xray"
        });
        const xrayAsset = new ecrassets.DockerImageAsset(this, 'XrayLatestBuildImage', {
            directory: path.join(path.dirname(__dirname), 'docker', 'xray'),
        });
        new ecrdeploy.ECRDeployment(this, 'XrayDeployDockerImage', {
            src: new ecrdeploy.DockerImageName(xrayAsset.imageUri),
            dest: new ecrdeploy.DockerImageName(xrayRepository.repositoryUriForTag('latest')),
        });
        const cwagentRepository = new ecr.Repository(this, "CWAgentRepository", {
            repositoryName: "infrastructure/cwagent"
        });
        const cwAgentAsset = new ecrassets.DockerImageAsset(this, 'CWAgentLatestBuildImage', {
            directory: path.join(path.dirname(__dirname), 'docker', 'cwagent'),
        });
        new ecrdeploy.ECRDeployment(this, 'CWAgentDeployDockerImage', {
            src: new ecrdeploy.DockerImageName(cwAgentAsset.imageUri),
            dest: new ecrdeploy.DockerImageName(cwagentRepository.repositoryUriForTag('latest')),
        });
    }
}
exports.CdkStack = CdkStack;

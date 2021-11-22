import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecrassets from '@aws-cdk/aws-ecr-assets'
import * as path from 'path'
import * as ecrdeploy from 'cdk-ecr-deployment';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const xrayRepository = new ecr.Repository(this, "XrayRepository", {
      repositoryName: "infrastructure/xray"
    })
    const xrayAsset = new ecrassets.DockerImageAsset(this, 'XrayLatestBuildImage', {
      directory: path.join(path.dirname(__dirname), 'docker', 'xray'),
    });
    
    new ecrdeploy.ECRDeployment(this, 'XrayDeployDockerImage', {
      src: new ecrdeploy.DockerImageName(xrayAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(xrayRepository.repositoryUriForTag('latest')),
    });

    const cwagentRepository = new ecr.Repository(this, "CWAgentRepository", {
      repositoryName: "infrastructure/cwagent"
    })

    const cwAgentAsset = new ecrassets.DockerImageAsset(this, 'CWAgentLatestBuildImage', {
      directory: path.join(path.dirname(__dirname), 'docker', 'cwagent'),
    });
    
    new ecrdeploy.ECRDeployment(this, 'CWAgentDeployDockerImage', {
      src: new ecrdeploy.DockerImageName(cwAgentAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(cwagentRepository.repositoryUriForTag('latest')),
    });
    
  }
}

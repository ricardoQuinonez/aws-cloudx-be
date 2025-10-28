import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const env = dotenv.parse(fs.readFileSync('.env'));
    if (Object.keys(env).length === 0) throw new Error('No credentials in .env');

    const basicAuthorizer = new lambda.Function(this, 'basic-authorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'basic-authorizer/handler.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: env,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
    });

    basicAuthorizer.addPermission('AllowAPIGatewayInvoke', {
      principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`,
      action: 'lambda:InvokeFunction',
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizer.functionArn,
      exportName: 'BasicAuthorizerArn',
    });
  }
}

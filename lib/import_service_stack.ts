import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as cr from "aws-cdk-lib/custom-resources"
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as sqs from "aws-cdk-lib/aws-sqs";

const bucketName = 'imports';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Bucket Creation
    const bucket = new s3.Bucket(this, bucketName, {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    bucket.addCorsRule({
      allowedOrigins: ['https://d2hen05bx3i872.cloudfront.net'],
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.PUT,
      ],
      allowedHeaders: ['*'],
    });
    new cr.AwsCustomResource(this, 'uploadedFolder', {
      onCreate: {
        service: "S3",
        action: "putObject",
        parameters: {
          Bucket: bucket.bucketName,
          Key: "uploaded/",
          Body: "",
        },
        physicalResourceId: cr.PhysicalResourceId.of("uploadedFolder"),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [bucket.arnForObjects("*")],
      }),
    });

    // Import products lambda
    const importProductsFile  = new lambda.Function(this, 'import-products-file', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'import-products-file/handler.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // Set API Gateway
    const api = new apigateway.RestApi(this, 'imports-api', {
      restApiName: 'Import API',
      description: 'API which import product app'
    });

    // Setup for products resource and integration with API Gateway
    const importProductsFileLambdaIntegration = new apigateway.LambdaIntegration(importProductsFile, {
      requestTemplates: {
        "application/json": `{"fileName": "$input.params('fileName')" }`
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'"
          }
        },{
          selectionPattern: ".*BadRequest.*",
          statusCode: '400',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'"
          }
        }, {
          selectionPattern: ".*NotFound.*",
          statusCode: '404',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'"
          }
        }, {
          selectionPattern: "Unknown error",
          statusCode: '500',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'"
          },
        }
      ],
      proxy: false,
    });

    bucket.grantPut(importProductsFile)

    const importResources = api.root.addResource('import');
    const addFileResources = importResources.addResource('{fileName}');
    addFileResources.addMethod('GET', importProductsFileLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        }
      }, {
        statusCode: '400',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        }
      }, {
        statusCode: '500',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        },
      }]
    });
    addFileResources.addCorsPreflight({
      allowOrigins: ['https://d2hen05bx3i872.cloudfront.net'],
      allowMethods: ['GET', 'PUT', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
    });

    // Import file parser lambda

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "CatalogItemsQueue",
      "arn:aws:sqs:us-east-1:880385175057:ProductServiceStack-catalogitemsqueue3CBDE59E-dbr5x5WzEmCY"
    );

    const importFileParser = new lambda.Function(this, 'import-file-parser', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'import-file-parser/handler.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
    });

    catalogItemsQueue.grantSendMessages(importFileParser);
    bucket.grantReadWrite(importFileParser);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: 'uploaded/'}
    );


  }
}

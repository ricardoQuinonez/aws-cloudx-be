import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Set Lambda functions
    const getProductList = new lambda.Function(this, 'get-product-list', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'get-product-list/handler.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

    const getProduct = new lambda.Function(this, 'get-product', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'get-product/handler.main',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

    // Set API Gateway
    const api = new apigateway.RestApi(this, 'product-api', {
      restApiName: 'Product API',
      description: 'API which populate product app'
    });

    // Setup for products resource and integration with API Gateway
    const productListFromLambdaIntegration = new apigateway.LambdaIntegration(getProductList, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'"
          }
        },
      ],
      proxy: false,
    });

    const getProductListResource = api.root.addResource('products');
    getProductListResource.addMethod('GET', productListFromLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        }
      }]
    });
    getProductListResource.addCorsPreflight({
      allowOrigins: ['https://d2hen05bx3i872.cloudfront.net'],
      allowMethods: ['GET']
    });

    // Setup for products/{id} resource and integration with API Gateway
    const productFromLambdaIntegration = new apigateway.LambdaIntegration(getProduct, {
      requestTemplates: {
        "application/json": `{"id": "$input.params('id')" }`
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'"
          }
        },
        {
          selectionPattern: "NotFound",
          statusCode: '404',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
          },
          responseTemplates: {
            "application/json": JSON.stringify({ error: "Product not found" })
          }
        },
      ],
      proxy: false,
    });

    const idResource = getProductListResource.addResource('{id}');
    idResource.addMethod('GET', productFromLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        }
      },{
        statusCode: '404',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
        }
      }]
    });
    idResource.addCorsPreflight({
      allowOrigins: ['https://d2hen05bx3i872.cloudfront.net'],
      allowMethods: ['GET']
    });
  }
}

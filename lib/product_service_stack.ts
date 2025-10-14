import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DB setup
     const productsTable = new dynamodb.Table(this, "Products", {
      tableName: 'Products',
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stockTable = new dynamodb.Table(this, "Stock", {
      tableName: 'Stock',
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Set Lambda functions
    const seedData = new NodejsFunction(this, 'seed-data', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'main',
      entry: path.join(__dirname, "./seed-db/handler.ts"),
      bundling: { minify: true, externalModules: ["aws-sdk"] },
      environment: {
        PRODUCT_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      }
    });
    productsTable.grantWriteData(seedData);
    stockTable.grantWriteData(seedData);

    const createProduct = new NodejsFunction(this, 'create-product', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'main',
      entry: path.join(__dirname, "./create-product/handler.ts"),
      bundling: { minify: true, externalModules: ["aws-sdk"] },
      environment: {
        PRODUCT_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      }
    });
    productsTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

    const getProductList = new NodejsFunction(this, 'get-product-list', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'main',
      entry: path.join(__dirname, "./get-product-list/handler.ts"),
      bundling: { minify: true, externalModules: ["aws-sdk"] },
      environment: {
        PRODUCT_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      }
    });
    productsTable.grantReadData(getProductList);
    stockTable.grantReadData(getProductList);

    const getProduct = new NodejsFunction(this, 'get-product', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'main',
      entry: path.join(__dirname, "./get-product/handler.ts"),
      bundling: { minify: true, externalModules: ["aws-sdk"] },
      environment: {
        PRODUCT_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      }
    });
    productsTable.grantReadData(getProduct);
    stockTable.grantReadData(getProduct);

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
        {
          selectionPattern: "Unknown error",
          statusCode: '500',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
          },
        }
      ],
      proxy: false,
    });

    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', productListFromLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        }
      }, {
        statusCode: '500',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
        },
      }]
    });

    // Setup for products resource and integration with API Gateway
    const createProductLambdaIntegration = new apigateway.LambdaIntegration(createProduct, {
      requestTemplates: {
        'application/json': '$input.json("$")'
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'POST,OPTIONS'"
          }
        },
        {
          selectionPattern: '.*BadRequest.*',
          statusCode: '400',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'POST,OPTIONS'"
          },
          responseTemplates: {
            'application/json': `{
              "error": "Bad Request",
              "message": "$util.escapeJavaScript($input.path('$'))"
            }`
          }
        },{
          selectionPattern: '.*Unknown error.*',
          statusCode: '500',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
          },
        },

      ],
      proxy: false,
    });

    productsResource.addMethod('POST', createProductLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        }
      },
      {
          statusCode: '400',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true
          }
        },{
          statusCode: '500',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ]
    });
    productsResource.addCorsPreflight({
      allowOrigins: ['https://d2hen05bx3i872.cloudfront.net'],
      allowMethods: ['GET', 'POST']
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
        {
          selectionPattern: "Unknown error",
          statusCode: '500',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
          },
        },
      ],
      proxy: false,
    });

    const idResource = productsResource.addResource('{id}');
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
      },{
        statusCode: '500',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
        }
      }]
    });
    idResource.addCorsPreflight({
      allowOrigins: ['https://d2hen05bx3i872.cloudfront.net'],
      allowMethods: ['GET']
    });

    // Setup for products/seed-data resource and integration with API Gateway
    const seedDataLambdaIntegration = new apigateway.LambdaIntegration(seedData, {
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
          selectionPattern: "Unknown error",
          statusCode: '500',
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'https://d2hen05bx3i872.cloudfront.net'",
          },
        },
      ],
      proxy: false,
    });

    const seedResource = productsResource.addResource('seed-data');
    seedResource.addMethod('GET', seedDataLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true
        }
      },{
        statusCode: '500',
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
        }
      }]
    });
    seedResource.addCorsPreflight({
      allowOrigins: ['https://d2hen05bx3i872.cloudfront.net'],
      allowMethods: ['GET']
    });

    // Product SNS
    const createProductTopic = new sns.Topic(this, "create-product-topic" );
    createProductTopic.addSubscription(
      new subs.EmailSubscription("ricardo_quinonez@epam.com")
    );
    createProductTopic.addSubscription(
      new subs.EmailSubscription("vir_qup_91@hotmail.com", {
        filterPolicy: {
          hasEmpty: sns.SubscriptionFilter.stringFilter({
            allowlist: ['true'],
          }),
        },
      })
    );

    // Product SQS
    const catalogItemsQueue = new sqs.Queue(this, "catalog-items-queue");
    const catalogBatchProcess = new NodejsFunction(this, "catalog-batch-process", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: "main",
      entry: path.join(__dirname, "./catalog-batch-process/handler.ts"),
      bundling: { minify: true, externalModules: ["aws-sdk"] },
      environment: {
        PRODUCT_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
        CREATE_PRODUCT_ARN: createProductTopic.topicArn,
      },
    });

    catalogBatchProcess.addEventSource(new SqsEventSource(catalogItemsQueue, {
      batchSize: 5,
    }));

    productsTable.grantWriteData(catalogBatchProcess);
    stockTable.grantWriteData(catalogBatchProcess);

    createProductTopic.grantPublish(catalogBatchProcess);
  }
}

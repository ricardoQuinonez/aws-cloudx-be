import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event, context) => {
    try {
      console.log('Received event:', JSON.stringify(event, null, 2));
      const productId = uuid();
      const productParams = {
        TableName: productTableName,
        Item: {
          id: { S: productId },
          title: { S: event.title },
          image: { S: event.image },
          description: { S: event.description },
          price: { N: event.price.toString() },
        }
      };
      const stockParams = {
        TableName: stockTableName,
        Item: {
          product_id: { S: productId },
          count: { N: event.count.toString() },
        }
      };
      const productCommand = new PutItemCommand(productParams);
      const stockCommand = new PutItemCommand(stockParams);

      const resultProduct = await dynamoDB.send(productCommand);
      console.log('PutProduct succeeded:', JSON.stringify(resultProduct, null, 2));

      const resultStock = await dynamoDB.send(stockCommand);
      console.log('PutStock succeeded:', JSON.stringify(resultStock, null, 2));

      return {
        product: resultProduct,
        stock: resultStock,
      };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Unknown error');
    }
};

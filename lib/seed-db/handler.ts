import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";
import {MOCK_PRODUCTS} from '../shared/mock_data';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event) => {
    try {
      console.log('Received event:', JSON.stringify(event, null, 2));
      for (const item of MOCK_PRODUCTS) {
        console.log('Processing item:', JSON.stringify(item, null, 2));
        const productId = uuid();
        const productParams = {
          TableName: productTableName,
          Item: {
            id: { S: productId },
            title: { S: item.title },
            image: { S: item.image },
            description: { S: item.description },
            price: { N: item.price.toString() },
          }
        };
        const stockParams = {
          TableName: stockTableName,
          Item: {
            product_id: { S: productId },
            count: { N: item.count.toString() },
          }
        };
        const productCommand = new PutItemCommand(productParams);
        const stockCommand = new PutItemCommand(stockParams);

        const resultProduct = await dynamoDB.send(productCommand);
        console.log('PutProduct succeeded:', JSON.stringify(resultProduct, null, 2));

        const resultStock = await dynamoDB.send(stockCommand);
        console.log('PutStock succeeded:', JSON.stringify(resultStock, null, 2));
      }
      return ;
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Unknown error');
    }
};

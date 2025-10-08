import { ProductService } from "../shared/product_service";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

export async function main({id = ''}) {
  try {
    console.log('Received event:', JSON.stringify(id, null, 2));

    const resultProduct = await dynamoDB.send(new GetItemCommand({ TableName: productTableName, Key: {id: {S: id}} }));
    const resultStock = await dynamoDB.send(new GetItemCommand({ TableName: stockTableName, Key: { product_id: { S: id } } }));

    console.log('Resut of product list:', JSON.stringify(resultProduct, null, 2));
    console.log('Resut of stock list:', JSON.stringify(resultStock, null, 2));

    if(!resultProduct.Item || !resultStock.Item) {
      throw new Error("NotFound");
    }

    const products = unmarshall(resultProduct.Item);
    const stock = unmarshall(resultStock.Item);

    return {
      ...products,
      count: stock && stock.count || 0,
    };
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Unknown error');
  }
}

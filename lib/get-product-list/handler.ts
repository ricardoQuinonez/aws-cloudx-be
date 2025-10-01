import { ProductService } from "../shared/product_service";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

export async function main() {
  try {
    const resultProductList = await dynamoDB.send(new ScanCommand({ TableName: productTableName }));
    const resultStockList = await dynamoDB.send(new ScanCommand({ TableName: stockTableName }));

    console.log('Resut of product list:', JSON.stringify(resultProductList, null, 2));
    console.log('Resut of stock list:', JSON.stringify(resultStockList, null, 2));

    const productsList = resultProductList.Items || [];
    const stockList = resultStockList.Items || [];

    return productsList.map(product => {
      const stock = stockList.find(stockItem => stockItem.product_id.S === product.id.S);
      return {
        id: product.id.S,
        title: product.title.S,
        description: product.description.S,
        price: product.price.N ? Number(product.price.N) : 0,
        image: product.image.S,
        count: stock && stock.count.N ? Number(stock.count.N) : 0,
      };
    });
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Unknown error');
  }
}

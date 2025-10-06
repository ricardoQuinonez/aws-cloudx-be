import { Handler } from 'aws-lambda';
import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";
import { marshall } from "@aws-sdk/util-dynamodb";
import { z } from "zod";

const productSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  price: z.number().positive("price must be a positive integer"),
  count: z.number().int().nonnegative("count must be zero or greater"),
});

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event, context) => {
    try {
      console.log('Received event:', JSON.stringify(event, null, 2));

      const result = productSchema.safeParse(event);
      if (!result.success) {
        throw new Error(`BadRequest: ${result.error.message}`);
      }

      const productId = uuid();
      const transactParams = {
        TransactItems: [
          {
            Put: {
              TableName: productTableName,
              Item: marshall({
                id: productId ,
                title: event.title ,
                image: event.image ,
                description: event.description ,
                price:  event.price.toString() ,
              })
            },
          },{
            Put: {
              TableName: stockTableName,
              Item: marshall({
                product_id: productId.toString(),
                count: event.count.toString(),
              })
            },
          },
        ]
      }
      const transactionResult = await dynamoDB.send(
        new TransactWriteItemsCommand(transactParams)
      );
      console.log("Transaction succeeded:", JSON.stringify(transactionResult, null, 2));

      return {
        message: "Product and stock created successfully",
        productId,
      };
    } catch (error) {
      console.error('Error:', error);
      throw (error instanceof Error ? error : new Error('Unknown error'));
    }
};

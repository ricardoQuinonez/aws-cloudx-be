import { Handler } from 'aws-lambda';
import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";
import { marshall } from "@aws-sdk/util-dynamodb";
import { z } from "zod";
import { SQSEvent } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const productSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  price: z.number().positive("price must be a positive integer"),
  count: z.number().int().nonnegative("count must be zero or greater"),
});

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const sns = new SNSClient({ region: process.env.AWS_REGION });
const topicArn = process.env.CREATE_PRODUCT_ARN as string;
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event: SQSEvent) => {
    try {
      const messages = [];
      for (const record of event.Records) {
        console.log('SQS Record:', JSON.stringify(record, null, 2));
        const product = JSON.parse(record.body);

        const result = productSchema.safeParse({
          ...product,
          price: Number(product.price),
          count: Number(product.count)
        });
        if (!result.success) {
          console.error(`BadRequest: ${result.error.message}`);
        }

        const productId = uuid();
        const transactParams = {
          TransactItems: [
            {
              Put: {
                TableName: productTableName,
                Item: marshall({
                  id: productId ,
                  title: product.title,
                  image: product.image,
                  description: product.description,
                  price: product.price
                })
              },
            },{
              Put: {
                TableName: stockTableName,
                Item: marshall({
                  product_id: productId,
                  count: product.count,
                })
              },
            },
          ]
        }
        const transactionResult = await dynamoDB.send(
          new TransactWriteItemsCommand(transactParams)
        );
        messages.push(product);
        console.log("Transaction succeeded:", JSON.stringify(transactionResult, null, 2));
      }

      await sns.send(new PublishCommand({
        TopicArn: topicArn,
        Subject: 'Products created',
        Message: `The following products were created:\n${JSON.stringify(messages, null, 2)}`,
        MessageAttributes: {
          hasEmpty: {
            DataType: "Boolean",
            StringValue: messages.some(msg => !msg.count) ? "true" : "false"
          }
        }
      }));
      return {
        message: "Products and stocks created successfully",
      };
    } catch (error) {
      console.error('Error:', error);
      return;
    }
};

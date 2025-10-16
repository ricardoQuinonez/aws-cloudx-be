import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Handler } from 'aws-lambda';
import csv from "csv-parser";
import { Readable } from "stream";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const bucketName = process.env.BUCKET_NAME as string;
const sqsQueueUrl = process.env.SQS_QUEUE_URL as string;
const s3 = new S3Client({ region: process.env.AWS_REGION });
const sqs = new SQSClient({ region: process.env.AWS_REGION });

const processCSVRows = async (csvStream: Readable, processCallback = (item: any) => {}) => {
  await new Promise<void>((resolve, reject) => {
    csvStream.pipe(csv())
      .on("data", processCallback)
      .on("end", () => {
        console.log("Parsing completed");
        resolve();
      })
      .on("error", (err: string) => {
        console.error("Parsing error:", err);
        reject(err);
      });
  });
}

const moveParsedFile = async (key: string) => {
  const copySource = `${bucketName}/${key}`;
  const destinationKey = key.replace('uploaded/', 'parsed/');

  await s3.send(new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: copySource,
    Key: destinationKey
  }));

  await s3.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  }));

  console.log(`Moved file from ${key} to ${destinationKey}`);
}

export const main: Handler = async (event) => {
    try {
      console.log('Received event:', JSON.stringify(event, null, 2));

      for(const record of event.Records) {
        const {key} = record.s3.object;
        const {Body} = await s3.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: key
        }));

        if(!Body) {
          throw new Error("NotFound: No file body");
        }

        console.log('Processing:', key);

        const stream = Body.transformToWebStream();
        const nodeStream = Readable.fromWeb(stream);
        const sendPromises: Promise<any>[] = [];
        await processCSVRows(nodeStream, async (item) => {
          sendPromises.push(sqs.send(new SendMessageCommand({
            QueueUrl: sqsQueueUrl,
            MessageBody: JSON.stringify(item),
          })));
        });
        await Promise.all(sendPromises);
        console.log(`All messages sent to SQS for file ${key}`);
        await moveParsedFile(key);
      }
    } catch (error) {
        console.error('Error:', error);
        throw (error instanceof Error ? error : new Error('Unknown error'));
    }
};

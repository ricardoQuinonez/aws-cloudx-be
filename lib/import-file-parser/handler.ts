import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Handler } from 'aws-lambda';
import csv from "csv-parser";
import { Readable } from "stream";

const bucketName = process.env.BUCKET_NAME as string;
const s3 = new S3Client({ region: process.env.AWS_REGION });

const logCSVRows = async (csvStream: Readable) => {
  await new Promise<void>((resolve, reject) => {
    csvStream.pipe(csv())
      .on("data", (row) => {
        console.log("CSV Row:", row);
      })
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
        await logCSVRows(nodeStream);
        await moveParsedFile(key);
      }
    } catch (error) {
        console.error('Error:', error);
        throw (error instanceof Error ? error : new Error('Unknown error'));
    }
};

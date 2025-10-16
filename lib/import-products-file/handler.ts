import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Handler } from 'aws-lambda';

const bucketName = process.env.BUCKET_NAME as string;
const s3 = new S3Client({ region: process.env.AWS_REGION });

export const main: Handler = async (event) => {
    try {
      console.log('Received event:', JSON.stringify(event, null, 2));
      const { fileName } = event;
      if(!fileName) {
        throw new Error("BadRequest: fileName is required");
      }

      const objectKey = `uploaded/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: "text/csv",
      });

      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

      console.log('Signed URL:', signedUrl);

      return {
        url: signedUrl
      }
    } catch (error) {
        console.error('Error:', error);
        throw (error instanceof Error ? error : new Error('Unknown error'));
    }
};

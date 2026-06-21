import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
  } from "@aws-sdk/client-s3";
  import { Readable } from "stream";
  
  const s3 = new S3Client({});
  
  export class S3Wrapper {
    private bucketName: string;
  
    constructor(bucketName: string) {
      this.bucketName = bucketName;
    }
  
    async uploadObject(key: string, body: Buffer | string, contentType?: string): Promise<void> {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
  
      await s3.send(command);
    }
  
    async getObject(key: string): Promise<Readable> {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
  
      const response = await s3.send(command);
  
      if (!response.Body || !(response.Body instanceof Readable)) {
        throw new Error("Invalid S3 response body");
      }
  
      return response.Body;
    }
  
    async deleteObject(key: string): Promise<void> {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
  
      await s3.send(command);
    }
  
    async listObjects(prefix = ""): Promise<Array<string>> {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });
  
      const response = await s3.send(command);
      return response.Contents?.map((item) => item.Key!) || [];
    }
  }
  
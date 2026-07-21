import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "@bloomy/env/server";

export type ExamStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType?: string }>;
  delete(key: string): Promise<void>;
};

// Cliente único; endpoint e credenciais no mesmo idioma do seed (packages/db).
const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const Bucket = env.R2_EXAM_BUCKET;

export const examStorage: ExamStorage = {
  async put(key, body, contentType) {
    await client.send(
      new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
    );
  },
  async get(key) {
    const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
    return {
      body: res.Body!.transformToWebStream(),
      contentType: res.ContentType,
    };
  },
  async delete(key) {
    await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
  },
};

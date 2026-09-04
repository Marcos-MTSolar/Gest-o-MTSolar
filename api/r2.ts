import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'mtsolar-media';
export const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-dcf353c8e6cc49e48992fe2cda8aee5a.r2.dev';

export function getR2Bucket(): string {
  return process.env.CLOUDFLARE_R2_BUCKET || R2_BUCKET;
}

export function getR2PublicUrl(): string {
  return process.env.CLOUDFLARE_R2_PUBLIC_URL || R2_PUBLIC_URL;
}

export async function uploadToR2(
  buffer: Buffer,
  filePath: string,
  contentType: string,
  customMetadata?: Record<string, string>
): Promise<string> {
  const bucket = getR2Bucket();
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: buffer,
      ContentType: contentType,
      Metadata: { uploadedAt: new Date().toISOString(), ...customMetadata },
    })
  );
  const publicUrl = getR2PublicUrl();
  const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
  return `${baseUrl}/${filePath}`;
}

export async function getFileFromR2(filePath: string) {
  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: filePath,
  });
  return await r2Client.send(command);
}

export async function deleteFromR2(filePath: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: filePath,
    })
  );
}

export async function listFromR2(prefix: string) {
  const response = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: getR2Bucket(),
      Prefix: prefix,
    })
  );
  return response.Contents ?? [];
}

export async function generatePresignedUrl(
  filePath: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: filePath,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

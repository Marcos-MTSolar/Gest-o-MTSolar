import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
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

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;
export const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

export async function uploadToR2(
  buffer: Buffer,
  filePath: string,
  contentType: string,
  customMetadata?: Record<string, string>
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      Body: buffer,
      ContentType: contentType,
      Metadata: { uploadedAt: new Date().toISOString(), ...customMetadata },
    })
  );
  return `${R2_PUBLIC_URL}/${filePath}`;
}

export async function deleteFromR2(filePath: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
    })
  );
}

export async function listFromR2(prefix: string) {
  const response = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
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
    Bucket: R2_BUCKET,
    Key: filePath,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

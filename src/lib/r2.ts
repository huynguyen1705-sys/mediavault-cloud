import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// R2 Client
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.dev`;

// Generate unique file key
export function generateFileKey(userId: string, fileName: string): string {
  const ext = fileName.split(".").pop() || "";
  const key = `${userId}/${uuidv4()}${ext ? "." + ext : ""}`;
  return key;
}

// Upload file to R2
export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  };
}

// Generate presigned URL for download (expires in seconds)
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

// Generate presigned URL for upload
export async function getUploadPresignedUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

// Delete file from R2
export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

// Get file metadata
export async function getFileMetadata(key: string): Promise<{ size: number; contentType: string } | null> {
  try {
    const response = await r2.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

// Get public URL for a file
export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

export { r2, BUCKET, PUBLIC_URL };

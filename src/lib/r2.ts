import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// Helper to get R2 client
function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// Get bucket name
function getBucket() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not defined");
  return bucket;
}

// Get public URL base
function getPublicUrlBase() {
  return process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.dev`;
}

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
  const client = getR2Client();
  const bucket = getBucket();
  const publicUrl = getPublicUrlBase();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  return {
    key,
    url: `${publicUrl}/${key}`,
  };
}

// Generate presigned URL for download (expires in seconds)
export async function getPresignedUrl(key: string, expiresIn = 86400): Promise<string> {
  const client = getR2Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

// Generate presigned URL for upload
export async function getUploadPresignedUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const client = getR2Client();
  const bucket = getBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

// Delete file from R2
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucket();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

// Get file metadata
export async function getFileMetadata(key: string): Promise<{ size: number; contentType: string } | null> {
  const client = getR2Client();
  const bucket = getBucket();

  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
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
  return `${getPublicUrlBase()}/${key}`;
}

// ========= MULTIPART UPLOAD =========

// Initiate multipart upload
export async function createMultipartUpload(key: string, contentType: string): Promise<string> {
  const client = getR2Client();
  const bucket = getBucket();

  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })
  );

  if (!result.UploadId) throw new Error("Failed to create multipart upload");
  return result.UploadId;
}

// Generate presigned URL for a single part
export async function getPartUploadUrl(key: string, uploadId: string, partNumber: number, expiresIn = 3600): Promise<string> {
  const client = getR2Client();
  const bucket = getBucket();

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(client, command, { expiresIn });
}

// Complete multipart upload
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<void> {
  const client = getR2Client();
  const bucket = getBucket();

  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  );
}

// Abort multipart upload (cleanup on failure)
export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucket();

  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    })
  ).catch(() => {}); // Ignore errors on abort
}

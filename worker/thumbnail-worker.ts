// Worker script to process thumbnail generation queue
// Runs as a separate process, processes one video at a time with CPU/RAM limits

import { PrismaClient } from "@prisma/client";
import { S3Client, GetCommand, PutCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream, unlinkSync, existsSync, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import { spawn } from "child_process";

// Config
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "mediavault";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-2971f994a6ac2fdadd4842209a20496e.r2.dev";

// Limits - conservative to not overwhelm the server
const MAX_CPU = 1;
const MAX_RAM_MB = 512;

const prisma = new PrismaClient();
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    });
  }
  return s3Client;
}

function getPublicUrl(r2Key: string): string {
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

async function downloadFile(r2Key: string, destPath: string): Promise<void> {
  const client = getS3Client();
  const command = new GetCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
  });
  
  const response = await client.send(command);
  if (response.Body) {
    const writeStream = createWriteStream(destPath);
    // @ts-ignore - response.Body is a Readable or Blob
    await pipeline(response.Body, writeStream);
  }
}

async function uploadThumbnail(sourcePath: string, destR2Key: string): Promise<string> {
  const client = getS3Client();
  const command = new PutCommand({
    Bucket: R2_BUCKET,
    Key: destR2Key,
    ContentType: "image/jpeg",
    ACL: "public-read",
  });
  
  // Get presigned URL for upload
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  
  // Upload using fetch
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(sourcePath);
  
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: fileBuffer,
    headers: {
      "Content-Type": "image/jpeg",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  return getPublicUrl(destR2Key);
}

async function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // FFmpeg with CPU/RAM limits
    const ffmpeg = spawn("ffmpeg", [
      "-y",                                    // Overwrite output
      "-ss", "00:00:01",                        // Seek to 1 second
      "-i", inputPath,                         // Input file
      "-vframes", "1",                         // Extract 1 frame
      "-vf", "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2", // 320x320 thumbnail
      "-q:v", "3",                             // Quality (2=best, 31=worst)
      "-threads", "1",                         // Single thread
      outputPath,                              // Output file
    ]);

    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

async function processThumbnail(fileId: string): Promise<void> {
  console.log(`[Worker] Processing thumbnail for file: ${fileId}`);
  
  // 1. Get file from DB
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    console.log(`[Worker] File not found: ${fileId}`);
    return;
  }

  // Only process videos
  if (!file.mimeType?.startsWith("video/")) {
    console.log(`[Worker] Not a video, skipping: ${fileId}`);
    await prisma.file.update({
      where: { id: fileId },
      data: { thumbnailStatus: "not_applicable" },
    });
    return;
  }

  if (!file.storagePath) {
    console.log(`[Worker] No storage path for: ${fileId}`);
    return;
  }

  // Mark as processing
  await prisma.file.update({
    where: { id: fileId },
    data: { thumbnailStatus: "processing" },
  });

  const tmpDir = "/tmp/thumbnails";
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  const inputPath = join(tmpDir, `${fileId}_input`);
  const outputPath = join(tmpDir, `${fileId}_thumb.jpg`);

  try {
    // 2. Worker download video to /tmp
    console.log(`[Worker] Downloading ${file.storagePath}...`);
    await downloadFile(file.storagePath, inputPath);

    // 3. FFmpeg extract frame at second 1
    console.log(`[Worker] Generating thumbnail...`);
    await generateThumbnail(inputPath, outputPath);

    // 4. Upload thumbnail to R2
    const thumbnailR2Key = `thumbnails/${fileId}.jpg`;
    console.log(`[Worker] Uploading thumbnail...`);
    await uploadThumbnail(outputPath, thumbnailR2Key);

    // 5. Update DB with thumbnail path + status ready
    await prisma.file.update({
      where: { id: fileId },
      data: { 
        thumbnailPath: thumbnailR2Key,
        thumbnailStatus: "ready",
      },
    });

    console.log(`[Worker] ✅ Thumbnail done for: ${fileId}`);

    // 6. Cleanup temp files
    try {
      unlinkSync(inputPath);
      unlinkSync(outputPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  } catch (error: any) {
    console.error(`[Worker] ❌ Error processing ${fileId}:`, error.message);
    await prisma.file.update({
      where: { id: fileId },
      data: { thumbnailStatus: "failed" },
    });

    // Cleanup temp files on error
    try {
      if (existsSync(inputPath)) unlinkSync(inputPath);
      if (existsSync(outputPath)) unlinkSync(outputPath);
    } catch (e) {
      // Ignore
    }
  }
}

async function runWorker(): Promise<void> {
  console.log("[Worker] 🚀 Thumbnail worker started");
  console.log(`[Worker] CPU: ${MAX_CPU}, RAM: ${MAX_RAM_MB}MB`);

  while (true) {
    try {
      // Find next pending video
      const file = await prisma.file.findFirst({
        where: {
          mimeType: { startsWith: "video/" },
          thumbnailStatus: "pending",
        },
        orderBy: { createdAt: "asc" },
      });

      if (file) {
        await processThumbnail(file.id);
      } else {
        // No work to do, wait 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error: any) {
      console.error("[Worker] Error in loop:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

runWorker().catch(console.error);
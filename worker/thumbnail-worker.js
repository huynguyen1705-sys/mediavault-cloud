// Worker script to process thumbnail generation queue
// Runs as a separate process, processes one video at a time

const { PrismaClient } = require("@prisma/client");
const { S3Client, GetCommand, PutCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { createWriteStream } = require("fs");
const { pipeline } = require("stream/promises");
const { join } = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// Config
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "mediavault";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-2971f994a6ac2fdadd4842209a20496e.r2.dev";

const prisma = new PrismaClient();
let s3Client = null;

function getS3Client() {
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

function getPublicUrl(r2Key) {
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

async function downloadFile(r2Key, destPath) {
  const client = getS3Client();
  const command = new GetCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
  });
  
  const response = await client.send(command);
  if (response.Body) {
    const writeStream = createWriteStream(destPath);
    await pipeline(response.Body, writeStream);
  }
}

async function uploadThumbnail(sourcePath, destR2Key) {
  const client = getS3Client();
  const command = new PutCommand({
    Bucket: R2_BUCKET,
    Key: destR2Key,
    ContentType: "image/jpeg",
    ACL: "public-read",
  });
  
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  
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

async function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-ss", "00:00:01",
      "-i", inputPath,
      "-vframes", "1",
      "-vf", "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2",
      "-q:v", "3",
      "-threads", "1",
      outputPath,
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

async function processThumbnail(fileId) {
  console.log(`[Worker] Processing thumbnail for file: ${fileId}`);
  
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    console.log(`[Worker] File not found: ${fileId}`);
    return;
  }

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

  await prisma.file.update({
    where: { id: fileId },
    data: { thumbnailStatus: "processing" },
  });

  const tmpDir = "/tmp/thumbnails";
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const inputPath = join(tmpDir, `${fileId}_input`);
  const outputPath = join(tmpDir, `${fileId}_thumb.jpg`);

  try {
    console.log(`[Worker] Downloading ${file.storagePath}...`);
    await downloadFile(file.storagePath, inputPath);

    console.log(`[Worker] Generating thumbnail...`);
    await generateThumbnail(inputPath, outputPath);

    const thumbnailR2Key = `thumbnails/${fileId}.jpg`;
    console.log(`[Worker] Uploading thumbnail...`);
    await uploadThumbnail(outputPath, thumbnailR2Key);

    await prisma.file.update({
      where: { id: fileId },
      data: { 
        thumbnailPath: thumbnailR2Key,
        thumbnailStatus: "ready",
      },
    });

    console.log(`[Worker] ✅ Thumbnail done for: ${fileId}`);

    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  } catch (error) {
    console.error(`[Worker] ❌ Error processing ${fileId}:`, error.message);
    await prisma.file.update({
      where: { id: fileId },
      data: { thumbnailStatus: "failed" },
    });

    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (e) {
      // Ignore
    }
  }
}

async function runWorker() {
  console.log("[Worker] 🚀 Thumbnail worker started");
  console.log(`[Worker] Processing one video at a time`);

  while (true) {
    try {
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
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error("[Worker] Error in loop:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

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
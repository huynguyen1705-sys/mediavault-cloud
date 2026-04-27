// Worker script to process thumbnail generation queue
// Uses AWS SDK v3 for R2 operations

const { PrismaClient } = require("@prisma/client");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const { join } = require("path");
const { spawn } = require("child_process");

// Config
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "mediavault";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-2971f994a6ac2fdadd4842209a20496e.r2.dev";

const prisma = new PrismaClient();

// R2 Client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function getPublicUrl(r2Key) {
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

async function downloadFile(r2Key, destPath) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  });
  
  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  
  // Use signed URL to download
  const https = require("https");
  const http = require("http");
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(destPath);
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`Download failed: ${response.statusCode}`));
      }
    }).on("error", reject);
  });
}

async function uploadThumbnail(sourcePath, r2Key) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    ContentType: "image/jpeg",
    ACL: "public-read",
  });
  
  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  
  const fileBuffer = fs.readFileSync(sourcePath);
  const https = require("https");
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": fileBuffer.length,
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(getPublicUrl(r2Key));
      } else {
        reject(new Error(`Upload failed: ${res.statusCode}`));
      }
    });
    
    req.on("error", reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y", "-ss", "00:00:01", "-i", inputPath,
      "-vframes", "1",
      "-vf", "scale=800:800:force_original_aspect_ratio=decrease,pad=800:800:(ow-iw)/2:(oh-ih)/2",
      "-q:v", "3", "-threads", "1",
      outputPath,
    ]);

    let stderr = "";
    ffmpeg.stderr.on("data", (data) => { stderr += data.toString(); });

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg ${code}: ${stderr.slice(-300)}`));
    });
    ffmpeg.on("error", reject);
  });
}

async function processThumbnail(fileId) {
  console.log(`[Worker] Processing: ${fileId}`);
  
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) return;

  if (!file.mimeType?.startsWith("video/")) {
    await prisma.file.update({ where: { id: fileId }, data: { thumbnailStatus: "not_applicable" } });
    return;
  }

  if (!file.storagePath) return;

  await prisma.file.update({ where: { id: fileId }, data: { thumbnailStatus: "processing" } });

  const tmpDir = "/tmp/thumbnails";
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const inputPath = join(tmpDir, `${fileId}_input.mp4`);
  const outputPath = join(tmpDir, `${fileId}_thumb.jpg`);

  try {
    console.log(`[Worker] Downloading: ${file.storagePath.slice(0, 50)}...`);
    await downloadFile(file.storagePath, inputPath);
    console.log(`[Worker] Downloaded ${fs.statSync(inputPath).size} bytes`);

    console.log(`[Worker] Generating thumbnail...`);
    await generateThumbnail(inputPath, outputPath);
    console.log(`[Worker] Thumbnail: ${fs.statSync(outputPath).size} bytes`);

    const thumbnailKey = `thumbnails/${fileId}.jpg`;
    console.log(`[Worker] Uploading thumbnail...`);
    await uploadThumbnail(outputPath, thumbnailKey);

    await prisma.file.update({
      where: { id: fileId },
      data: { thumbnailPath: thumbnailKey, thumbnailStatus: "ready" },
    });

    console.log(`[Worker] ✅ Done: ${fileId}`);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (error) {
    console.error(`[Worker] ❌ Error: ${error.message}`);
    await prisma.file.update({ where: { id: fileId }, data: { thumbnailStatus: "failed" } });
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (e) {}
  }
}

async function runWorker() {
  console.log("[Worker] 🚀 Thumbnail worker started");
  console.log(`[Worker] R2 Account: ${R2_ACCOUNT_ID}`);
  console.log(`[Worker] R2 Bucket: ${R2_BUCKET_NAME}`);

  while (true) {
    try {
      const file = await prisma.file.findFirst({
        where: { mimeType: { startsWith: "video/" }, thumbnailStatus: "pending" },
        orderBy: { createdAt: "asc" },
      });

      if (file) {
        await processThumbnail(file.id);
      } else {
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (error) {
      console.error("[Worker] Loop error:", error.message);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

process.on("SIGINT", async () => { console.log("[Worker] Shutdown..."); await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { console.log("[Worker] Shutdown..."); await prisma.$disconnect(); process.exit(0); });

runWorker().catch(console.error);
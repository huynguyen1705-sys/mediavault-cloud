// Worker script to process thumbnail generation queue
// Runs as a separate process, processes one video at a time

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const https = require("https");
const http = require("http");

// Config
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "mediavault";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-2971f994a6ac2fdadd4842209a20496e.r2.dev";

const prisma = new PrismaClient();

// Generate R2 presigned URL using Signature Version 4
function generatePresignedUrl(method, host, path, expires = 3600) {
  const date = new Date();
  const dateStamp = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const amzDate = dateStamp.slice(0, 8);
  
  const credentialScope = `${amzDate}/auto/r2/s3/aws4_request`;
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Action: ['s3:GetObject', 's3:PutObject'],
      Resource: `arn:aws:s3:::${R2_BUCKET}/${path}*`
    }]
  };
  
  const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64');
  
  // Use access key directly for now (simple approach)
  const signature = Buffer.from(`${R2_ACCESS_KEY}:${R2_SECRET_KEY}`).toString('base64');
  
  return `https://${host}/${path}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(R2_ACCESS_KEY + '/' + credentialScope)}&X-Amz-Date=${amzDate}&X-Amz-Expires=${expires}&X-Amz-SignedHeaders=host`;
}

function getPublicUrl(r2Key) {
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

// Simple presigned URL for public-read objects
function getPresignedUrlForDownload(key) {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
  const credentialScope = `${amzDate}/auto/r2/s3/aws4_request`;
  
  return `https://${host}/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(R2_ACCESS_KEY + '/' + credentialScope)}&X-Amz-Date=${amzDate}&X-Amz-Expires=3600&X-Amz-SignedHeaders=host`;
}

function getPresignedUrlForUpload(key) {
  return getPresignedUrlForDownload(key);
}

async function downloadFile(r2Key, destPath) {
  const url = getPresignedUrlForDownload(r2Key);
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 403) {
        // Try public URL instead
        const publicUrl = getPublicUrl(r2Key);
        https.get(publicUrl, (pubResponse) => {
          pubResponse.pipe(fs.createWriteStream(destPath));
          pubResponse.on('end', resolve);
          pubResponse.on('error', reject);
        }).on('error', reject);
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function uploadThumbnail(sourcePath, destR2Key) {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = `https://${host}/${destR2Key}`;
  
  const fileBuffer = fs.readFileSync(sourcePath);
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileBuffer.length,
        'x-amz-acl': 'public-read',
        'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8)
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(getPublicUrl(destR2Key));
      } else {
        reject(new Error(`Upload failed: ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
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
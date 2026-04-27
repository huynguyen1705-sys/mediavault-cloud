// Worker script to process thumbnail generation queue
// Runs as a separate process, processes one video at a time

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const { join } = require("path");
const { spawn } = require("child_process");
const https = require("https");
const crypto = require("crypto");

// Config
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "mediavault";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-2971f994a6ac2fdadd4842209a20496e.r2.dev";

const prisma = new PrismaClient();

// AWS Signature Version 4
function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function getSigningKey(secret, dateStamp, region, service) {
  const kDate = hmac('AWS4' + secret, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

function createPresignedUrl(method, host, path, accessKey, secretKey, expires = 3600) {
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
  const dateStamp = amzDate.slice(0, 8);
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  // Query parameters
  const algorithm = 'AWS4-HMAC-SHA256';
  const params = [
    ['X-Amz-Algorithm', algorithm],
    ['X-Amz-Credential', `${accessKey}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expires)],
    ['X-Amz-SignedHeaders', 'host']
  ];
  
  // Create canonical request
  const canonicalUri = '/' + path;
  const canonicalQuerystring = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  // Calculate signature
  const signingKey = getSigningKey(secretKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign).toString('hex');
  
  // Build final URL
  const signedParams = [...params, ['X-Amz-Signature', signature]];
  const signedQs = signedParams.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  
  return `https://${host}${canonicalUri}?${signedQs}`;
}

function getPublicUrl(r2Key) {
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

async function downloadFile(r2Key, destPath) {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = createPresignedUrl('GET', host, r2Key, R2_ACCESS_KEY, R2_SECRET_KEY, 3600);
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.log(`[Worker] Download failed with status: ${response.statusCode}`);
        // Try public URL as fallback
        const publicUrl = getPublicUrl(r2Key);
        console.log(`[Worker] Trying public URL: ${publicUrl.substring(0, 80)}...`);
        https.get(publicUrl, (pubResponse) => {
          if (pubResponse.statusCode !== 200) {
            reject(new Error(`Failed to download: ${pubResponse.statusCode}`));
            return;
          }
          const file = fs.createWriteStream(destPath);
          pubResponse.pipe(file);
          file.on('finish', () => resolve());
        }).on('error', reject);
        return;
      }
      
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

async function uploadThumbnail(sourcePath, destR2Key) {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = createPresignedUrl('PUT', host, destR2Key, R2_ACCESS_KEY, R2_SECRET_KEY, 3600);
  
  const fileBuffer = fs.readFileSync(sourcePath);
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': fileBuffer.length,
        'x-amz-acl': 'public-read'
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[Worker] Thumbnail uploaded: ${res.statusCode}`);
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
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
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

  const inputPath = join(tmpDir, `${fileId}_input.mp4`);
  const outputPath = join(tmpDir, `${fileId}_thumb.jpg`);

  try {
    console.log(`[Worker] Downloading ${file.storagePath}...`);
    await downloadFile(file.storagePath, inputPath);
    
    const inputStats = fs.statSync(inputPath);
    console.log(`[Worker] Downloaded ${inputStats.size} bytes`);

    console.log(`[Worker] Generating thumbnail...`);
    await generateThumbnail(inputPath, outputPath);
    
    const outputStats = fs.statSync(outputPath);
    console.log(`[Worker] Thumbnail generated, size: ${outputStats.size}`);

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
    console.error(`[Worker] ❌ Error processing ${fileId}: ${error.message}`);
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
        console.log("[Worker] No pending jobs, waiting...");
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
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadToR2, generateFileKey, getPresignedUrl } from "@/lib/r2";
import prisma from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

// Max body size for this route (Next.js 14+ App Router)
export const maxDuration = 300; // 5 minutes timeout for large uploads

// Streaming write: reads file from FormData in chunks to avoid full memory copy
async function writeFileToDisk(file: File, destPath: string): Promise<void> {
  const stream = file.stream();
  const writer = fs.createWriteStream(destPath);
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(Buffer.from(value));
    }
  } finally {
    writer.end();
    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }
}

async function generateThumbnail(
  tempFilePath: string,
  fileKey: string,
  isVideo: boolean
): Promise<{ thumbnailPath: string | null; thumbnailStatus: string }> {
  const tempDir = os.tmpdir();
  const tempThumbnailPath = path.join(tempDir, `thumb_${Date.now()}.jpg`);
  const thumbnailKey = `${path.dirname(fileKey)}/thumbnails/${path.basename(fileKey)}.jpg`;

  try {
    if (isVideo) {
      await execAsync(
        `ffmpeg -i "${tempFilePath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${tempThumbnailPath}" -y 2>/dev/null`,
        { timeout: 30000 }
      );
    } else {
      // Image thumbnail - maintain aspect ratio
      await execAsync(
        `ffmpeg -i "${tempFilePath}" -vf "scale=320:-1" "${tempThumbnailPath}" -y 2>/dev/null`,
        { timeout: 15000 }
      );
    }

    if (!fs.existsSync(tempThumbnailPath)) {
      return { thumbnailPath: null, thumbnailStatus: "failed" };
    }

    const thumbBuffer = fs.readFileSync(tempThumbnailPath);
    const { key: thumbKey } = await uploadToR2(thumbBuffer, thumbnailKey, "image/jpeg");

    // Clean up temp thumbnail
    fs.unlinkSync(tempThumbnailPath);

    return { thumbnailPath: thumbKey, thumbnailStatus: "ready" };
  } catch (error) {
    // Clean up on failure
    if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
    return { thumbnailPath: null, thumbnailStatus: "failed" };
  }
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with plan
    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { plan: true },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if (userProfile.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      return NextResponse.json(
        { error: "Request body too large or malformed. Try a smaller file or use presigned upload for files >50MB." },
        { status: 413 }
      );
    }

    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size against plan limit
    const maxFileSize = userProfile.plan.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Max ${userProfile.plan.maxFileSizeMb}MB for ${userProfile.plan.displayName} plan.` },
        { status: 400 }
      );
    }

    // Check storage limit
    const fileSizeBytes = BigInt(file.size);
    const storageLimitBytes = BigInt(userProfile.plan.storageGb * 1024 * 1024 * 1024);
    const newStorageUsed = userProfile.storageUsedBytes + fileSizeBytes;

    if (newStorageUsed > storageLimitBytes) {
      return NextResponse.json(
        { error: "Storage limit exceeded. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Generate unique file key for R2
    const fileKey = generateFileKey(userId, file.name);

    // Write file to temp (streaming to avoid double memory)
    const tempDir = os.tmpdir();
    const fileExt = path.extname(file.name);
    tempFilePath = path.join(tempDir, `upload_${Date.now()}_${Math.random().toString(36).slice(2)}${fileExt}`);

    await writeFileToDisk(file, tempFilePath);

    // Upload main file to R2 (read from disk)
    const fileBuffer = fs.readFileSync(tempFilePath);
    const { key } = await uploadToR2(fileBuffer, fileKey, file.type);

    // Generate thumbnail (non-blocking for response - but we wait to save correct status)
    let thumbnailPath: string | null = null;
    let thumbnailStatus = "not_applicable";

    if (file.type.startsWith("video/") || file.type.startsWith("image/")) {
      const result = await generateThumbnail(
        tempFilePath,
        fileKey,
        file.type.startsWith("video/")
      );
      thumbnailPath = result.thumbnailPath;
      thumbnailStatus = result.thumbnailStatus;
    }

    // Calculate expiration for free users
    const expiresAt = userProfile.plan.fileRetentionDays > 0
      ? new Date(Date.now() + userProfile.plan.fileRetentionDays * 24 * 60 * 60 * 1000)
      : null;

    // Save file metadata to database
    const newFile = await prisma.file.create({
      data: {
        userId: userProfile.id,
        folderId: folderId || null,
        name: file.name,
        originalName: file.name,
        mimeType: file.type,
        fileSize: fileSizeBytes,
        storagePath: key,
        thumbnailPath,
        thumbnailStatus,
        isPublic: false,
        downloadEnabled: true,
        expiresAt,
      },
    });

    // Update user storage usage
    await prisma.user.update({
      where: { id: userProfile.id },
      data: {
        storageUsedBytes: newStorageUsed,
        filesCount: { increment: 1 },
      },
    });

    // Log upload
    await prisma.upload.create({
      data: {
        userId: userProfile.id,
        fileName: file.name,
        fileSize: fileSizeBytes,
        status: "completed",
      },
    });

    // Generate presigned URL for immediate display
    const presignedUrl = await getPresignedUrl(key);

    return NextResponse.json({
      success: true,
      file: {
        id: newFile.id,
        name: newFile.name,
        mimeType: newFile.mimeType,
        fileSize: String(newFile.fileSize),
        url: presignedUrl,
        thumbnailPath,
        thumbnailStatus,
        expiresAt: expiresAt?.toISOString() || null,
      }
    });
  } catch (error: any) {
    console.error("Upload error:", error?.message || error);

    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
  }
}

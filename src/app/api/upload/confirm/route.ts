import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getPresignedUrl, uploadToR2 } from "@/lib/r2";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

/**
 * POST /api/upload/confirm
 * Called AFTER client uploads file to R2 via presigned URL.
 * Saves metadata to DB, generates thumbnail in background.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { plan: true },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { fileKey, fileName, mimeType, fileSize, folderId } = body;

    if (!fileKey || !fileName || !mimeType || !fileSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fileSizeBytes = BigInt(fileSize);
    const newStorageUsed = userProfile.storageUsedBytes + fileSizeBytes;

    // Determine thumbnail status
    const needsThumbnail = mimeType.startsWith("video/") || mimeType.startsWith("image/");
    const thumbnailStatus = needsThumbnail ? "pending" : "not_applicable";

    // Calculate expiration for free users
    const expiresAt = userProfile.plan.fileRetentionDays > 0
      ? new Date(Date.now() + userProfile.plan.fileRetentionDays * 24 * 60 * 60 * 1000)
      : null;

    // Save file metadata
    const newFile = await prisma.file.create({
      data: {
        userId: userProfile.id,
        folderId: folderId || null,
        name: fileName,
        originalName: fileName,
        mimeType,
        fileSize: fileSizeBytes,
        storagePath: fileKey,
        thumbnailPath: null,
        thumbnailStatus,
        isPublic: false,
        downloadEnabled: true,
        expiresAt,
      },
    });

    // Update user storage
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
        fileName,
        fileSize: fileSizeBytes,
        status: "completed",
      },
    });

    // Generate thumbnail asynchronously (don't block response)
    if (needsThumbnail) {
      generateThumbnailAsync(newFile.id, fileKey, mimeType).catch(err => {
        console.error("Thumbnail generation failed:", err?.message);
      });
    }

    // Generate presigned URL for immediate display
    const presignedUrl = await getPresignedUrl(fileKey, 3600);

    return NextResponse.json({
      success: true,
      file: {
        id: newFile.id,
        name: newFile.name,
        mimeType: newFile.mimeType,
        fileSize: String(newFile.fileSize),
        url: presignedUrl,
        thumbnailUrl: mimeType.startsWith("image/") ? presignedUrl : null,
        thumbnailStatus,
        expiresAt: expiresAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Confirm upload error:", error);
    return NextResponse.json(
      { error: "Failed to confirm upload" },
      { status: 500 }
    );
  }
}

/**
 * Background thumbnail generation.
 * Downloads file from R2, generates thumbnail, uploads back to R2, updates DB.
 */
async function generateThumbnailAsync(fileId: string, fileKey: string, mimeType: string) {
  const tempDir = os.tmpdir();
  const ext = path.extname(fileKey) || ".tmp";
  const tempFile = path.join(tempDir, `dl_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  const tempThumb = path.join(tempDir, `thumb_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);

  try {
    // Download file from R2 via presigned URL
    const downloadUrl = await getPresignedUrl(fileKey, 300);
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error("Failed to download file from R2");

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tempFile, buffer);

    // Generate thumbnail
    const isVideo = mimeType.startsWith("video/");
    const cmd = isVideo
      ? `ffmpeg -i "${tempFile}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${tempThumb}" -y 2>/dev/null`
      : `ffmpeg -i "${tempFile}" -vf "scale=320:-1" "${tempThumb}" -y 2>/dev/null`;

    await execAsync(cmd, { timeout: 30000 });

    if (!fs.existsSync(tempThumb)) {
      throw new Error("Thumbnail file not created");
    }

    // Upload thumbnail to R2
    const thumbBuffer = fs.readFileSync(tempThumb);
    const thumbnailKey = `${path.dirname(fileKey)}/thumbnails/${path.basename(fileKey, ext)}.jpg`;
    await uploadToR2(thumbBuffer, thumbnailKey, "image/jpeg");

    // Update DB
    await prisma.file.update({
      where: { id: fileId },
      data: {
        thumbnailPath: thumbnailKey,
        thumbnailStatus: "ready",
      },
    });
  } catch (error) {
    // Mark as failed in DB
    await prisma.file.update({
      where: { id: fileId },
      data: { thumbnailStatus: "failed" },
    }).catch(() => {});
    throw error;
  } finally {
    // Clean up temp files
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    if (fs.existsSync(tempThumb)) fs.unlinkSync(tempThumb);
  }
}

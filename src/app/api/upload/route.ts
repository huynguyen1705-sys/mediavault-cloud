import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { uploadToR2, generateFileKey, getPresignedUrl } from "@/lib/r2";
import prisma from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  let tempThumbnailPath: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
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

    // Determine max file size from plan
    const maxFileSize = userProfile.plan.maxFileSizeMb * 1024 * 1024;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size against plan limit
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size for your plan (${userProfile.plan.displayName}) is ${userProfile.plan.maxFileSizeMb}MB. Please upgrade your plan.` },
        { status: 400 }
      );
    }

    // Check storage limit BEFORE reading full file into memory
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

    // Create temp directory
    const tempDir = os.tmpdir();
    const fileExt = path.extname(file.name);
    tempFilePath = path.join(tempDir, `upload_${Date.now()}${fileExt}`);

    // Write file to temp location
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    // Generate thumbnail if needed
    let thumbnailPath: string | null = null;
    let thumbnailStatus = "not_applicable";

    if (file.type.startsWith("video/")) {
      thumbnailStatus = "pending";
      try {
        // Create thumbnail from video
        const thumbnailExt = ".jpg";
        tempThumbnailPath = path.join(tempDir, `thumb_${Date.now()}${thumbnailExt}`);
        const thumbnailKey = `${path.dirname(fileKey)}/thumbnails/${path.basename(fileKey)}${thumbnailExt}`;

        // Extract thumbnail at 1 second mark
        await execAsync(
          `ffmpeg -i "${tempFilePath}" -ss 00:00:01 -vframes 1 -vf "scale=320:180" "${tempThumbnailPath}" -y 2>/dev/null`
        );

        // Upload thumbnail to R2
        const thumbBuffer = fs.readFileSync(tempThumbnailPath);
        const { key: thumbKey } = await uploadToR2(thumbBuffer, thumbnailKey, "image/jpeg");
        thumbnailPath = thumbKey;

        // Update thumbnail status to ready
        thumbnailStatus = "ready";
      } catch (thumbError) {
        console.error("Thumbnail generation failed:", thumbError);
        thumbnailStatus = "failed";
      }
    } else if (file.type.startsWith("image/")) {
      thumbnailStatus = "pending";
      try {
        // Create thumbnail for images
        const thumbnailExt = ".jpg";
        tempThumbnailPath = path.join(tempDir, `thumb_${Date.now()}${thumbnailExt}`);
        const thumbnailKey = `${path.dirname(fileKey)}/thumbnails/${path.basename(fileKey)}${thumbnailExt}`;

        // Resize image to thumbnail
        await execAsync(
          `ffmpeg -i "${tempFilePath}" -vf "scale=320:180" "${tempThumbnailPath}" -y 2>/dev/null`
        );

        // Upload thumbnail to R2
        const thumbBuffer = fs.readFileSync(tempThumbnailPath);
        const { key: thumbKey } = await uploadToR2(thumbBuffer, thumbnailKey, "image/jpeg");
        thumbnailPath = thumbKey;

        thumbnailStatus = "ready";
      } catch (thumbError) {
        console.error("Image thumbnail failed:", thumbError);
        thumbnailStatus = "failed";
      }
    }

    // Upload main file to R2
    const { key, url } = await uploadToR2(buffer, fileKey, file.type);

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

    // Generate presigned URL for download
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
  } catch (error) {
    console.error("Upload error:", error);

    // Log failed upload
    try {
      const { userId } = await auth();
      if (userId) {
        const userProfile = await prisma.user.findUnique({
          where: { clerkUserId: userId },
        });
        if (userProfile) {
          await prisma.upload.create({
            data: {
              userId: userProfile.id,
              fileName: "unknown",
              fileSize: BigInt(0),
              status: "failed",
            },
          });
        }
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (tempThumbnailPath && fs.existsSync(tempThumbnailPath)) {
      fs.unlinkSync(tempThumbnailPath);
    }
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { uploadToR2, generateFileKey, getPresignedUrl } from "@/lib/r2";
import prisma from "@/lib/db";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get user profile from database
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Calculate file size in bytes
    const fileSizeBytes = BigInt(file.size);
    
    // Check storage limit
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

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const { key, url } = await uploadToR2(buffer, fileKey, file.type);

    // Determine thumbnail status based on mime type
    // Videos get "pending" → worker will process
    // Non-videos get "not_applicable" immediately
    let thumbnailStatus = "not_applicable";
    if (file.type.startsWith("video/")) {
      thumbnailStatus = "pending";
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
        thumbnailPath: null,
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
        fileSize: newFile.fileSize.toString(),
        url: presignedUrl,
        thumbnailStatus, // Tell frontend if thumbnail is pending
        expiresAt: expiresAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
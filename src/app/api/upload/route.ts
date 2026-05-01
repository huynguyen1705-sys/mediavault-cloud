import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { uploadToR2, generateFileKey, getPresignedUrl } from "@/lib/r2";
import prisma from "@/lib/db";

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

    // Determine max file size by plan type
    const planLimits: Record<string, number> = {
      free: 10 * 1024 * 1024,      // 10MB
      pro: 2000 * 1024 * 1024,     // 2000MB
      trial: 10 * 1024 * 1024,     // 10MB for trial
    };
    const maxFileSize = planLimits[userProfile.plan.name.toLowerCase()] ?? 10 * 1024 * 1024;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size against plan limit
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size for your plan (${userProfile.plan.name}) is ${Math.round(maxFileSize / 1024 / 1024)}MB. Please upgrade your plan.` },
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

    return NextResponse.json({ success: true, file: {
        id: newFile.id,
        name: newFile.name,
        mimeType: newFile.mimeType,
        fileSize: String(newFile.fileSize),
        url: presignedUrl,
        thumbnailStatus,
        expiresAt: expiresAt?.toISOString() || null,
      } });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
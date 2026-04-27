import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

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
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { fileKey, fileName, mimeType, fileSize, folderId } = body;

    if (!fileKey || !fileName || !mimeType || !fileSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fileSizeBytes = BigInt(fileSize);
    const newStorageUsed = userProfile.storageUsedBytes + fileSizeBytes;

    // Determine thumbnail status
    let thumbnailStatus = "not_applicable";
    if (mimeType.startsWith("video/")) {
      thumbnailStatus = "pending";
    }

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

    return NextResponse.json({
      success: true,
      file: {
        id: newFile.id,
        name: newFile.name,
        mimeType: newFile.mimeType,
        fileSize: String(newFile.fileSize),
        thumbnailStatus,
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

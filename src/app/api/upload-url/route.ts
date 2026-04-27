import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getUploadPresignedUrl, generateFileKey } from "@/lib/r2";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// GET - Generate presigned URL for direct R2 upload
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");
    const contentType = searchParams.get("contentType");
    const fileSize = searchParams.get("fileSize");
    const folderId = searchParams.get("folderId");

    if (!fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required parameters: fileName, contentType, fileSize" },
        { status: 400 }
      );
    }

    const sizeInBytes = parseInt(fileSize);
    if (sizeInBytes > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get user profile
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

    // Check storage limit
    const storageLimitBytes = BigInt(userProfile.plan.storageGb * 1024 * 1024 * 1024);
    const currentUsed = userProfile.storageUsedBytes;
    const newStorageUsed = currentUsed + BigInt(sizeInBytes);

    if (newStorageUsed > storageLimitBytes) {
      return NextResponse.json(
        { error: "Storage limit exceeded. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Generate unique file key
    const fileKey = generateFileKey(userId, fileName);

    // Generate presigned upload URL (expires in 1 hour)
    const uploadUrl = await getUploadPresignedUrl(fileKey, contentType, 3600);

    return NextResponse.json({
      uploadUrl,
      fileKey,
      maxSize: MAX_FILE_SIZE,
    });
  } catch (error) {
    console.error("Generate upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

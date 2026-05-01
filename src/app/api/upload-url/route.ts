import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getUploadPresignedUrl, generateFileKey } from "@/lib/r2";

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

    const sizeInBytes = parseInt(fileSize);
    if (sizeInBytes > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size for your plan (${userProfile.plan.name}) is ${Math.round(maxFileSize / 1024 / 1024)}MB. Please upgrade your plan.` },
        { status: 400 }
      );
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
      maxSize: maxFileSize,
    });
  } catch (error) {
    console.error("Generate upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
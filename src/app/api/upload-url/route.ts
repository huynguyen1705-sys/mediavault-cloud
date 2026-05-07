import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/get-user";
import { getUploadPresignedUrl, generateFileKey } from "@/lib/r2";

/**
 * GET /api/upload-url
 * Generate presigned URL for direct R2 upload.
 * Client uploads directly to R2, then calls /api/upload/confirm.
 */
export async function GET(request: NextRequest) {
  try {
    const userProfile = await getOrCreateUser();
    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");
    const contentType = searchParams.get("contentType") || "application/octet-stream";
    const fileSize = searchParams.get("fileSize");

    if (!fileName || !fileSize) {
      return NextResponse.json(
        { error: "Missing required: fileName, fileSize" },
        { status: 400 }
      );
    }

    if (userProfile.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const sizeInBytes = parseInt(fileSize);
    const maxFileSize = userProfile.plan.maxFileSizeMb * 1024 * 1024;

    // Check file size limit
    if (sizeInBytes > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Max ${userProfile.plan.maxFileSizeMb}MB for ${userProfile.plan.displayName} plan.` },
        { status: 400 }
      );
    }

    // Check storage limit
    const storageLimitBytes = BigInt(userProfile.plan.storageGb) * BigInt(1024 * 1024 * 1024);
    const newUsed = userProfile.storageUsedBytes + BigInt(sizeInBytes);

    if (newUsed > storageLimitBytes) {
      return NextResponse.json(
        { error: "Storage limit exceeded. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Generate unique file key
    const fileKey = generateFileKey(userProfile.clerkUserId, fileName);

    // Generate presigned upload URL (1 hour expiry)
    const uploadUrl = await getUploadPresignedUrl(fileKey, contentType, 3600);

    return NextResponse.json({
      uploadUrl,
      fileKey,
    });
  } catch (error) {
    console.error("Upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

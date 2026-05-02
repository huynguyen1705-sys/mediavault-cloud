import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { createMultipartUpload, getPartUploadUrl, completeMultipartUpload, abortMultipartUpload, generateFileKey } from "@/lib/r2";

const PART_SIZE = 10 * 1024 * 1024; // 10MB per part

/**
 * POST /api/upload/multipart
 * Actions: init | get-part-urls | complete | abort
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

    if (userProfile.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // ===== INIT =====
    if (action === "init") {
      const { fileName, contentType, fileSize } = body;
      if (!fileName || !fileSize) {
        return NextResponse.json({ error: "Missing fileName or fileSize" }, { status: 400 });
      }

      const sizeInBytes = parseInt(fileSize);
      const maxFileSize = userProfile.plan.maxFileSizeMb * 1024 * 1024;

      if (sizeInBytes > maxFileSize) {
        return NextResponse.json(
          { error: `File too large. Max ${userProfile.plan.maxFileSizeMb}MB.` },
          { status: 400 }
        );
      }

      // Check storage limit
      const storageLimitBytes = BigInt(userProfile.plan.storageGb) * BigInt(1024 * 1024 * 1024);
      if (userProfile.storageUsedBytes + BigInt(sizeInBytes) > storageLimitBytes) {
        return NextResponse.json({ error: "Storage limit exceeded." }, { status: 403 });
      }

      const fileKey = generateFileKey(userId, fileName);
      const uploadId = await createMultipartUpload(fileKey, contentType || "application/octet-stream");
      const totalParts = Math.ceil(sizeInBytes / PART_SIZE);

      return NextResponse.json({
        uploadId,
        fileKey,
        totalParts,
        partSize: PART_SIZE,
      });
    }

    // ===== GET PART URLS =====
    if (action === "get-part-urls") {
      const { fileKey, uploadId, partNumbers } = body;
      if (!fileKey || !uploadId || !partNumbers?.length) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }

      // Generate presigned URLs for requested parts (batch max 10 at a time)
      const urls: Record<number, string> = {};
      await Promise.all(
        (partNumbers as number[]).slice(0, 10).map(async (partNum: number) => {
          urls[partNum] = await getPartUploadUrl(fileKey, uploadId, partNum);
        })
      );

      return NextResponse.json({ urls });
    }

    // ===== COMPLETE =====
    if (action === "complete") {
      const { fileKey, uploadId, parts } = body;
      if (!fileKey || !uploadId || !parts?.length) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }

      await completeMultipartUpload(fileKey, uploadId, parts);
      return NextResponse.json({ success: true });
    }

    // ===== ABORT =====
    if (action === "abort") {
      const { fileKey, uploadId } = body;
      if (fileKey && uploadId) {
        await abortMultipartUpload(fileKey, uploadId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Multipart upload error:", error);
    return NextResponse.json({ error: "Multipart upload failed" }, { status: 500 });
  }
}

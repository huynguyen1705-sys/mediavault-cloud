import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";

/**
 * POST /api/thumbnail/generate
 * Manually trigger thumbnail generation for a specific file
 * 
 * Called by the upload confirm flow or manually by user
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, isAdmin: true }
    });

    // Get file (must belong to user or user must be admin)
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.userId !== userProfile?.id && !userProfile?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if thumbnail is supported
    const mimeType = file.mimeType || "";
    const supported = mimeType.startsWith("video/") || 
                      mimeType.startsWith("image/") ||
                      mimeType === "application/pdf";

    if (!supported) {
      return NextResponse.json({
        success: true,
        message: "Thumbnail not supported for this file type",
        fileId,
        status: "not_applicable"
      });
    }

    // Update thumbnail status to pending
    await prisma.file.update({
      where: { id: fileId },
      data: { thumbnailStatus: "pending" }
    });

    // Trigger external worker (if configured)
    const workerUrl = process.env.THUMBNAIL_WORKER_URL;
    if (workerUrl) {
      try {
        await fetch(`${workerUrl}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId,
            storagePath: file.storagePath,
            mimeType: file.mimeType
          })
        });
      } catch (e) {
        console.error("[Thumbnail] Worker call failed:", e);
        // Continue anyway - will be processed by next cron
      }
    }

    return NextResponse.json({
      success: true,
      message: "Thumbnail generation queued",
      fileId,
      status: "pending"
    });

  } catch (error: any) {
    console.error("[Thumbnail] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/thumbnail/generate
 * Get thumbnail status for a file
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, isAdmin: true }
    });

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        thumbnailPath: true,
        thumbnailStatus: true,
        mimeType: true,
        userId: true
      }
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.userId !== userProfile?.id && !userProfile?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      fileId,
      thumbnailPath: file.thumbnailPath,
      thumbnailStatus: file.thumbnailStatus,
      mimeType: file.mimeType
    });

  } catch (error: any) {
    console.error("[Thumbnail] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
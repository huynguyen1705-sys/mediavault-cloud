import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";

/**
 * GET /api/cleanup/thumbnails
 * Cleanup orphaned thumbnails (thumbnails that don't have a corresponding file)
 * 
 * Cron schedule: Daily at 3 AM
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.CLEANUP_API_KEY;
    const isInternalCall = request.headers.get("x-internal-call") === "true";
    
    if (!isInternalCall && apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all thumbnails from database
    const filesWithThumbnails = await prisma.file.findMany({
      where: {
        thumbnailPath: { not: null }
      },
      select: { id: true, thumbnailPath: true, thumbnailStatus: true }
    });

    const validThumbnailIds = new Set(
      filesWithThumbnails.map(f => {
        // Extract file ID from thumbnail path (thumbnails/{id}.jpg)
        const match = f.thumbnailPath?.match(/thumbnails\/(.+?)\./);
        return match ? match[1] : null;
      }).filter(Boolean)
    );

    // Get all R2 objects with thumbnail prefix
    // Note: This requires R2 bucket listing permission
    // For now, we'll mark files that need thumbnail regeneration
    
    const orphanedThumbnails = await prisma.file.findMany({
      where: {
        thumbnailStatus: "failed"
      },
      select: { id: true, name: true, thumbnailStatus: true }
    });

    return NextResponse.json({
      success: true,
      stats: {
        filesWithThumbnails: filesWithThumbnails.length,
        failedThumbnails: orphanedThumbnails.length
      },
      failedFiles: orphanedThumbnails.slice(0, 10), // Show first 10
      canRequeue: true
    });

  } catch (error: any) {
    console.error("[ThumbnailCleanup] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/cleanup/thumbnails
 * Requeue failed thumbnails for processing
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.CLEANUP_API_KEY;
    const isInternalCall = request.headers.get("x-internal-call") === "true";
    
    if (!isInternalCall && apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileIds } = await request.json().catch(() => ({}));

    type WhereClause = { thumbnailStatus: string; id?: { in: string[] } };
    let whereClause: WhereClause = { thumbnailStatus: "failed" };
    if (fileIds && Array.isArray(fileIds)) {
      whereClause = { ...whereClause, id: { in: fileIds } };
    }

    const result = await prisma.file.updateMany({
      where: whereClause,
      data: { thumbnailStatus: "pending" }
    });

    return NextResponse.json({
      success: true,
      message: `Requeued ${result.count} files for thumbnail processing`,
      count: result.count
    });

  } catch (error: any) {
    console.error("[ThumbnailRequeue] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
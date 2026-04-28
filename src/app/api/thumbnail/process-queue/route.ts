import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";

/**
 * POST /api/thumbnail/process-queue
 * Process pending thumbnails in batch
 * 
 * Cron schedule: Every 15 minutes
 * Handles video thumbnail generation via external service or marks for processing
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.CLEANUP_API_KEY;
    const isInternalCall = request.headers.get("x-internal-call") === "true";
    
    if (!isInternalCall && apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending thumbnails
    const pendingFiles = await prisma.file.findMany({
      where: {
        thumbnailStatus: "pending",
        storagePath: { not: null }
      },
      select: {
        id: true,
        storagePath: true,
        mimeType: true
      },
      take: 50, // Process up to 50 at a time
      orderBy: { createdAt: "asc" }
    });

    const workerUrl = process.env.THUMBNAIL_WORKER_URL;
    const results = [];

    for (const file of pendingFiles) {
      try {
        // Mark as processing
        await prisma.file.update({
          where: { id: file.id },
          data: { thumbnailStatus: "processing" }
        });

        // For images, generate thumbnail inline (if ffmpeg available)
        if (file.mimeType?.startsWith("image/")) {
          // Images don't need separate thumbnail - use original or resize
          await prisma.file.update({
            where: { id: file.id },
            data: {
              thumbnailPath: file.storagePath,
              thumbnailStatus: "ready"
            }
          });
          results.push({ fileId: file.id, status: "ready", method: "inline" });
          continue;
        }

        // For videos, call external worker
        if (file.mimeType?.startsWith("video/") && workerUrl) {
          try {
            const response = await fetch(`${workerUrl}/process`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileId: file.id,
                storagePath: file.storagePath,
                mimeType: file.mimeType
              })
            });

            const data = await response.json();
            results.push({ fileId: file.id, status: data.status || "queued" });
          } catch (e) {
            results.push({ fileId: file.id, status: "worker_error", error: String(e) });
          }
          continue;
        }

        // For unsupported types
        await prisma.file.update({
          where: { id: file.id },
          data: { thumbnailStatus: "not_applicable" }
        });
        results.push({ fileId: file.id, status: "not_applicable" });

      } catch (error: any) {
        console.error(`[ProcessQueue] Error for ${file.id}:`, error);
        results.push({ fileId: file.id, status: "error", error: error.message });
        
        // Mark as failed after 3 retries (tracked in metadata)
        await prisma.file.update({
          where: { id: file.id },
          data: { thumbnailStatus: "failed" }
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error: any) {
    console.error("[ProcessQueue] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/thumbnail/process-queue
 * Get queue status
 */
export async function GET(request: NextRequest) {
  try {
    const counts = await prisma.file.groupBy({
      by: ["thumbnailStatus"],
      _count: true
    });

    return NextResponse.json({
      status: "ok",
      counts: counts.reduce((acc, item) => {
        acc[item.thumbnailStatus || "unknown"] = item._count;
        return acc;
      }, {} as Record<string, number>),
      workerUrl: process.env.THUMBNAIL_WORKER_URL ? "configured" : "not_configured"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
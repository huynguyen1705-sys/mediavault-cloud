import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";

// Types for cleanup results
interface CleanupResult {
  expiredFilesDeleted: number;
  trashFilesDeleted: number;
  orphanedFilesDeleted: number;
  errors: string[];
}

// Cleanup settings
const TRASH_RETENTION_DAYS = 30;

/**
 * DELETE /api/cleanup/expired
 * Delete files that have exceeded their expiration date
 * 
 * Cron schedule: Every hour
 * or daily at midnight
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authorization (use API key for cron, or admin check)
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.CLEANUP_API_KEY;
    
    // Allow internal calls without auth (from same server)
    const isInternalCall = request.headers.get("x-internal-call") === "true";
    
    if (!isInternalCall && apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result: CleanupResult = {
      expiredFilesDeleted: 0,
      trashFilesDeleted: 0,
      orphanedFilesDeleted: 0,
      errors: []
    };

    // 1. Delete expired files (files past their expiresAt date)
    const now = new Date();
    
    const expiredFiles = await prisma.file.findMany({
      where: {
        expiresAt: { lt: now },
        deletedAt: null // Only delete non-trashed files
      },
      select: { id: true, storagePath: true }
    });

    for (const file of expiredFiles) {
      try {
        // Delete from R2
        if (file.storagePath) {
          await deleteFromR2(file.storagePath);
          
          // Also delete thumbnail if exists
          const thumbnailPath = `thumbnails/${file.id}.jpg`;
          try {
            await deleteFromR2(thumbnailPath);
          } catch (e) {
            // Thumbnail may not exist, ignore
          }
        }
        
        // Delete from DB
        await prisma.file.delete({ where: { id: file.id } });
        result.expiredFilesDeleted++;
        
      } catch (error: any) {
        result.errors.push(`Failed to delete expired file ${file.id}: ${error.message}`);
      }
    }

    // 2. Delete trash files older than TRASH_RETENTION_DAYS
    const trashThreshold = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    const trashFiles = await prisma.file.findMany({
      where: {
        deletedAt: { lt: trashThreshold }
      },
      select: { id: true, storagePath: true, userId: true }
    });

    for (const file of trashFiles) {
      try {
        // Delete from R2
        if (file.storagePath) {
          await deleteFromR2(file.storagePath);
          
          // Delete thumbnail
          const thumbnailPath = `thumbnails/${file.id}.jpg`;
          try {
            await deleteFromR2(thumbnailPath);
          } catch (e) {}
        }
        
        // Update user storage stats
        const fileRecord = await prisma.file.findUnique({
          where: { id: file.id },
          select: { fileSize: true }
        }).catch(() => null);
        
        if (fileRecord) {
          await prisma.user.update({
            where: { id: file.userId },
            data: {
              storageUsedBytes: { decrement: fileRecord.fileSize },
              filesCount: { decrement: 1 }
            }
          }).catch(() => {});
        }
        
        // Delete from DB
        await prisma.file.delete({ where: { id: file.id } });
        result.trashFilesDeleted++;
        
      } catch (error: any) {
        result.errors.push(`Failed to delete trash file ${file.id}: ${error.message}`);
      }
    }

    // 3. Cleanup orphaned R2 files (storagePath exists but no DB record)
    // Get all storage paths from DB
    const dbFiles = await prisma.file.findMany({
      where: {
        storagePath: { not: null }
      },
      select: { storagePath: true }
    });
    
    const dbStoragePaths = new Set(dbFiles.map(f => f.storagePath));
    
    // Note: This requires listing R2 bucket, which needs extra permissions
    // For safety, we'll skip this step unless explicitly enabled
    if (process.env.CLEANUP_ORPHANED_FILES === "true") {
      // This would require R2 list permission - skip for now
      // result.orphanedFilesDeleted = await cleanupOrphanedR2Files(dbStoragePaths);
    }

    const totalDeleted = result.expiredFilesDeleted + result.trashFilesDeleted + result.orphanedFilesDeleted;
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${totalDeleted} files deleted`,
      details: result,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error("[Cleanup] Error:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check cleanup status (for monitoring)
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const trashThreshold = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    const [expiredCount, trashCount] = await Promise.all([
      prisma.file.count({
        where: {
          expiresAt: { lt: now },
          deletedAt: null
        }
      }),
      prisma.file.count({
        where: {
          deletedAt: { lt: trashThreshold }
        }
      })
    ]);

    return NextResponse.json({
      status: "ok",
      pendingCleanup: {
        expiredFiles: expiredCount,
        trashFilesOlderThan30Days: trashCount
      },
      settings: {
        trashRetentionDays: TRASH_RETENTION_DAYS,
        cleanupOrphanedFiles: process.env.CLEANUP_ORPHANED_FILES === "true"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
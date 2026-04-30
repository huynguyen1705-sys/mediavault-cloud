import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// POST - Clean up trash (delete old trashed files)
export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get files to delete (files in trash for more than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // First get count and size of files to delete
    const filesToDelete = await prisma.file.findMany({
      where: {
        deletedAt: { not: null, lte: thirtyDaysAgo },
      },
      select: {
        id: true,
        fileSize: true,
        storagePath: true,
      },
    });

    if (filesToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No old trashed files to clean",
        deletedCount: 0,
        freedSpace: 0,
      });
    }

    // Delete from database
    const deleteResult = await prisma.file.deleteMany({
      where: {
        id: { in: filesToDelete.map(f => f.id) },
      },
    });

    // Calculate freed space
    const freedSpace = filesToDelete.reduce((sum, f) => sum + Number(f.fileSize || 0), 0);

    // Update user storage counters
    // In a real app, you'd also delete from R2/S3 storage

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "STORAGE_CLEANUP",
        resourceType: "storage",
        resourceId: "trash",
        details: { deletedCount: deleteResult.count, freedSpace },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.count} old trashed files, freed ${freedSpace} bytes`,
      deletedCount: deleteResult.count,
      freedSpace,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Failed to cleanup" }, { status: 500 });
  }
}
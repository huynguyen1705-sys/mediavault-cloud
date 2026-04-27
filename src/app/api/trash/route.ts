import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";

// GET - List trashed files
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch trashed files
    const trashedFiles = await prisma.file.findMany({
      where: {
        userId: userProfile.id,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: "desc" },
    });

    // Calculate days until permanent deletion (30 days from deletion)
    const filesWithExpiry = trashedFiles.map((file) => {
      const deletedAt = file.deletedAt as Date;
      const expiryDate = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return {
        ...file,
        daysRemaining: Math.max(0, daysRemaining),
        expiryDate: expiryDate.toISOString(),
      };
    });

    return NextResponse.json({
      files: filesWithExpiry,
      count: filesWithExpiry.length,
    });
  } catch (error) {
    console.error("List trash error:", error);
    return NextResponse.json({ error: "Failed to list trash" }, { status: 500 });
  }
}

// DELETE - Empty trash (permanently delete all trashed files)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find all trashed files
    const trashedFiles = await prisma.file.findMany({
      where: {
        userId: userProfile.id,
        deletedAt: { not: null },
      },
    });

    // Delete from R2
    for (const file of trashedFiles) {
      if (file.storagePath) {
        try {
          await deleteFromR2(file.storagePath);
        } catch (e) {
          console.error(`Failed to delete ${file.storagePath} from R2:`, e);
        }
      }
      if (file.thumbnailPath) {
        try {
          await deleteFromR2(file.thumbnailPath);
        } catch (e) {
          console.error(`Failed to delete ${file.thumbnailPath} from R2:`, e);
        }
      }
    }

    // Calculate total size to subtract
    const totalSize = trashedFiles.reduce((sum, file) => sum + Number(file.fileSize), 0);

    // Delete from database
    await prisma.file.deleteMany({
      where: {
        userId: userProfile.id,
        deletedAt: { not: null },
      },
    });

    // Update user storage
    await prisma.user.update({
      where: { id: userProfile.id },
      data: {
        storageUsedBytes: { decrement: BigInt(totalSize) },
        filesCount: { decrement: trashedFiles.length },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: userProfile.id,
        action: "EMPTY_TRASH",
        resourceType: "file",
        resourceId: "bulk",
        details: { filesDeleted: trashedFiles.length },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: trashedFiles.length,
    });
  } catch (error) {
    console.error("Empty trash error:", error);
    return NextResponse.json({ error: "Failed to empty trash" }, { status: 500 });
  }
}

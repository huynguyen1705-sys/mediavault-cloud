import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";

// GET - Get single file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const file = await prisma.file.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        fileSize: String(file.fileSize),
        folderId: file.folderId,
        thumbnailStatus: file.thumbnailStatus,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error("Get file error:", error);
    return NextResponse.json({ error: "Failed to get file" }, { status: 500 });
  }
}

// PATCH - Update file (rename, move, restore from trash)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, folderId, restore } = body;

    // Verify file ownership (check both active and trashed files)
    const existingFile = await prisma.file.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // If restore is true, restore from trash
    if (restore) {
      await prisma.file.update({
        where: { id },
        data: { deletedAt: null },
      });

      await prisma.auditLog.create({
        data: {
          userId: userProfile.id,
          action: "RESTORE_FILE",
          resourceType: "file",
          resourceId: id,
          details: { fileName: existingFile.name },
        },
      });

      return NextResponse.json({ success: true, restored: true });
    }

    // Update file
    const updatedFile = await prisma.file.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(folderId !== undefined && { folderId }),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: userProfile.id,
        action: "UPDATE_FILE",
        resourceType: "file",
        resourceId: id,
        details: { name, folderId },
      },
    });

    return NextResponse.json({ 
      success: true, 
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        folderId: updatedFile.folderId,
        updatedAt: updatedFile.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error("Update file error:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}

// DELETE - Delete file (soft delete to trash)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify file ownership
    const file = await prisma.file.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (permanent) {
      // Permanent delete - remove from R2 and database
      if (file.storagePath) {
        await deleteFromR2(file.storagePath);
      }
      if (file.thumbnailPath) {
        await deleteFromR2(file.thumbnailPath);
      }
      await prisma.file.delete({ where: { id } });
      
      // Update user storage (only if not already trashed)
      await prisma.user.update({
        where: { id: userProfile.id },
        data: {
          storageUsedBytes: { decrement: file.fileSize },
          filesCount: { decrement: 1 },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: userProfile.id,
          action: "PERMANENT_DELETE_FILE",
          resourceType: "file",
          resourceId: id,
          details: { fileName: file.name },
        },
      });
    } else {
      // Soft delete - move to trash
      await prisma.file.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          userId: userProfile.id,
          action: "TRASH_FILE",
          resourceType: "file",
          resourceId: id,
          details: { fileName: file.name },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

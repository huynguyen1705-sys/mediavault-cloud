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

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Get file error:", error);
    return NextResponse.json({ error: "Failed to get file" }, { status: 500 });
  }
}

// PATCH - Update file (rename, move)
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
    const { name, folderId } = body;

    // Verify file ownership
    const existingFile = await prisma.file.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
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

    return NextResponse.json({ success: true, file: updatedFile });
  } catch (error) {
    console.error("Update file error:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}

// DELETE - Delete file
export async function DELETE(
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

    // Verify file ownership
    const file = await prisma.file.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from R2
    if (file.storagePath) {
      await deleteFromR2(file.storagePath);
    }
    if (file.thumbnailPath) {
      await deleteFromR2(file.thumbnailPath);
    }

    // Delete from database
    await prisma.file.delete({ where: { id } });

    // Update user storage
    await prisma.user.update({
      where: { id: userProfile.id },
      data: {
        storageUsedBytes: { decrement: file.fileSize },
        filesCount: { decrement: 1 },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: userProfile.id,
        action: "DELETE_FILE",
        resourceType: "file",
        resourceId: id,
        details: { fileName: file.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

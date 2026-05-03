import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { getPublicUrl, deleteFromR2 } from "@/lib/r2";
import prisma from "@/lib/db";

// GET /api/v1/files/:id - Get file info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({ success: false, error: { message: "Invalid or missing API key", code: 401 } }, { status: 401 });
    }
    if (!user.permissions.includes("read")) {
      return NextResponse.json({ success: false, error: { message: "No read permission", code: 403 } }, { status: 403 });
    }

    const { id } = await params;
    const file = await prisma.file.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: { shares: { select: { shareToken: true }, take: 1 } },
    });

    if (!file) {
      return NextResponse.json({ success: false, error: { message: "File not found", code: 404 } }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: file.id,
        title: file.name,
        url: file.storagePath ? getPublicUrl(file.storagePath) : null,
        direct_link: file.storagePath ? getPublicUrl(file.storagePath) : null,
        share_url: file.shares[0] ? `https://fii.one/s/${file.shares[0].shareToken}` : null,
        size: Number(file.fileSize),
        mime: file.mimeType,
        folder_id: file.folderId,
        created_at: file.createdAt.toISOString(),
        updated_at: file.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("API v1 file get error:", error);
    return NextResponse.json({ success: false, error: { message: "Failed to get file", code: 500 } }, { status: 500 });
  }
}

// PATCH /api/v1/files/:id - Update file (rename, move)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({ success: false, error: { message: "Invalid or missing API key", code: 401 } }, { status: 401 });
    }
    if (!user.permissions.includes("upload")) {
      return NextResponse.json({ success: false, error: { message: "No edit permission", code: 403 } }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, folder_id } = body;

    const file = await prisma.file.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!file) {
      return NextResponse.json({ success: false, error: { message: "File not found", code: 404 } }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (folder_id !== undefined) updateData.folderId = folder_id || null;

    const updated = await prisma.file.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.name,
        folder_id: updated.folderId,
        updated_at: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("API v1 file update error:", error);
    return NextResponse.json({ success: false, error: { message: "Failed to update file", code: 500 } }, { status: 500 });
  }
}

// DELETE /api/v1/files/:id - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({ success: false, error: { message: "Invalid or missing API key", code: 401 } }, { status: 401 });
    }
    if (!user.permissions.includes("delete")) {
      return NextResponse.json({ success: false, error: { message: "No delete permission", code: 403 } }, { status: 403 });
    }

    const { id } = await params;
    const file = await prisma.file.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!file) {
      return NextResponse.json({ success: false, error: { message: "File not found", code: 404 } }, { status: 404 });
    }

    // Delete from R2
    if (file.storagePath) {
      await deleteFromR2(file.storagePath).catch(() => {});
    }
    if (file.thumbnailPath) {
      await deleteFromR2(file.thumbnailPath).catch(() => {});
    }

    // Delete shares
    await prisma.share.deleteMany({ where: { fileId: id } });

    // Delete file record
    await prisma.file.delete({ where: { id } });

    // Update storage
    await prisma.user.update({
      where: { id: user.id },
      data: { storageUsedBytes: { decrement: file.fileSize } },
    });

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error("API v1 file delete error:", error);
    return NextResponse.json({ success: false, error: { message: "Failed to delete file", code: 500 } }, { status: 500 });
  }
}

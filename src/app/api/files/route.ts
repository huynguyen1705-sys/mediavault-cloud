import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getPresignedUrl, deleteFromR2 } from "@/lib/r2";

// GET - List files for user (paginated, fast)
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

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const dateFilter = searchParams.get("date");
    const sizeFilter = searchParams.get("size");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId: userProfile.id,
      deletedAt: null,
    };

    if (folderId === "root" || folderId === null || !folderId) {
      where.folderId = null;
    } else {
      where.folderId = folderId;
    }

    if (type) {
      if (type === "image") where.mimeType = { startsWith: "image/" };
      else if (type === "video") where.mimeType = { startsWith: "video/" };
      else if (type === "audio") where.mimeType = { startsWith: "audio/" };
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (dateFilter) {
      const now = new Date();
      if (dateFilter === "today") {
        where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        where.createdAt = { gte: weekAgo };
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        where.createdAt = { gte: monthAgo };
      }
    }

    if (sizeFilter) {
      if (sizeFilter === "small") {
        where.fileSize = { lt: 1024 * 1024 };
      } else if (sizeFilter === "medium") {
        where.AND = [
          { fileSize: { gte: 1024 * 1024 } },
          { fileSize: { lte: 10 * 1024 * 1024 } },
        ];
      } else if (sizeFilter === "large") {
        where.fileSize = { gt: 10 * 1024 * 1024 };
      }
    }

    // Fetch files with pagination - select ONLY needed fields (faster query)
    const [files, totalCount] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          mimeType: true,
          fileSize: true,
          storagePath: true,
          thumbnailPath: true,
          thumbnailStatus: true,
          metadata: true,
          folderId: true,
          isPublic: true,
          downloadEnabled: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          folder: { select: { id: true, name: true } },
          shares: { select: { shareToken: true }, take: 1 },
        },
      }),
      prisma.file.count({ where }),
    ]);

    // Return file metadata WITHOUT presigned URLs (fast!)
    // Client will request URLs on demand via /api/files/[id] or batch endpoint
    const filesData = files.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      fileSize: file.fileSize.toString(),
      storagePath: file.storagePath,
      thumbnailPath: file.thumbnailPath,
      thumbnailStatus: file.thumbnailStatus,
      metadata: file.metadata || null,
      url: null, // Generated on demand
      thumbnailUrl: null, // Generated on demand
      folderId: file.folderId,
      folder: file.folder,
      isPublic: file.isPublic,
      downloadEnabled: file.downloadEnabled,
      expiresAt: file.expiresAt?.toISOString() || null,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
      shareUrl: file.shares?.[0]?.shareToken ? `/s/${file.shares[0].shareToken}` : null,
    }));

    // Fetch folders
    const folders = (!folderId || folderId === "root")
      ? await prisma.folder.findMany({
          where: { userId: userProfile.id, parentId: null },
          orderBy: { name: "asc" },
        })
      : await prisma.folder.findMany({
          where: { userId: userProfile.id, parentId: folderId },
          orderBy: { name: "asc" },
        });

    const response = NextResponse.json({
      files: filesData,
      folders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
    // Allow client-side caching for 10s, revalidate in background
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    return response;
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}

// DELETE - Delete file(s)
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

    const body = await request.json();
    const { fileIds } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "No file IDs provided" }, { status: 400 });
    }

    // Soft delete (move to trash)
    await prisma.file.updateMany({
      where: {
        id: { in: fileIds },
        userId: userProfile.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete files error:", error);
    return NextResponse.json({ error: "Failed to delete files" }, { status: 500 });
  }
}

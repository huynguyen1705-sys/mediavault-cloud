import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getPresignedUrl, getPublicUrl, deleteFromR2 } from "@/lib/r2";

// GET - List files for user
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
    const type = searchParams.get("type"); // image, video, audio
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Build where clause (exclude trashed files by default)
    const where: any = {
      userId: userProfile.id,
      deletedAt: null, // Only show non-deleted files
    };

    if (folderId === "root" || folderId === null) {
      where.folderId = null;
    } else if (folderId) {
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

    // Fetch files with presigned URLs
    const files = await prisma.file.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        folder: {
          select: { id: true, name: true },
        },
      },
    });

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        let presignedUrl = null;
        if (file.storagePath) {
          presignedUrl = await getPresignedUrl(file.storagePath);
        }

        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          fileSize: file.fileSize.toString(),
          thumbnailUrl: file.thumbnailPath 
            ? await getPresignedUrl(file.thumbnailPath) 
            : file.mimeType?.startsWith("image/") && file.storagePath 
              ? await getPresignedUrl(file.storagePath) 
              : file.thumbnailStatus === "pending" || file.thumbnailStatus === "processing"
                ? "processing"
                : null,
          thumbnailStatus: file.thumbnailStatus,
          url: presignedUrl,
          folderId: file.folderId,
          folder: file.folder,
          isPublic: file.isPublic,
          downloadEnabled: file.downloadEnabled,
          expiresAt: file.expiresAt?.toISOString() || null,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
        };
      })
    );

    // Also fetch folders
    const folders = folderId === "root" || folderId === null
      ? await prisma.folder.findMany({
          where: { userId: userProfile.id, parentId: null },
          orderBy: { name: "asc" },
        })
      : folderId
        ? await prisma.folder.findMany({
            where: { userId: userProfile.id, parentId: folderId },
            orderBy: { name: "asc" },
          })
        : [];

    return NextResponse.json({
      files: filesWithUrls,
      folders,
    });
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-user";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.fii.one";

/**
 * GET /api/collections/:id/files — list files in a collection
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const collection = await prisma.collection.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        name: true,
        type: true,
        fileCount: true,
        thumbnailMosaic: true,
        isPinned: true,
        rules: true,
        createdAt: true,
        files: {
          select: {
            score: true,
            file: {
              select: {
                id: true,
                name: true,
                mimeType: true,
                fileSize: true,
                storagePath: true,
                thumbnailPath: true,
                metadata: true,
                createdAt: true,
                folderId: true,
                folder: { select: { name: true } },
              },
            },
          },
          orderBy: { score: "desc" },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // No presigned URLs - generated on demand for speed
    const files = collection.files.map((cf) => {
      const f = cf.file;
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        fileSize: f.fileSize.toString(),
        url: null, // On demand via /api/files/[id]/proxy
        thumbnailUrl: f.thumbnailPath ? `${R2_PUBLIC_URL}/${f.thumbnailPath}` : null,
        metadata: f.metadata,
        createdAt: f.createdAt,
        folderName: f.folder?.name || "My Files",
        score: cf.score,
      };
    });

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        type: collection.type,
        fileCount: collection.fileCount,
        thumbnailMosaic: collection.thumbnailMosaic,
        isPinned: collection.isPinned,
        rules: collection.rules,
        createdAt: collection.createdAt,
      },
      files,
    });
  } catch (error) {
    console.error("Collection files error:", error);
    return NextResponse.json({ error: "Failed to load collection files" }, { status: 500 });
  }
}

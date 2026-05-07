import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-user";

/**
 * GET /api/storage — folder tree with stats
 */
export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get folders with file counts + sizes
    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        _count: { select: { files: true } },
        files: {
          where: { deletedAt: null },
          select: { fileSize: true, mimeType: true, createdAt: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Root files (no folder)
    const rootFiles = await prisma.file.findMany({
      where: { userId: user.id, folderId: null, deletedAt: null },
      select: { fileSize: true, mimeType: true, createdAt: true },
    });

    // Build folder tree
    const folderTree = folders.map(f => {
      const totalSize = f.files.reduce((s, file) => s + Number(file.fileSize), 0);
      const types = new Map<string, number>();
      f.files.forEach(file => {
        const type = file.mimeType?.split("/")[0] || "other";
        types.set(type, (types.get(type) || 0) + 1);
      });

      const lastModified = f.files.length > 0
        ? f.files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : f.createdAt;

      return {
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        fileCount: f._count.files,
        totalSize,
        types: Object.fromEntries(types),
        lastModified,
      };
    });

    // Root stats
    const rootSize = rootFiles.reduce((s, f) => s + Number(f.fileSize), 0);
    const rootTypes = new Map<string, number>();
    rootFiles.forEach(f => {
      const type = f.mimeType?.split("/")[0] || "other";
      rootTypes.set(type, (rootTypes.get(type) || 0) + 1);
    });

    // Overall stats
    const totalFiles = await prisma.file.count({ where: { userId: user.id, deletedAt: null } });
    const totalSize = await prisma.file.aggregate({
      where: { userId: user.id, deletedAt: null },
      _sum: { fileSize: true },
    });

    // Type breakdown (overall)
    const typeBreakdown = await prisma.$queryRaw<{ type: string; count: string; size: string }[]>`
      SELECT SPLIT_PART(mime_type, '/', 1) as type,
             COUNT(*)::text as count,
             SUM(file_size)::text as size
      FROM files WHERE user_id = ${user.id}::uuid AND deleted_at IS NULL
      GROUP BY SPLIT_PART(mime_type, '/', 1)
      ORDER BY SUM(file_size) DESC
    `;

    // Largest files
    const largestFiles = await prisma.file.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { fileSize: "desc" },
      take: 10,
      select: {
        id: true, name: true, mimeType: true, fileSize: true, createdAt: true,
        folder: { select: { name: true } },
      },
    });

    return NextResponse.json({
      folders: folderTree,
      root: { fileCount: rootFiles.length, totalSize: rootSize, types: Object.fromEntries(rootTypes) },
      stats: {
        totalFiles,
        totalSize: Number(totalSize._sum.fileSize || 0),
        folderCount: folders.length,
        typeBreakdown: typeBreakdown.map(t => ({ type: t.type, count: parseInt(t.count), size: parseInt(t.size) })),
        largestFiles: largestFiles.map(f => ({
          id: f.id, name: f.name, mimeType: f.mimeType,
          fileSize: f.fileSize.toString(), folderName: f.folder?.name || "My Files",
          createdAt: f.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Storage API error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

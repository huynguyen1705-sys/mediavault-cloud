import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get storage overview
export async function GET() {
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

    // Get total storage
    const storageResult = await prisma.user.aggregate({
      _sum: { storageUsedBytes: true },
    });
    const usedStorage = Number(storageResult._sum.storageUsedBytes || 0);

    // Simulate total storage (in production, query actual disk)
    const totalStorage = usedStorage * 3; // Placeholder
    const availableStorage = totalStorage - usedStorage;

    // Storage by file type
    const byFileType = await prisma.$queryRaw<Array<{ type: string; size: bigint; count: bigint }>>`
      SELECT 
        CASE 
          WHEN mime_type LIKE 'image/%' THEN 'Images'
          WHEN mime_type LIKE 'video/%' THEN 'Videos'
          WHEN mime_type LIKE 'audio/%' THEN 'Audio'
          WHEN mime_type LIKE 'application/pdf' THEN 'Documents'
          ELSE 'Other'
        END as type,
        COALESCE(SUM(size_bytes), 0) as size,
        COUNT(*) as count
      FROM files
      WHERE deleted_at IS NULL
      GROUP BY type
      ORDER BY size DESC
    `;

    // Top users by storage
    const topUsers = await prisma.user.findMany({
      select: {
        email: true,
        storageUsedBytes: true,
      },
      orderBy: { storageUsedBytes: "desc" },
      take: 10,
    });

    const maxStorage = Math.max(...topUsers.map(u => Number(u.storageUsedBytes)), 1);

    // Trash stats
    const trashStats = await prisma.file.aggregate({
      where: { deletedAt: { not: null } },
      _count: true,
      _sum: { fileSize: true },
    });

    const oldestTrash = await prisma.file.findFirst({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "asc" },
      select: { deletedAt: true },
    });

    return NextResponse.json({
      totalStorage,
      usedStorage,
      availableStorage,
      byFileType: byFileType.map(t => ({
        type: t.type,
        size: Number(t.size),
        count: Number(t.count),
      })),
      topUsers: topUsers.map(u => ({
        email: u.email || "Unknown",
        storage: Number(u.storageUsedBytes),
        percent: (Number(u.storageUsedBytes) / maxStorage * 100),
      })),
      trashStats: {
        totalFiles: trashStats._count,
        totalSize: Number(trashStats._sum.fileSize || 0),
        oldestFile: oldestTrash?.deletedAt?.toString() || null,
      },
    });
  } catch (error) {
    console.error("Storage stats error:", error);
    return NextResponse.json({ error: "Failed to get storage" }, { status: 500 });
  }
}
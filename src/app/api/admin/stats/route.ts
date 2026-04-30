import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get admin statistics
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const [
      totalUsers,
      totalFiles,
      totalFolders,
      totalBandwidth,
      storageUsedResult,
      recentSignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.file.count({ where: { deletedAt: null } }),
      prisma.folder.count(),
      prisma.download.aggregate({
        _sum: { bytesDownloaded: true },
      }),
      prisma.user.aggregate({
        _sum: { storageUsedBytes: true },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalFiles,
        totalFolders,
        totalBandwidthBytes: Number(totalBandwidth._sum.bytesDownloaded || 0),
        totalStorageBytes: Number(storageUsedResult._sum.storageUsedBytes || 0),
        recentSignups,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
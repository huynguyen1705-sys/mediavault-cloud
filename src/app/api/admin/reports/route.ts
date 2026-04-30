import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get report data
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    let startDate = new Date();
    if (range === "7d") startDate.setDate(startDate.getDate() - 7);
    else if (range === "30d") startDate.setDate(startDate.getDate() - 30);
    else if (range === "90d") startDate.setDate(startDate.getDate() - 90);
    else startDate = new Date(0); // all time

    // Total stats
    const totalUsers = await prisma.user.count();
    const totalFiles = await prisma.file.count({ where: { deletedAt: null } });

    const storageResult = await prisma.user.aggregate({
      _sum: { storageUsedBytes: true },
    });

    const bandwidthResult = await prisma.download.aggregate({
      _sum: { bytesDownloaded: true },
    });

    // Storage by file type
    const storageByType = await prisma.$queryRaw<Array<{ type: string; size: bigint; count: bigint }>>`
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

    // Storage trend (daily)
    const storageTrend = await prisma.$queryRaw<Array<{ date: string; size: bigint }>>`
      SELECT 
        DATE(uploaded_at) as date,
        SUM(size_bytes) as size
      FROM files
      WHERE uploaded_at >= ${startDate} AND deleted_at IS NULL
      GROUP BY DATE(uploaded_at)
      ORDER BY date ASC
    `;

    // Bandwidth by day
    const bandwidthByDay = await prisma.$queryRaw<Array<{ date: string; bandwidth: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(bytes_downloaded), 0) as bandwidth
      FROM downloads
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // User growth
    const userGrowth = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users_profile
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Top users by storage
    const topUsers = await prisma.user.findMany({
      select: {
        email: true,
        storageUsedBytes: true,
        filesCount: true,
        bandwidthUsedBytes: true,
      },
      orderBy: { storageUsedBytes: "desc" },
      take: 10,
    });

    return NextResponse.json({
      totalUsers,
      totalFiles,
      totalStorage: Number(storageResult._sum.storageUsedBytes || 0),
      totalBandwidth: Number(bandwidthResult._sum.bytesDownloaded || 0),
      storageByType: storageByType.map((t) => ({
        type: t.type,
        size: Number(t.size),
        count: Number(t.count),
      })),
      storageTrend: storageTrend.map((t) => ({
        date: t.date.toString(),
        size: Number(t.size),
      })),
      bandwidthByDay: bandwidthByDay.map((t) => ({
        date: t.date.toString(),
        bandwidth: Number(t.bandwidth),
      })),
      userGrowth: userGrowth.map((t) => ({
        date: t.date.toString(),
        count: Number(t.count),
      })),
      topUsers: topUsers.map((u) => ({
        email: u.email || "Unknown",
        storage: Number(u.storageUsedBytes),
        files: u.filesCount,
        bandwidth: Number(u.bandwidthUsedBytes),
      })),
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Failed to get reports" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/analytics?range=7|30|90&userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = parseInt(searchParams.get("range") || "30");
    const userId = searchParams.get("userId");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Storage usage over time (from files aggregate)
    const filesOverTime = await prisma.file.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: startDate },
        deletedAt: null,
      },
      _count: { id: true },
      _sum: { fileSize: true },
      orderBy: { createdAt: "asc" },
    });

    // Bandwidth usage over time
    const bandwidthOverTime = await prisma.bandwidthLog.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _sum: { bytesUsed: true },
      orderBy: { createdAt: "asc" },
    });

    // File type breakdown
    const allFiles = await prisma.file.findMany({
      where: { userId, deletedAt: null },
      select: { mimeType: true },
    });

    const mimeCounts: Record<string, number> = {};
    for (const f of allFiles) {
      if (!f.mimeType) {
        mimeCounts["other"] = (mimeCounts["other"] || 0) + 1;
      } else if (f.mimeType.startsWith("image/")) {
        mimeCounts["images"] = (mimeCounts["images"] || 0) + 1;
      } else if (f.mimeType.startsWith("video/")) {
        mimeCounts["videos"] = (mimeCounts["videos"] || 0) + 1;
      } else if (f.mimeType.startsWith("audio/")) {
        mimeCounts["audio"] = (mimeCounts["audio"] || 0) + 1;
      } else if (f.mimeType.startsWith("application/pdf") || f.mimeType.includes("document")) {
        mimeCounts["documents"] = (mimeCounts["documents"] || 0) + 1;
      } else {
        mimeCounts["other"] = (mimeCounts["other"] || 0) + 1;
      }
    }

    // Summary stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageUsedBytes: true,
        bandwidthUsedBytes: true,
        filesCount: true,
        plan: { select: { storageGb: true, bandwidthGb: true } },
      },
    });

    // Aggregate daily for charts
    const dailyFiles: Record<string, { count: number; size: number }> = {};
    const dailyBandwidth: Record<string, number> = {};

    for (const f of filesOverTime) {
      const d = f.createdAt.toISOString().slice(0, 10);
      if (!dailyFiles[d]) dailyFiles[d] = { count: 0, size: 0 };
      dailyFiles[d].count += f._count.id;
      dailyFiles[d].size += Number(f._sum.fileSize || 0);
    }

    for (const b of bandwidthOverTime) {
      const d = b.createdAt.toISOString().slice(0, 10);
      if (!dailyBandwidth[d]) dailyBandwidth[d] = 0;
      dailyBandwidth[d] += Number(b._sum.bytesUsed || 0);
    }

    // Fill missing days
    const fillMissingDays = (data: Record<string, number>, defaultVal = 0) => {
      const result = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        result.push({ date: key, value: data[key] ?? defaultVal });
      }
      return result;
    };

    return NextResponse.json({
      storageUsage: fillMissingDays(
        Object.fromEntries(
          Object.entries(dailyFiles).map(([k, v]) => [k, v.size])
        )
      ),
      filesUploaded: fillMissingDays(
        Object.fromEntries(
          Object.entries(dailyFiles).map(([k, v]) => [k, v.count])
        )
      ),
      bandwidthUsage: fillMissingDays(dailyBandwidth),
      fileTypeBreakdown: Object.entries(mimeCounts).map(([type, count]) => ({ type, count })),
      summary: {
        totalStorage: Number(user?.storageUsedBytes || 0),
        totalBandwidth: Number(user?.bandwidthUsedBytes || 0),
        totalFiles: user?.filesCount || 0,
        storageLimit: (user?.plan?.storageGb || 0) * 1024 * 1024 * 1024,
        bandwidthLimit: (user?.plan?.bandwidthGb || 0) * 1024 * 1024 * 1024,
      },
    });
  } catch (error) {
    console.error("[Analytics]", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
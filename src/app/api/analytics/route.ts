import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET /api/analytics?range=7|30|90
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = parseInt(searchParams.get("range") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    // IMPORTANT: Clerk userId (user_xxx) != internal DB user_id (UUID)
    // Must lookup internal user record first
    const userRecord = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { plan: true },
    });

    const userId = userRecord?.id;
    console.log("[Analytics] clerkUserId:", clerkUserId, "-> internalUserId:", userId, "plan:", userRecord?.plan);

    if (!userId) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Get user's plan from included relation or fallback lookup
    let storageLimit = 1 * 1024 * 1024 * 1024; // Default 1GB
    let bandwidthLimit = 10 * 1024 * 1024 * 1024; // Default 10GB

    if (userRecord?.plan) {
      storageLimit = userRecord.plan.storageGb * 1024 * 1024 * 1024;
      bandwidthLimit = (userRecord.plan.bandwidthGb || 10) * 1024 * 1024 * 1024;
    } else if (userRecord?.planId) {
      // Fallback: lookup plan by planId
      const userPlan = await prisma.plan.findUnique({ where: { id: userRecord.planId } });
      if (userPlan) {
        storageLimit = userPlan.storageGb * 1024 * 1024 * 1024;
        bandwidthLimit = (userPlan.bandwidthGb || 10) * 1024 * 1024 * 1024;
      }
    } else {
      // Fallback to free plan by name
      const freePlan = await prisma.plan.findUnique({ where: { name: "free" } });
      if (freePlan) {
        storageLimit = freePlan.storageGb * 1024 * 1024 * 1024;
        bandwidthLimit = (freePlan.bandwidthGb || 10) * 1024 * 1024 * 1024;
      }
    }

    console.log("[Analytics] storageLimit:", storageLimit, "bandwidthLimit:", bandwidthLimit);

    // Storage usage over time - FILTERED BY INTERNAL USER ID
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

    // Bandwidth usage over time - FILTERED BY INTERNAL USER ID
    const bandwidthOverTime = await prisma.bandwidthLog.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _sum: { bytesUsed: true },
      orderBy: { createdAt: "asc" },
    });

    // File type breakdown - FILTERED BY INTERNAL USER ID
    const userFiles = await prisma.file.findMany({
      where: { userId, deletedAt: null },
      select: { mimeType: true },
    });

    const mimeCounts: Record<string, number> = {};
    for (const f of userFiles) {
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

    // User's total stats - FILTERED BY INTERNAL USER ID
    const totalStorage = await prisma.file.aggregate({
      where: { userId, deletedAt: null },
      _sum: { fileSize: true },
    });

    const totalBandwidth = await prisma.bandwidthLog.aggregate({
      where: { userId },
      _sum: { bytesUsed: true },
    });

    const totalFiles = await prisma.file.count({
      where: { userId, deletedAt: null },
    });

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
        totalStorage: Number(totalStorage._sum.fileSize || 0),
        totalBandwidth: Number(totalBandwidth._sum.bytesUsed || 0),
        totalFiles,
        storageLimit,
        bandwidthLimit,
      },
    });
  } catch (error) {
    console.error("[Analytics]", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

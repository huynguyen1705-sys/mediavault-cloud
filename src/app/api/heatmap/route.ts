import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-user";

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
  totalSize: number;
}

/**
 * GET /api/heatmap?year=2026
 * Returns daily file counts for heatmap calendar
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    // Get all files for the year
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    const files = await prisma.file.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        fileSize: true,
      },
    });

    // Group by date
    const dayMap = new Map<string, { count: number; totalSize: number }>();

    for (const file of files) {
      const dateKey = file.createdAt.toISOString().split("T")[0];
      const existing = dayMap.get(dateKey) || { count: 0, totalSize: 0 };
      existing.count++;
      existing.totalSize += Number(file.fileSize);
      dayMap.set(dateKey, existing);
    }

    // Convert to array
    const heatmap: DayData[] = [];
    for (const [date, data] of dayMap) {
      heatmap.push({ date, count: data.count, totalSize: data.totalSize });
    }

    // Calculate max for color scaling
    const maxCount = Math.max(...heatmap.map(d => d.count), 1);

    return NextResponse.json({ heatmap, year, maxCount });
  } catch (error) {
    console.error("Heatmap API error:", error);
    return NextResponse.json({ error: "Failed to load heatmap" }, { status: 500 });
  }
}

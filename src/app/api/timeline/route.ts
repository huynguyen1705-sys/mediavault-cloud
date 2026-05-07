import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/lib/get-user";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.fii.one";

interface TimelineGroup {
  date: string; // YYYY-MM-DD
  files: any[];
  count: number;
  totalSize: number;
}

/**
 * GET /api/timeline?view=day|week|month|year&limit=50
 * Returns files grouped by time period
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "day"; // day, week, month, year
    const limit = parseInt(searchParams.get("limit") || "100");

    // Fetch files ordered by creation date
    const files = await prisma.file.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        mimeType: true,
        fileSize: true,
        storagePath: true,
        thumbnailPath: true,
        createdAt: true,
        metadata: true,
        folderId: true,
        folder: { select: { name: true } },
      },
    });

    // Group files by date based on view
    const groups = new Map<string, any[]>();

    for (const file of files) {
      const date = file.createdAt;
      let key: string;

      if (view === "day") {
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (view === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (view === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // year
        key = String(date.getFullYear());
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(file);
    }

    // Build timeline groups
    const timeline: TimelineGroup[] = [];

    for (const [date, groupFiles] of groups) {
      const totalSize = groupFiles.reduce((sum, f) => sum + Number(f.fileSize), 0);
      
      // Generate presigned URLs for first 10 files (for preview)
      const filesWithUrls = await Promise.all(
        groupFiles.slice(0, 10).map(async (f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          fileSize: f.fileSize.toString(),
          url: f.storagePath ? await getPresignedUrl(f.storagePath, 3600) : null,
          thumbnailUrl: f.thumbnailPath ? `${R2_PUBLIC_URL}/${f.thumbnailPath}` : null,
          createdAt: f.createdAt,
          folderName: f.folder?.name || "My Files",
          metadata: f.metadata,
        }))
      );

      timeline.push({
        date,
        files: filesWithUrls,
        count: groupFiles.length,
        totalSize,
      });
    }

    return NextResponse.json({ timeline, view });
  } catch (error) {
    console.error("Timeline API error:", error);
    return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 });
  }
}

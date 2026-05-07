import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
// Removed getPresignedUrl - URLs generated on demand for speed
import { getOrCreateUser } from "@/lib/get-user";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.fii.one";

/**
 * GET /api/timeline
 * 
 * Zoom levels:
 *   ?zoom=year          → 12 months with stats + sample thumbnails
 *   ?zoom=month&m=2026-05  → days in that month with stats + sample thumbnails  
 *   ?zoom=day&d=2026-05-07 → all files for that day
 *   ?zoom=overview      → year-level density data (all years)
 * 
 * Also supports legacy: ?view=day|week|month|year&limit=50&cursor=DATE&filter=...&search=...
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const zoom = searchParams.get("zoom");

    // ═══════════ ZOOM: OVERVIEW (all years) ═══════════
    if (zoom === "overview") {
      const yearData = await prisma.$queryRaw<{ year: string; month: string; count: string; size: string }[]>`
        SELECT EXTRACT(YEAR FROM created_at)::text as year,
               EXTRACT(MONTH FROM created_at)::text as month,
               COUNT(*)::text as count,
               COALESCE(SUM(file_size), 0)::text as size
        FROM files WHERE user_id = ${user.id}::uuid AND deleted_at IS NULL
        GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        ORDER BY year DESC, month ASC
      `;

      // Group by year
      const years = new Map<string, { months: { month: number; count: number; size: number }[]; totalFiles: number; totalSize: number }>();
      for (const row of yearData) {
        if (!years.has(row.year)) years.set(row.year, { months: [], totalFiles: 0, totalSize: 0 });
        const y = years.get(row.year)!;
        const count = parseInt(row.count);
        const size = parseInt(row.size);
        y.months.push({ month: parseInt(row.month), count, size });
        y.totalFiles += count;
        y.totalSize += size;
      }

      // Get sample thumbnails per year (first 4)
      const result = [];
      for (const [year, data] of years) {
        const samples = await prisma.file.findMany({
          where: {
            userId: user.id, deletedAt: null,
            thumbnailPath: { not: null },
            createdAt: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${parseInt(year) + 1}-01-01`),
            },
          },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { thumbnailPath: true },
        });
        result.push({
          year,
          ...data,
          sampleThumbnails: samples.map(s => `${R2_PUBLIC_URL}/${s.thumbnailPath}`),
        });
      }

      return NextResponse.json({ zoom: "overview", years: result });
    }

    // ═══════════ ZOOM: YEAR → show months ═══════════
    if (zoom === "year") {
      const y = searchParams.get("y") || String(new Date().getFullYear());
      
      const monthData = await prisma.$queryRaw<{ month: string; count: string; size: string }[]>`
        SELECT EXTRACT(MONTH FROM created_at)::text as month,
               COUNT(*)::text as count,
               COALESCE(SUM(file_size), 0)::text as size
        FROM files 
        WHERE user_id = ${user.id}::uuid AND deleted_at IS NULL
              AND EXTRACT(YEAR FROM created_at) = ${parseInt(y)}
        GROUP BY EXTRACT(MONTH FROM created_at)
        ORDER BY month ASC
      `;

      // Get type breakdown per month
      const typeData = await prisma.$queryRaw<{ month: string; type: string; count: string }[]>`
        SELECT EXTRACT(MONTH FROM created_at)::text as month,
               SPLIT_PART(mime_type, '/', 1) as type,
               COUNT(*)::text as count
        FROM files
        WHERE user_id = ${user.id}::uuid AND deleted_at IS NULL
              AND EXTRACT(YEAR FROM created_at) = ${parseInt(y)}
        GROUP BY EXTRACT(MONTH FROM created_at), SPLIT_PART(mime_type, '/', 1)
        ORDER BY month ASC
      `;

      // Sample thumbnails per month
      const months = [];
      for (let m = 1; m <= 12; m++) {
        const md = monthData.find(r => parseInt(r.month) === m);
        const types = typeData.filter(r => parseInt(r.month) === m)
          .map(r => ({ type: r.type, count: parseInt(r.count) }));

        let sampleThumbnails: string[] = [];
        if (md && parseInt(md.count) > 0) {
          const samples = await prisma.file.findMany({
            where: {
              userId: user.id, deletedAt: null,
              thumbnailPath: { not: null },
              createdAt: {
                gte: new Date(`${y}-${String(m).padStart(2, "0")}-01`),
                lt: m === 12 ? new Date(`${parseInt(y) + 1}-01-01`) : new Date(`${y}-${String(m + 1).padStart(2, "0")}-01`),
              },
            },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { thumbnailPath: true },
          });
          sampleThumbnails = samples.map(s => `${R2_PUBLIC_URL}/${s.thumbnailPath}`);
        }

        months.push({
          month: m,
          count: md ? parseInt(md.count) : 0,
          size: md ? parseInt(md.size) : 0,
          types,
          sampleThumbnails,
        });
      }

      const totalFiles = months.reduce((s, m) => s + m.count, 0);
      const totalSize = months.reduce((s, m) => s + m.size, 0);
      const maxCount = Math.max(...months.map(m => m.count), 1);

      return NextResponse.json({ zoom: "year", year: y, months, totalFiles, totalSize, maxCount });
    }

    // ═══════════ ZOOM: MONTH → show days ═══════════
    if (zoom === "month") {
      const m = searchParams.get("m") || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const [yearStr, monthStr] = m.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const daysInMonth = new Date(year, month, 0).getDate();
      const startDate = new Date(`${m}-01`);
      const endDate = month === 12 ? new Date(`${year + 1}-01-01`) : new Date(`${yearStr}-${String(month + 1).padStart(2, "0")}-01`);

      const dayData = await prisma.$queryRaw<{ day: string; count: string; size: string }[]>`
        SELECT EXTRACT(DAY FROM created_at)::text as day,
               COUNT(*)::text as count,
               COALESCE(SUM(file_size), 0)::text as size
        FROM files
        WHERE user_id = ${user.id}::uuid AND deleted_at IS NULL
              AND created_at >= ${startDate} AND created_at < ${endDate}
        GROUP BY EXTRACT(DAY FROM created_at)
        ORDER BY day ASC
      `;

      // Sample thumbnails for days with files
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dd = dayData.find(r => parseInt(r.day) === d);
        let sampleThumbnails: string[] = [];

        if (dd && parseInt(dd.count) > 0) {
          const dateStr = `${m}-${String(d).padStart(2, "0")}`;
          const nextDate = d === daysInMonth ? endDate : new Date(`${m}-${String(d + 1).padStart(2, "0")}`);
          const samples = await prisma.file.findMany({
            where: {
              userId: user.id, deletedAt: null,
              thumbnailPath: { not: null },
              createdAt: { gte: new Date(dateStr), lt: nextDate },
            },
            orderBy: { createdAt: "desc" },
            take: 4,
            select: { thumbnailPath: true },
          });
          sampleThumbnails = samples.map(s => `${R2_PUBLIC_URL}/${s.thumbnailPath}`);
        }

        days.push({
          day: d,
          date: `${m}-${String(d).padStart(2, "0")}`,
          count: dd ? parseInt(dd.count) : 0,
          size: dd ? parseInt(dd.size) : 0,
          sampleThumbnails,
          dayOfWeek: new Date(`${m}-${String(d).padStart(2, "0")}T00:00:00`).getDay(),
        });
      }

      const totalFiles = days.reduce((s, d) => s + d.count, 0);
      const maxCount = Math.max(...days.map(d => d.count), 1);

      return NextResponse.json({ zoom: "month", month: m, days, totalFiles, maxCount, daysInMonth });
    }

    // ═══════════ ZOOM: DAY → show all files ═══════════
    if (zoom === "day") {
      const d = searchParams.get("d") || new Date().toISOString().split("T")[0];
      const filter = searchParams.get("filter");
      const startDate = new Date(d + "T00:00:00Z");
      const endDate = new Date(d + "T23:59:59.999Z");

      const where: any = {
        userId: user.id, deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      };
      if (filter) {
        const mimeMap: Record<string, string> = { image: "image/", video: "video/", audio: "audio/", document: "application/" };
        if (mimeMap[filter]) where.mimeType = { startsWith: mimeMap[filter] };
      }

      const files = await prisma.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, mimeType: true, fileSize: true,
          storagePath: true, thumbnailPath: true, createdAt: true,
          metadata: true, folder: { select: { name: true } },
        },
      });

      return NextResponse.json({
        zoom: "day",
        date: d,
        files: files.map(f => ({
          id: f.id, name: f.name, mimeType: f.mimeType,
          fileSize: f.fileSize.toString(),
          url: null,
          thumbnailUrl: f.thumbnailPath ? `${R2_PUBLIC_URL}/${f.thumbnailPath}` : null,
          createdAt: f.createdAt,
          folderName: f.folder?.name || "My Files",
          metadata: f.metadata,
        })),
        totalFiles: files.length,
      });
    }

    // ═══════════ LEGACY: view-based timeline ═══════════
    const view = searchParams.get("view") || "day";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const cursor = searchParams.get("cursor");
    const filter = searchParams.get("filter");
    const search = searchParams.get("search");

    const where: any = { userId: user.id, deletedAt: null };
    if (cursor) where.createdAt = { lt: new Date(cursor + "T23:59:59Z") };
    if (filter) {
      const mimeMap: Record<string, string> = { image: "image/", video: "video/", audio: "audio/", document: "application/" };
      if (mimeMap[filter]) where.mimeType = { startsWith: mimeMap[filter] };
    }
    if (search) where.name = { contains: search, mode: "insensitive" };

    const files = await prisma.file.findMany({ where, orderBy: { createdAt: "desc" }, take: limit,
      select: { id: true, name: true, mimeType: true, fileSize: true, storagePath: true, thumbnailPath: true, createdAt: true, metadata: true, folderId: true, folder: { select: { name: true } } },
    });

    const groups = new Map<string, any[]>();
    for (const file of files) {
      const date = file.createdAt;
      let key: string;
      if (view === "day") key = date.toISOString().split("T")[0];
      else if (view === "week") { const ws = new Date(date); ws.setDate(date.getDate() - date.getDay()); key = ws.toISOString().split("T")[0]; }
      else if (view === "month") key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      else key = String(date.getFullYear());
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(file);
    }

    const timeline = [];
    for (const [date, groupFiles] of groups) {
      const totalSize = groupFiles.reduce((s: number, f: any) => s + Number(f.fileSize), 0);
      const filesWithUrls = groupFiles.slice(0, 12).map((f: any) => ({
        id: f.id, name: f.name, mimeType: f.mimeType, fileSize: f.fileSize.toString(),
        url: null, thumbnailUrl: f.thumbnailPath ? `${R2_PUBLIC_URL}/${f.thumbnailPath}` : null,
        createdAt: f.createdAt, folderName: f.folder?.name || "My Files", metadata: f.metadata,
      }));
      timeline.push({ date, files: filesWithUrls, count: groupFiles.length, totalSize });
    }

    const nextCursor = files.length === limit ? files[files.length - 1].createdAt.toISOString().split("T")[0] : null;
    return NextResponse.json({ timeline, view, nextCursor });
  } catch (error) {
    console.error("Timeline API error:", error);
    return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 });
  }
}

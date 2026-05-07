import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/lib/get-user";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.fii.one";

/**
 * GET /api/timeline?view=day|week|month|year&limit=200&cursor=DATE&filter=image|video|audio|document
 * Virtual pagination: returns groups starting from cursor date
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "day";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const cursor = searchParams.get("cursor"); // YYYY-MM-DD
    const filter = searchParams.get("filter"); // image, video, audio, document
    const search = searchParams.get("search");

    // Build where clause
    const where: any = { userId: user.id, deletedAt: null };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor + "T23:59:59Z") };
    }

    if (filter) {
      const mimeMap: Record<string, string> = {
        image: "image/",
        video: "video/",
        audio: "audio/",
        document: "application/",
      };
      if (mimeMap[filter]) {
        where.mimeType = { startsWith: mimeMap[filter] };
      }
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const files = await prisma.file.findMany({
      where,
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

    // Group files by date
    const groups = new Map<string, any[]>();
    for (const file of files) {
      const date = file.createdAt;
      let key: string;
      if (view === "day") key = date.toISOString().split("T")[0];
      else if (view === "week") {
        const ws = new Date(date);
        ws.setDate(date.getDate() - date.getDay());
        key = ws.toISOString().split("T")[0];
      } else if (view === "month") key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      else key = String(date.getFullYear());
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(file);
    }

    // Build timeline with presigned URLs
    const timeline = [];
    for (const [date, groupFiles] of groups) {
      const totalSize = groupFiles.reduce((s: number, f: any) => s + Number(f.fileSize), 0);
      const filesWithUrls = await Promise.all(
        groupFiles.slice(0, 12).map(async (f: any) => ({
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
      timeline.push({ date, files: filesWithUrls, count: groupFiles.length, totalSize });
    }

    // Next cursor = last file date
    const nextCursor = files.length === limit
      ? files[files.length - 1].createdAt.toISOString().split("T")[0]
      : null;

    return NextResponse.json({ timeline, view, nextCursor });
  } catch (error) {
    console.error("Timeline API error:", error);
    return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 });
  }
}

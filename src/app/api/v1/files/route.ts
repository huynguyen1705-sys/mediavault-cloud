import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { getPublicUrl } from "@/lib/r2";
import prisma from "@/lib/db";

// GET /api/v1/files - List user's files
export async function GET(request: NextRequest) {
  try {
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { message: "Invalid or missing API key", code: 401 },
      }, { status: 401 });
    }

    if (!user.permissions.includes("read")) {
      return NextResponse.json({
        success: false,
        error: { message: "API key does not have read permission", code: 403 },
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          shares: {
            where: { fileId: { not: null } },
            select: { shareToken: true },
            take: 1,
          },
        },
      }),
      prisma.file.count({ where: { userId: user.id, deletedAt: null } }),
    ]);

    return NextResponse.json({
      success: true,
      data: files.map((f) => ({
        id: f.id,
        title: f.name,
        url: f.storagePath ? getPublicUrl(f.storagePath) : null,
        direct_link: f.storagePath ? getPublicUrl(f.storagePath) : null,
        share_url: f.shares[0] ? `https://fii.one/s/${f.shares[0].shareToken}` : null,
        size: Number(f.fileSize),
        mime: f.mimeType,
        created_at: f.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("API v1 files list error:", error);
    return NextResponse.json({
      success: false,
      error: { message: "Failed to list files", code: 500 },
    }, { status: 500 });
  }
}

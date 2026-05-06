import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";

// GET - Get all files sorted by date for timeline view
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    // Build date filter
    const now = new Date();
    let dateFilter: Date | undefined;

    switch (filter) {
      case "week":
        dateFilter = new Date(now);
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case "month":
        dateFilter = new Date(now);
        dateFilter.setMonth(dateFilter.getMonth() - 1);
        break;
      case "year":
        dateFilter = new Date(now);
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
      default:
        dateFilter = undefined;
    }

    const files = await prisma.file.findMany({
      where: {
        userId: userProfile.id,
        deletedAt: null,
        ...(dateFilter && {
          createdAt: { gte: dateFilter },
        }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
        thumbnailPath: true,
        storagePath: true,
        shares: {
          select: { shareToken: true },
          take: 1,
        },
      },
    });

    // Generate thumbnail URLs
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        let thumbnailUrl = null;
        let url = null;

        if (file.thumbnailPath) {
          try {
            thumbnailUrl = `https://cdn.fii.one/${file.thumbnailPath}`;
          } catch {}
        }

        if (file.storagePath) {
          try {
            url = await getPresignedUrl(file.storagePath);
          } catch {}
        }

        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          fileSize: file.fileSize.toString(),
          createdAt: file.createdAt.toISOString(),
          thumbnailUrl,
          url,
          shareUrl: file.shares?.[0]?.shareToken ? `/s/${file.shares[0].shareToken}` : null,
        };
      })
    );

    return NextResponse.json({ files: filesWithUrls });
  } catch (error) {
    console.error("Timeline API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}

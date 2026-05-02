import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";

// POST - Batch generate presigned URLs for visible files
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { fileIds } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "No file IDs" }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    const limitedIds = fileIds.slice(0, 30);

    // Fetch files belonging to user
    const files = await prisma.file.findMany({
      where: {
        id: { in: limitedIds },
        userId: userProfile.id,
      },
      select: {
        id: true,
        storagePath: true,
        thumbnailPath: true,
        mimeType: true,
      },
    });

    // Generate presigned URLs in parallel
    const urlMap: Record<string, { url: string | null; thumbnailUrl: string | null }> = {};

    await Promise.all(
      files.map(async (file) => {
        const [url, thumbnailUrl] = await Promise.all([
          file.storagePath ? getPresignedUrl(file.storagePath, 3600) : null,
          file.thumbnailPath
            ? getPresignedUrl(file.thumbnailPath, 3600)
            : file.mimeType?.startsWith("image/") && file.storagePath
              ? getPresignedUrl(file.storagePath, 3600)
              : null,
        ]);

        urlMap[file.id] = { url, thumbnailUrl };
      })
    );

    return NextResponse.json({ urls: urlMap });
  } catch (error) {
    console.error("Batch URLs error:", error);
    return NextResponse.json({ error: "Failed to generate URLs" }, { status: 500 });
  }
}

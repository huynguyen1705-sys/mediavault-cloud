import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateCollections } from "@/lib/collections";
import { getOrCreateUser } from "@/lib/get-user";

/**
 * GET /api/collections — list user's collections
 */
export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        type: true,
        fileCount: true,
        thumbnailMosaic: true,
        isPinned: true,
        rules: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("List collections error:", error);
    return NextResponse.json({ error: "Failed to list collections" }, { status: 500 });
  }
}

/**
 * POST /api/collections — generate AI collections or create manual one
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));

    if (body.action === "generate") {
      // AI auto-generate
      const result = await generateCollections(user.id);
      return NextResponse.json({ success: true, ...result });
    }

    // Manual collection creation
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const collection = await prisma.collection.create({
      data: {
        userId: user.id,
        name: body.name,
        type: "manual",
        fileCount: 0,
        thumbnailMosaic: [],
        isPinned: false,
      },
    });

    return NextResponse.json({ collection });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}

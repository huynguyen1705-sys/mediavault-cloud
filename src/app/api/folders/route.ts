import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// POST - Create folder
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
    const { name, parentId } = body;

    if (!name) {
      return NextResponse.json({ error: "Folder name required" }, { status: 400 });
    }

    // Verify parent folder ownership if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId: userProfile.id },
      });
      if (!parentFolder) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    const folder = await prisma.folder.create({
      data: {
        userId: userProfile.id,
        parentId: parentId || null,
        name,
        path: parentId || null,
      },
    });

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}

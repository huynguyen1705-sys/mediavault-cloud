import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-user";

// GET - List all folders
export async function GET(request: NextRequest) {
  try {
    const userProfile = await getOrCreateUser();
    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await prisma.folder.findMany({
      where: { userId: userProfile.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("List folders error:", error);
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 });
  }
}

// POST - Create folder
export async function POST(request: NextRequest) {
  try {
    const userProfile = await getOrCreateUser();
    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

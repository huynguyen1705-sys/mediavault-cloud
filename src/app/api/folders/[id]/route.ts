import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get single folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const folder = await prisma.folder.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("Get folder error:", error);
    return NextResponse.json({ error: "Failed to get folder" }, { status: 500 });
  }
}

// PATCH - Update folder (rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    // Verify folder ownership
    const existingFolder = await prisma.folder.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Update folder
    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        ...(name && { name }),
      },
    });

    return NextResponse.json({ success: true, folder: updatedFolder });
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

// DELETE - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Delete folder (cascades to child folders and files via Prisma)
    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete folder error:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}

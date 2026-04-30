import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is already admin
    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Only admins can promote users" }, { status: 403 });
    }

    const { targetClerkUserId, makeAdmin } = await request.json();

    if (!targetClerkUserId) {
      return NextResponse.json({ error: "Missing target user ID" }, { status: 400 });
    }

    // Find and update target user
    const targetUser = await prisma.user.findUnique({
      where: { clerkUserId: targetClerkUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { clerkUserId: targetClerkUserId },
      data: { isAdmin: makeAdmin === true },
    });

    return NextResponse.json({
      success: true,
      message: makeAdmin ? `${targetUser.email} is now an admin` : `${targetUser.email} is no longer an admin`,
    });
  } catch (error) {
    console.error("Set admin error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
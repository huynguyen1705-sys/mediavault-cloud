import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// POST - Set admin (only existing admin can do this)
// PUT - Bulk operations on users

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Only admins can manage admins" }, { status: 403 });
    }

    const { targetClerkUserId, action } = await request.json();

    if (!targetClerkUserId) {
      return NextResponse.json({ error: "Missing targetClerkUserId" }, { status: 400 });
    }

    // Find target user
    const targetUser = await prisma.user.findUnique({
      where: { clerkUserId: targetClerkUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update admin status
    if (action === "make_admin") {
      await prisma.user.update({
        where: { clerkUserId: targetClerkUserId },
        data: { isAdmin: true },
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: "USER_MAKE_ADMIN",
          resourceType: "user",
          resourceId: targetUser.id,
          details: { targetClerkUserId },
        },
      });

      return NextResponse.json({ success: true, message: `${targetUser.email} is now an admin` });
    }

    if (action === "remove_admin") {
      await prisma.user.update({
        where: { clerkUserId: targetClerkUserId },
        data: { isAdmin: false },
      });
      
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: "USER_REMOVE_ADMIN",
          resourceType: "user",
          resourceId: targetUser.id,
          details: { targetClerkUserId },
        },
      });

      return NextResponse.json({ success: true, message: `${targetUser.email} is no longer an admin` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Set admin error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        plan: true,
        _count: {
          select: { files: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        plan: u.plan,
        planId: u.planId,
        planName: u.plan.displayName,
        storageGb: u.plan.storageGb,
        storageUsedBytes: Number(u.storageUsedBytes),
        storageUsedGb: Number(u.storageUsedBytes) / (1024 * 1024 * 1024),
        filesCount: u.filesCount,
        isSuspended: u.isSuspended,
        isAdmin: u.isAdmin,
        planExpiresAt: u.planExpiresAt?.toISOString() || null,
        adminNotes: u.adminNotes,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 });
  }
}

// PATCH - Update user (ban/unban/suspend)
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, action } = body;

    if (!targetUserId || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "suspend":
        updateData = { isSuspended: true };
        break;
      case "unsuspend":
        updateData = { isSuspended: false };
        break;
      case "make_admin":
        updateData = { isAdmin: true };
        break;
      case "remove_admin":
        updateData = { isAdmin: false };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: `USER_${action.toUpperCase()}`,
        resourceType: "user",
        resourceId: targetUserId,
        details: { targetUserId },
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
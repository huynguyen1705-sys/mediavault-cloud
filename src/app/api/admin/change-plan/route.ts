import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, planId, planExpiresAt, adminNotes } = body;

    if (!targetUserId || !planId) {
      return NextResponse.json(
        { error: "targetUserId and planId are required" },
        { status: 400 }
      );
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Update user plan
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        planId,
        planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
        adminNotes: adminNotes || null,
      },
      include: { plan: true },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "update_plan",
        resourceType: "user",
        resourceId: targetUserId,
        details: JSON.stringify({
          oldPlan: targetUser.planId,
          newPlan: planId,
          expiresAt: planExpiresAt,
          notes: adminNotes,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        planId: updatedUser.planId,
        planName: updatedUser.plan.name,
        planExpiresAt: updatedUser.planExpiresAt?.toISOString() || null,
        adminNotes: updatedUser.adminNotes,
      },
    });
  } catch (error) {
    console.error("Change plan error:", error);
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}
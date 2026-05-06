import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get or create user profile
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find or create user profile
    let userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { plan: true },
    });

    if (!userProfile) {
      // Create new user profile with free plan
      const freePlan = await prisma.plan.findUnique({
        where: { name: "free" },
      });

      if (!freePlan) {
        return NextResponse.json({ error: "Free plan not found" }, { status: 500 });
      }

      userProfile = await prisma.user.create({
        data: {
          clerkUserId: userId,
          email: user.emailAddresses[0]?.emailAddress || null,
          displayName: user.fullName || user.firstName || "User",
          avatarUrl: user.imageUrl || null,
          planId: freePlan.id,
        },
        include: { plan: true },
      });

      // Log new user
      await prisma.auditLog.create({
        data: {
          userId: userProfile.id,
          action: "USER_CREATED",
          resourceType: "user",
          resourceId: userProfile.id,
        },
      });
    }

    // Count active shares
    const totalShares = await prisma.share.count({
      where: {
        userId: userProfile.id,
      },
    });

    return NextResponse.json({
      user: {
        id: userProfile.id,
        email: userProfile.email,
        displayName: userProfile.displayName,
        avatarUrl: userProfile.avatarUrl,
        plan: {
          id: userProfile.plan.id,
          name: userProfile.plan.name,
          displayName: userProfile.plan.displayName,
          storageGb: userProfile.plan.storageGb,
          storageUsedGb: Number(userProfile.storageUsedBytes) / (1024 * 1024 * 1024),
          bandwidthGb: userProfile.plan.bandwidthGb,
          fileRetentionDays: userProfile.plan.fileRetentionDays,
        },
        filesCount: userProfile.filesCount,
        isAdmin: userProfile.isAdmin,
        isSuspended: userProfile.isSuspended,
      },
      totalShares,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
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
    const { displayName, avatarUrl } = body;

    const updated = await prisma.user.update({
      where: { id: userProfile.id },
      data: {
        ...(displayName && { displayName }),
        ...(avatarUrl && { avatarUrl }),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-user";

// GET - Get or create user profile
export async function GET(request: NextRequest) {
  try {
    const userProfile = await getOrCreateUser();
    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count active shares
    const totalShares = await prisma.share.count({
      where: { userId: userProfile.id },
    }).catch(() => 0);

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

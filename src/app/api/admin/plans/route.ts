import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - List all plans (admin only)
export async function GET(request: NextRequest) {
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

    const plans = await prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({
      plans: plans.map((p) => ({
        ...p,
        priceMonthly: Number(p.priceMonthly),
        userCount: p._count.users,
      })),
    });
  } catch (error) {
    console.error("Admin plans error:", error);
    return NextResponse.json({ error: "Failed to get plans" }, { status: 500 });
  }
}

// POST - Create a new plan (admin only)
export async function POST(request: NextRequest) {
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
    const {
      name,
      displayName,
      description,
      priceMonthly,
      storageGb,
      maxFileSizeMb,
      bandwidthGb,
      fileRetentionDays,
      allowDownload,
      allowShare,
      allowEmbed,
      isActive,
    } = body;

    if (!name || !displayName || priceMonthly === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        displayName,
        description,
        priceMonthly,
        storageGb,
        maxFileSizeMb,
        bandwidthGb,
        fileRetentionDays,
        allowDownload,
        allowShare,
        allowEmbed,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "PLAN_CREATED",
        resourceType: "plan",
        resourceId: plan.id,
        details: { name, displayName },
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}

// PATCH - Update a plan (admin only)
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
    const { planId, ...updateData } = body;

    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "PLAN_UPDATED",
        resourceType: "plan",
        resourceId: planId,
        details: updateData,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}
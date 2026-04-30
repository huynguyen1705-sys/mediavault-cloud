import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get current user's storage info
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { plan: true },
    });

    if (!user) {
      // Return default 1GB for free tier
      return NextResponse.json({
        usedBytes: 0,
        limitBytes: 1024 * 1024 * 1024, // 1GB
        plan: "free",
      });
    }

    // Get storage used
    const storageUsed = await prisma.file.aggregate({
      where: { 
        userId: user.id,
        deletedAt: null,
      },
      _sum: { fileSize: true },
    });

    // Get limit from plan (convert GB to bytes)
    let storageLimit = 1024 * 1024 * 1024; // 1GB default
    if (user.plan?.storageGb) {
      storageLimit = user.plan.storageGb * 1024 * 1024 * 1024;
    }

    return NextResponse.json({
      usedBytes: Number(storageUsed._sum.fileSize) || 0,
      limitBytes: storageLimit,
      plan: user.plan?.name || "free",
    });
  } catch (error) {
    console.error("Storage stats error:", error);
    return NextResponse.json({
      usedBytes: 0,
      limitBytes: 1024 * 1024 * 1024, // 1GB
      plan: "free",
    });
  }
}
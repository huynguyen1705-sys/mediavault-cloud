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
    });

    if (!user) {
      // User not found - return default values instead of 500
      return NextResponse.json({
        usedBytes: 0,
        limitBytes: 5 * 1024 * 1024 * 1024,
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

    // Default limit: 5GB for free tier
    const storageLimit = 5 * 1024 * 1024 * 1024;

    return NextResponse.json({
      usedBytes: Number(storageUsed._sum.fileSize) || 0,
      limitBytes: storageLimit,
      plan: "free",
    });
  } catch (error) {
    console.error("Storage stats error:", error);
    return NextResponse.json({
      usedBytes: 0,
      limitBytes: 5 * 1024 * 1024 * 1024,
      plan: "free",
      error: "Using default values"
    });
  }
}

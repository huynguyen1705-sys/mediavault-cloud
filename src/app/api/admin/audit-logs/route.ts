import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get audit logs
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const action = searchParams.get("action");
    const date = searchParams.get("date");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (date) {
      const now = new Date();
      if (date === "today") {
        where.createdAt = { gte: new Date(now.setHours(0, 0, 0, 0)) };
      } else if (date === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        where.createdAt = { gte: weekAgo };
      } else if (date === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        where.createdAt = { gte: monthAgo };
      }
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get logs with user info
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Audit logs error:", error);
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 });
  }
}
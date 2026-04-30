import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Auth required
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get internal user ID from Clerk userId
    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if admin - admins can see all logs
    const isAdmin = userProfile.isAdmin;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
    const action = searchParams.get("action");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const resourceType = searchParams.get("resourceType");

    const skip = (page - 1) * limit;

    // Build where clause - CRITICAL: filter by userId unless admin
    const where: Record<string, unknown> = {};

    // Non-admin users only see their own logs
    if (!isAdmin) {
      where.userId = userProfile.id;
    }

    if (action) {
      where.action = { contains: action, mode: "insensitive" };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo + "T23:59:59.999Z");
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { resourceType: { contains: search, mode: "insensitive" } },
      ];
    }
    if (resourceType) {
      where.resourceType = resourceType;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        details: l.details as Record<string, unknown> | null,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
        isAdmin: isAdmin,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[AuditLogs]", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
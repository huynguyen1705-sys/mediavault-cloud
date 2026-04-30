import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Daily user signups
    const dailySignups = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users_profile
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Daily storage growth
    const dailyStorage = await prisma.$queryRaw<Array<{ date: string; total: number }>>`
      SELECT DATE(uploaded_at) as date, SUM(size_bytes) as total
      FROM files
      WHERE uploaded_at >= ${thirtyDaysAgo}
      GROUP BY DATE(uploaded_at)
      ORDER BY date ASC
    `;

    // Daily bandwidth usage
    const dailyBandwidth = await prisma.$queryRaw<Array<{ date: string; total: number }>>`
      SELECT DATE(created_at) as date, SUM(bandwidth_bytes) as total
      FROM audit_logs
      WHERE created_at >= ${thirtyDaysAgo} AND action = 'file_download'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsers = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    // Plan distribution
    const planDistribution = await prisma.user.groupBy({
      by: ['planId'],
      _count: true,
    });

    const plansWithNames = await Promise.all(
      planDistribution.map(async (p) => {
        const plan = await prisma.plan.findUnique({ where: { id: p.planId } });
        return {
          name: plan?.displayName || 'Unknown',
          count: p._count,
        };
      })
    );

    // File type distribution
    const fileTypes = await prisma.$queryRaw<Array<{ type: string; count: number; size: number }>>`
      SELECT 
        CASE 
          WHEN mime_type LIKE 'image/%' THEN 'Images'
          WHEN mime_type LIKE 'video/%' THEN 'Videos'
          WHEN mime_type LIKE 'audio/%' THEN 'Audio'
          WHEN mime_type LIKE 'application/pdf' THEN 'Documents'
          ELSE 'Other'
        END as type,
        COUNT(*) as count,
        SUM(size_bytes) as size
      FROM files
      GROUP BY type
    `;

    return NextResponse.json({
      dailySignups: dailySignups.map(d => ({
        date: d.date,
        count: Number(d.count),
      })),
      dailyStorage: dailyStorage.map(d => ({
        date: d.date,
        total: Number(d.total),
      })),
      dailyBandwidth: dailyBandwidth.map(d => ({
        date: d.date,
        total: Number(d.total),
      })),
      activeUsers: activeUsers.length,
      planDistribution: plansWithNames,
      fileTypes: fileTypes.map(f => ({
        type: f.type,
        count: Number(f.count),
        size: Number(f.size),
      })),
    });
  } catch (error) {
    console.error("Admin charts error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
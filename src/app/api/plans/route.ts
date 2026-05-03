import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - Public plans listing (no auth required)
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        priceMonthly: true,
        storageGb: true,
        maxFileSizeMb: true,
        bandwidthGb: true,
        fileRetentionDays: true,
        allowDownload: true,
        allowShare: true,
        allowEmbed: true,
      },
    });

    return NextResponse.json({
      plans: plans.map((p) => ({
        ...p,
        priceMonthly: Number(p.priceMonthly),
      })),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Public plans error:", error);
    return NextResponse.json({ error: "Failed to get plans" }, { status: 500 });
  }
}

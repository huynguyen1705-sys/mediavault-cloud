import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { plan: true },
    });

    return NextResponse.json({
      clerkUserId,
      userRecord: userRecord ? {
        id: userRecord.id,
        email: userRecord.email,
        planId: userRecord.planId,
        planName: userRecord.plan?.name,
        storageGb: userRecord.plan?.storageGb,
      } : null
    });
  } catch (error) {
    console.error("[Debug]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

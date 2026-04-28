import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - Get embed domains for current user
export async function GET(request: NextRequest) {
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

    const domains = await prisma.embedDomain.findMany({
      where: { userId: userProfile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Get embed domains error:", error);
    return NextResponse.json({ error: "Failed to get domains" }, { status: 500 });
  }
}

// POST - Add a new embed domain
export async function POST(request: NextRequest) {
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
    const { domain } = body;

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    // Check if plan allows embed
    const userWithPlan = await prisma.user.findUnique({
      where: { id: userProfile.id },
      include: { plan: true },
    });

    if (!userWithPlan?.plan.allowEmbed) {
      return NextResponse.json({ error: "Your plan does not support embed domains" }, { status: 403 });
    }

    // Check if domain already exists
    const existing = await prisma.embedDomain.findFirst({
      where: { domain, userId: userProfile.id },
    });

    if (existing) {
      return NextResponse.json({ error: "Domain already exists" }, { status: 409 });
    }

    const newDomain = await prisma.embedDomain.create({
      data: {
        userId: userProfile.id,
        domain,
      },
    });

    return NextResponse.json({ success: true, domain: newDomain });
  } catch (error) {
    console.error("Create embed domain error:", error);
    return NextResponse.json({ error: "Failed to create domain" }, { status: 500 });
  }
}

// DELETE - Remove an embed domain
export async function DELETE(request: NextRequest) {
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
    const { domainId } = body;

    if (!domainId) {
      return NextResponse.json({ error: "Domain ID is required" }, { status: 400 });
    }

    await prisma.embedDomain.delete({
      where: { id: domainId, userId: userProfile.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete embed domain error:", error);
    return NextResponse.json({ error: "Failed to delete domain" }, { status: 500 });
  }
}
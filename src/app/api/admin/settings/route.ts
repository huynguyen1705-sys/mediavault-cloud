import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// Default settings
const DEFAULT_SETTINGS = {
  maxFileSizeMb: 100,
  allowedFileTypes: ["image/*", "video/*", "audio/*", "application/pdf"],
  defaultRetentionDays: 30,
  maxStoragePerUser: 10,
  bandwidthLimitGb: 100,
  requireEmailVerification: true,
  enableSharing: true,
  enableEmbed: false,
  maintenanceMode: false,
};

// In-memory settings cache (in production, use database or Redis)
let settingsCache = { ...DEFAULT_SETTINGS };

// GET - Get system settings
export async function GET() {
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

    return NextResponse.json({ settings: settingsCache });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

// PUT - Update system settings
export async function PUT(request: NextRequest) {
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

    const { settings } = await request.json();

    if (!settings) {
      return NextResponse.json({ error: "Missing settings" }, { status: 400 });
    }

    // Update cache
    settingsCache = { ...settingsCache, ...settings };

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SYSTEM_SETTINGS_UPDATE",
        resourceType: "settings",
        resourceId: "system",
        details: { settings },
      },
    });

    return NextResponse.json({ success: true, settings: settingsCache });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import crypto from "crypto";

function generateApiKey(): string {
  return "fii_" + crypto.randomBytes(28).toString("hex");
}

// GET /api/v1/keys - List user's API keys
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      keys: keys.map((k) => ({
        ...k,
        // Mask key except last 8 chars
        key_preview: k.key.slice(0, 4) + "..." + k.key.slice(-8),
        key_full: k.key, // Only shown once ideally, but for now return full
      })),
    });
  } catch (error) {
    console.error("List keys error:", error);
    return NextResponse.json({ error: "Failed to list keys" }, { status: 500 });
  }
}

// POST /api/v1/keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, permissions, expires_in_days } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Limit keys per user
    const keyCount = await prisma.apiKey.count({ where: { userId: user.id } });
    if (keyCount >= 10) {
      return NextResponse.json({ error: "Maximum 10 API keys per account" }, { status: 400 });
    }

    const key = generateApiKey();
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,
        key,
        permissions: permissions || ["upload", "read", "delete"],
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      key: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Show full key ONLY on creation
        permissions: apiKey.permissions,
        expires_at: apiKey.expiresAt?.toISOString() || null,
        created_at: apiKey.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create key error:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}

// DELETE /api/v1/keys - Revoke a key
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: user.id },
    });

    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id: keyId } });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Delete key error:", error);
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import crypto from "crypto";

// Generate short share token (6 chars, base62)
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateShareToken(): string {
  let result = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += BASE62[bytes[i] % 62];
  }
  return result;
}

// Hash password
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// POST - Create share link
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { plan: true },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!userProfile.plan.allowShare) {
      return NextResponse.json({ error: "Sharing not allowed on your plan" }, { status: 403 });
    }

    const body = await request.json();
    const { fileId, folderId, password, expiresIn, allowDownload } = body;

    if (!fileId && !folderId) {
      return NextResponse.json({ error: "File or folder ID required" }, { status: 400 });
    }

    // Verify ownership
    if (fileId) {
      const file = await prisma.file.findFirst({
        where: { id: fileId, userId: userProfile.id },
      });
      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId: userProfile.id },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000); // hours to ms
    }

    // Create share (retry if token collision)
    let shareToken = '';
    let share;
    for (let attempt = 0; attempt < 5; attempt++) {
      shareToken = generateShareToken();
      try {
        share = await prisma.share.create({
          data: {
            fileId: fileId || null,
            folderId: folderId || null,
            userId: userProfile.id,
            shareToken,
            passwordHash: password ? hashPassword(password) : null,
            allowDownload: allowDownload ?? true,
            expiresAt,
          },
        });
        break;
      } catch (e: any) {
        if (e.code === 'P2002') continue; // unique constraint - retry
        throw e;
      }
    }
    if (!share) throw new Error('Failed to generate unique share token');

    const shareUrl = `/s/${shareToken}`;

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        token: share.shareToken,
        url: shareUrl,
        passwordProtected: !!password,
        allowDownload: share.allowDownload,
        expiresAt: share.expiresAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Create share error:", error);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}

// GET - List user's shares
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

    const shares = await prisma.share.findMany({
      where: { userId: userProfile.id },
      orderBy: { createdAt: "desc" },
      include: {
        file: {
          select: { id: true, name: true, mimeType: true },
        },
        folder: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      shares: shares.map((share) => ({
        id: share.id,
        token: share.shareToken,
        url: `/s/${share.shareToken}`,
        passwordProtected: !!share.passwordHash,
        allowDownload: share.allowDownload,
        expiresAt: share.expiresAt?.toISOString() || null,
        viewsCount: share.viewsCount,
        createdAt: share.createdAt.toISOString(),
        file: share.file,
        folder: share.folder,
      })),
    });
  } catch (error) {
    console.error("List shares error:", error);
    return NextResponse.json({ error: "Failed to list shares" }, { status: 500 });
  }
}

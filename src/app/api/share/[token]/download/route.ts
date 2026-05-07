import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import crypto from "crypto";

function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const inputHash = crypto.createHash("sha256").update(inputPassword).digest("hex");
  return inputHash === storedHash;
}

// GET - Download shared file via proxy (no CORS issues)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");

    // Find share
    const share = await prisma.share.findUnique({
      where: { shareToken: token },
      include: {
        file: true,
      },
    });

    if (!share || !share.file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }

    // Check download permission
    if (!share.allowDownload) {
      return NextResponse.json({ error: "Download not allowed" }, { status: 403 });
    }

    // Verify password if required
    if (share.passwordHash) {
      if (!password || !verifyPassword(password, share.passwordHash)) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // Get presigned URL and proxy the file
    const file = share.file;
    if (!file.storagePath) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    // Track download
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip") || "unknown";
    const ua = request.headers.get("user-agent") || "";
    prisma.$transaction([
      prisma.share.update({ where: { id: share.id }, data: { downloadsCount: { increment: 1 } } }),
      prisma.shareView.create({
        data: {
          shareId: share.id,
          ipAddress: ip !== "unknown" ? ip : null,
          userAgent: ua.slice(0, 500),
          action: "download",
        },
      }),
    ]).catch(() => {});

    const presignedUrl = await getPresignedUrl(file.storagePath, 300);
    const fileRes = await fetch(presignedUrl);

    if (!fileRes.ok) {
      return NextResponse.json({ error: "Download failed" }, { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", file.mimeType || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
    if (fileRes.headers.get("content-length")) {
      headers.set("Content-Length", fileRes.headers.get("content-length")!);
    }

    return new NextResponse(fileRes.body, { status: 200, headers });
  } catch (error) {
    console.error("Share download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

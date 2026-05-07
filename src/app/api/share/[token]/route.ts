import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import crypto from "crypto";

function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const inputHash = crypto.createHash("sha256").update(inputPassword).digest("hex");
  return inputHash === storedHash;
}

// Parse user-agent into browser/os/device
function parseUA(ua: string) {
  let browser = "Unknown", os = "Unknown", device = "Desktop";

  // Browser
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && ua.includes("Safari/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "IE";

  // OS
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Device
  if (ua.includes("Mobile") || ua.includes("iPhone") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) device = "Tablet";

  return { browser, os, device };
}

// GET - Access shared file/folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");

    const share = await prisma.share.findUnique({
      where: { shareToken: token },
      include: {
        file: true,
        folder: true,
        user: { select: { id: true, displayName: true } },
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    if (share.passwordHash) {
      if (!password) {
        return NextResponse.json({ requiresPassword: true, error: "Password required" }, { status: 401 });
      }
      if (!verifyPassword(password, share.passwordHash)) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // --- Track visitor ---
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const ua = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || null;
    const { browser, os, device } = parseUA(ua);

    // Geo lookup via ip-api.com (free, no key needed, ~45 req/min)
    let country: string | null = null, city: string | null = null, region: string | null = null, isp: string | null = null;
    try {
      if (ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,regionName,isp`, {
          signal: AbortSignal.timeout(2000),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          country = geo.country || null;
          city = geo.city || null;
          region = geo.regionName || null;
          isp = geo.isp || null;
        }
      }
    } catch { /* geo lookup failed, continue */ }

    // Increment views + log view (non-blocking)
    prisma.$transaction([
      prisma.share.update({
        where: { id: share.id },
        data: { viewsCount: { increment: 1 } },
      }),
      prisma.shareView.create({
        data: {
          shareId: share.id,
          ipAddress: ip !== "unknown" ? ip : null,
          country, city, region, isp,
          userAgent: ua.slice(0, 500),
          browser, os, device,
          referer: referer?.slice(0, 500) || null,
          action: "view",
        },
      }),
    ]).catch(() => { /* best-effort */ });

    // --- Get download count ---
    const downloadCount = await prisma.shareView.count({
      where: { shareId: share.id, action: "download" },
    });

    // --- Return file data ---
    if (share.file) {
      const file = share.file;
      const presignedUrl = file.storagePath
        ? await getPresignedUrl(file.storagePath, 3600)
        : null;

      return NextResponse.json({
        type: "file",
        name: file.name,
        mimeType: file.mimeType,
        fileSize: file.fileSize.toString(),
        url: presignedUrl,
        allowDownload: share.allowDownload,
        owner: share.user.displayName,
        createdAt: file.createdAt.toISOString(),
        // Analytics
        viewsCount: share.viewsCount + 1,
        downloadsCount: downloadCount,
        // Metadata (EXIF, camera, dimensions, etc.)
        metadata: file.metadata || null,
        // Visitor info
        visitor: { ip: ip !== "unknown" ? ip : null, country, city, region, isp, browser, os, device },
      });
    }

    if (share.folder) {
      const [files, subfolders] = await Promise.all([
        prisma.file.findMany({
          where: { folderId: share.folderId },
          select: { id: true, name: true, mimeType: true, fileSize: true },
        }),
        prisma.folder.findMany({
          where: { parentId: share.folderId },
          select: { id: true, name: true },
        }),
      ]);

      return NextResponse.json({
        type: "folder",
        name: share.folder.name,
        files: files.map(f => ({ ...f, fileSize: f.fileSize.toString() })),
        folders: subfolders,
        allowDownload: share.allowDownload,
        owner: share.user.displayName,
        viewsCount: share.viewsCount + 1,
        downloadsCount: downloadCount,
      });
    }

    return NextResponse.json({ error: "Invalid share" }, { status: 400 });
  } catch (error) {
    console.error("Access share error:", error);
    return NextResponse.json({ error: "Failed to access share" }, { status: 500 });
  }
}

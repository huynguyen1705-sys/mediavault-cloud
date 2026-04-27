import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import crypto from "crypto";

// Verify password
function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const inputHash = crypto.createHash("sha256").update(inputPassword).digest("hex");
  return inputHash === storedHash;
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

    // Find share
    const share = await prisma.share.findUnique({
      where: { shareToken: token },
      include: {
        file: true,
        folder: true,
        user: {
          select: { id: true, displayName: true },
        },
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    // Verify password if required
    if (share.passwordHash) {
      if (!password) {
        return NextResponse.json({ 
          requiresPassword: true,
          error: "Password required" 
        }, { status: 401 });
      }
      if (!verifyPassword(password, share.passwordHash)) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // Increment views count
    await prisma.share.update({
      where: { id: share.id },
      data: { viewsCount: { increment: 1 } },
    });

    // Return file/folder data
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
      });
    }

    if (share.folder) {
      // Get folder contents
      const [files, subfolders] = await Promise.all([
        prisma.file.findMany({
          where: { folderId: share.folderId },
          select: {
            id: true,
            name: true,
            mimeType: true,
            fileSize: true,
          },
        }),
        prisma.folder.findMany({
          where: { parentId: share.folderId },
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

      return NextResponse.json({
        type: "folder",
        name: share.folder.name,
        files: files.map((f) => ({
          ...f,
          fileSize: f.fileSize.toString(),
        })),
        folders: subfolders,
        allowDownload: share.allowDownload,
        owner: share.user.displayName,
      });
    }

    return NextResponse.json({ error: "Invalid share" }, { status: 400 });
  } catch (error) {
    console.error("Access share error:", error);
    return NextResponse.json({ error: "Failed to access share" }, { status: 500 });
  }
}

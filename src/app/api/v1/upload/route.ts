import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { uploadToR2, generateFileKey, getPublicUrl } from "@/lib/r2";
import prisma from "@/lib/db";
import crypto from "crypto";

function generateShareToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

// POST /api/v1/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { message: "Invalid or missing API key", code: 401 },
      }, { status: 401 });
    }

    if (!user.permissions.includes("upload")) {
      return NextResponse.json({
        success: false,
        error: { message: "API key does not have upload permission", code: 403 },
      }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer;
    let fileName: string = "upload";
    let mimeType: string = "application/octet-stream";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") || formData.get("file");
      const nameParam = formData.get("name");

      if (!file || !(file instanceof File)) {
        return NextResponse.json({
          success: false,
          error: { message: "No file provided. Use 'image' or 'file' field.", code: 400 },
        }, { status: 400 });
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileName = (nameParam as string) || file.name || "upload";
      mimeType = file.type || "application/octet-stream";
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      const { image, name } = body;

      if (!image) {
        return NextResponse.json({
          success: false,
          error: { message: "No image data provided. Use base64 'image' field.", code: 400 },
        }, { status: 400 });
      }

      // Handle base64 data
      const base64Data = image.replace(/^data:[^;]+;base64,/, "");
      fileBuffer = Buffer.from(base64Data, "base64");
      fileName = name || "upload.png";

      // Detect mime from data URI
      const mimeMatch = image.match(/^data:([^;]+);base64,/);
      mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    } else {
      return NextResponse.json({
        success: false,
        error: { message: "Unsupported content type. Use multipart/form-data or application/json.", code: 400 },
      }, { status: 400 });
    }

    // Check file size (plan limits)
    const plan = await prisma.plan.findUnique({ where: { id: user.planId } });
    if (plan && fileBuffer.length > plan.maxFileSizeMb * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: { message: `File exceeds max size limit (${plan.maxFileSizeMb} MB)`, code: 413 },
      }, { status: 413 });
    }

    // Upload to R2
    const fileKey = generateFileKey(user.id, fileName);
    await uploadToR2(fileBuffer, fileKey, mimeType);

    // Generate share token
    let shareToken = "";
    for (let i = 0; i < 5; i++) {
      shareToken = generateShareToken();
      const existing = await prisma.share.findUnique({ where: { shareToken } });
      if (!existing) break;
    }

    // Save to database
    const file = await prisma.file.create({
      data: {
        name: fileName,
        storagePath: fileKey,
        mimeType,
        fileSize: BigInt(fileBuffer.length),
        userId: user.id,
        thumbnailPath: null,
        thumbnailStatus: mimeType.startsWith("image/") || mimeType.startsWith("video/") ? "pending" : "not_applicable",
      },
    });

    // Create share link
    await prisma.share.create({
      data: {
        fileId: file.id,
        userId: user.id,
        shareToken,
        allowDownload: true,
      },
    });

    // Update storage used
    await prisma.user.update({
      where: { id: user.id },
      data: { storageUsedBytes: { increment: BigInt(fileBuffer.length) } },
    });

    const publicUrl = getPublicUrl(fileKey);
    const shareUrl = `https://fii.one/s/${shareToken}`;

    return NextResponse.json({
      success: true,
      data: {
        id: file.id,
        title: fileName,
        url: publicUrl,
        direct_link: publicUrl,
        share_url: shareUrl,
        delete_url: `https://fii.one/api/v1/files/${file.id}`,
        size: fileBuffer.length,
        mime: mimeType,
        created_at: file.createdAt.toISOString(),
      },
    }, { status: 200 });
  } catch (error) {
    console.error("API v1 upload error:", error);
    return NextResponse.json({
      success: false,
      error: { message: "Upload failed", code: 500 },
    }, { status: 500 });
  }
}

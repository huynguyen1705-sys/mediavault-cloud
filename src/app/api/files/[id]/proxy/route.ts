import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Use R2 API directly for better compatibility
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { storagePath: true, mimeType: true, name: true }
    });

    if (!file || !file.storagePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Use R2 API URL (S3-compatible)
    const r2Url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${file.storagePath}`;

    // Create signed URL for R2 access (or use public URL if available)
    const response = await fetch(r2Url, {
      headers: {
        'Authorization': `Bearer ${process.env.R2_SECRET_ACCESS_KEY}`,
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.status}` }, { status: 500 });
    }

    // Stream the response directly
    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": data.byteLength.toString(),
        "Content-Disposition": `inline; filename="${file.name || "file"}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

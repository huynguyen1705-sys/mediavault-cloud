import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Proxy endpoint to fetch files from R2 without CORS issues
// No auth required - this is an internal API endpoint
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

    // Use public R2 URL - no auth needed for public bucket
    const r2Url = `${process.env.R2_PUBLIC_URL}/${file.storagePath}`;

    // Fetch the file from R2
    const response = await fetch(r2Url);

    if (!response.ok) {
      console.error('R2 fetch failed:', response.status, r2Url);
      return NextResponse.json({ error: `Failed to fetch: ${response.status}` }, { status: 500 });
    }

    // Get the blob
    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": blob.size.toString(),
        "Content-Disposition": `inline; filename="${file.name || "file"}"`,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

/**
 * POST /api/upload
 * DEPRECATED - All uploads now use presigned URL flow:
 * 1. GET /api/upload-url → get presigned URL
 * 2. PUT to presigned URL → upload to R2 directly
 * 3. POST /api/upload/confirm → save metadata + generate thumbnail
 *
 * This route exists only as a fallback redirect.
 */
export async function POST() {
  return NextResponse.json(
    { 
      error: "Direct upload disabled. Use presigned URL flow: GET /api/upload-url → PUT to R2 → POST /api/upload/confirm",
      redirect: "/api/upload-url"
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use GET /api/upload-url" },
    { status: 405 }
  );
}

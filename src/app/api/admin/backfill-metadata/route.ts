import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getPresignedUrl } from "@/lib/r2";
import { extractMetadata } from "@/lib/metadata";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * POST /api/admin/backfill-metadata
 * Re-extracts metadata for all files that don't have it yet.
 * Admin only. Processes in batches.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = Math.min(body.limit || 10, 50); // Max 50 per batch

    // Find files without metadata
    const files = await prisma.file.findMany({
      where: {
        metadata: { equals: Prisma.DbNull },
        deletedAt: null,
        storagePath: { not: null },
      },
      select: {
        id: true,
        storagePath: true,
        mimeType: true,
        name: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (files.length === 0) {
      return NextResponse.json({ message: "All files already have metadata", processed: 0 });
    }

    let processed = 0;
    let errors = 0;
    const results: { name: string; status: string }[] = [];

    for (const file of files) {
      const tempDir = os.tmpdir();
      const ext = path.extname(file.storagePath || file.name) || ".tmp";
      const tempFile = path.join(tempDir, `backfill_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);

      try {
        // Download from R2
        const downloadUrl = await getPresignedUrl(file.storagePath!, 300);
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(tempFile, buffer);

        // Extract metadata
        const metadata = await extractMetadata(tempFile, file.mimeType || "application/octet-stream");

        // Update DB
        if (Object.keys(metadata).length > 0) {
          await prisma.file.update({
            where: { id: file.id },
            data: { metadata: metadata as any },
          });
        }

        processed++;
        results.push({ name: file.name, status: "ok" });
      } catch (err: any) {
        errors++;
        results.push({ name: file.name, status: `error: ${err.message}` });
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    }

    // Count remaining
    const remaining = await prisma.file.count({
      where: { metadata: { equals: Prisma.DbNull }, deletedAt: null, storagePath: { not: null } },
    });

    return NextResponse.json({
      processed,
      errors,
      remaining,
      results,
    });
  } catch (error) {
    console.error("Backfill metadata error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import archiver from "archiver";
import { Readable } from "stream";

// POST - Download multiple files as ZIP
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { fileIds } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "No files selected" }, { status: 400 });
    }

    // Fetch files from database
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: userProfile.id,
        deletedAt: null,
      },
    });

    if (files.length === 0) {
      return NextResponse.json({ error: "No valid files found" }, { status: 404 });
    }

    // Create archive
    const archive = archiver("zip", {
      zlib: { level: 5 }, // Compression level
    });

    // Create a readable stream from the archive
    const archiveStream = new ReadableStream({
      async start(controller) {
        archive.on("data", (chunk) => {
          controller.enqueue(chunk);
        });

        archive.on("end", () => {
          controller.close();
        });

        archive.on("error", (err) => {
          controller.error(err);
        });

        // Add files to archive
        for (const file of files) {
          if (!file.storagePath) continue;

          try {
            // Get presigned URL for file
            const presignedUrl = await getPresignedUrl(file.storagePath);

            // Fetch file content
            const response = await fetch(presignedUrl);
            if (!response.ok) {
              console.error(`Failed to fetch file ${file.name}: ${response.status}`);
              continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Sanitize filename - remove problematic characters
            const safeName = file.name.replace(/[\/\\:*?"<>|]/g, "_");

            archive.append(buffer, { name: safeName });
          } catch (error) {
            console.error(`Error adding file ${file.name} to archive:`, error);
          }
        }

        archive.finalize();
      },
    });

    // Generate ZIP filename
    const zipName = files.length === 1
      ? `${files[0].name.replace(/\.[^.]+$/, "")}.zip`
      : `fii-one-download-${Date.now()}.zip`;

    // Return streaming response
    return new Response(archiveStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Download ZIP error:", error);
    return NextResponse.json({ error: "Failed to create ZIP" }, { status: 500 });
  }
}

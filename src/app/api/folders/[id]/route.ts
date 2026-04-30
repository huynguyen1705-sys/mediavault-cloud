import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import archiver from "archiver";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// GET - Get single folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const folder = await prisma.folder.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("Get folder error:", error);
    return NextResponse.json({ error: "Failed to get folder" }, { status: 500 });
  }
}

// PATCH - Update folder (rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    // Verify folder ownership
    const existingFolder = await prisma.folder.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Update folder
    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        ...(name && { name }),
      },
    });

    return NextResponse.json({ success: true, folder: updatedFolder });
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

// DELETE - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: { id, userId: userProfile.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Delete folder (cascades to child folders and files via Prisma)
    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete folder error:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}

// POST - Download folder as ZIP
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { folderId } = body;

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID required" }, { status: 400 });
    }

    // Verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: userProfile.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Get all files in folder and subfolders recursively
    const getFilesInFolder = async (parentId: string): Promise<any[]> => {
      const files = await prisma.file.findMany({
        where: { folderId: parentId, deletedAt: null },
        select: { name: true, storagePath: true, mimeType: true, fileSize: true },
      });

      const subfolders = await prisma.folder.findMany({
        where: { parentId },
        select: { id: true, name: true },
      });

      let allFiles = [...files];
      for (const sub of subfolders) {
        const subFiles = await getFilesInFolder(sub.id);
        allFiles = allFiles.concat(subFiles);
      }

      return allFiles;
    };

    const files = await getFilesInFolder(folderId);

    if (files.length === 0) {
      return NextResponse.json({ error: "Folder is empty" }, { status: 400 });
    }

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 5 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => chunks.push(chunk));

    // Add files to archive
    for (const file of files) {
      if (file.storagePath) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: file.storagePath,
          });

          const response = await s3.send(command);
          const stream = response.Body as Readable;

          // Convert stream to buffer using Node.js buffer
          const streamObj = stream as any;
          const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            streamObj.on("data", (chunk: Buffer) => chunks.push(chunk));
            streamObj.on("end", () => resolve(Buffer.concat(chunks)));
            streamObj.on("error", reject);
          });
          archive.append(fileBuffer, { name: file.name });
        } catch (err) {
          console.error(`Failed to fetch file ${file.name}:`, err);
          // Skip file if not found in storage
        }
      }
    }

    await archive.finalize();

    const zipBuffer = Buffer.concat(chunks);
    const sanitizedName = folder.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    const zipFileName = `${sanitizedName}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download folder error:", error);
    return NextResponse.json({ error: "Failed to download folder" }, { status: 500 });
  }
}

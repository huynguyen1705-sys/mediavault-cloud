import { exec } from "child_process";
import { promisify } from "util";
import { uploadToR2, getPresignedUrl } from "./r2";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

// Thumbnail settings
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;
const THUMBNAIL_QUALITY = 85;

interface ThumbnailResult {
  success: boolean;
  thumbnailKey?: string;
  thumbnailUrl?: string;
  error?: string;
}

// Generate thumbnail for video files
export async function generateVideoThumbnail(
  videoBuffer: Buffer,
  mimeType: string
): Promise<ThumbnailResult> {
  const tempInput = `/tmp/video_${uuidv4()}.mp4`;
  const tempOutput = `/tmp/thumb_${uuidv4()}.jpg`;

  try {
    // Write video to temp file
    const fs = await import("fs/promises");
    await fs.writeFile(tempInput, videoBuffer);

    // Generate thumbnail using ffmpeg
    const ffmpegCmd = `ffmpeg -i ${tempInput} -ss 00:00:01 -vframes 1 -vf "scale=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:force_original_aspect_ratio=decrease,pad=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black" -q:v ${THUMBNAIL_QUALITY} -y ${tempOutput}`;

    await execAsync(ffmpegCmd);

    // Read thumbnail
    const thumbnailBuffer = await fs.readFile(tempOutput);

    // Upload thumbnail to R2
    const thumbnailKey = `thumbnails/${uuidv4()}.jpg`;
    const { key, url } = await uploadToR2(thumbnailBuffer, thumbnailKey, "image/jpeg");

    return {
      success: true,
      thumbnailKey: key,
      thumbnailUrl: url,
    };
  } catch (error: any) {
    console.error("Thumbnail generation error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate thumbnail",
    };
  } finally {
    // Cleanup temp files
    try {
      const fs = await import("fs/promises");
      await fs.unlink(tempInput).catch(() => {});
      await fs.unlink(tempOutput).catch(() => {});
    } catch {}
  }
}

// Generate waveform placeholder for audio (returns a simple colored image)
export async function generateAudioThumbnail(
  audioBuffer: Buffer,
  mimeType: string
): Promise<ThumbnailResult> {
  // For audio, we'll create a simple placeholder using ImageMagick or just return a default
  // For now, return a success with no thumbnail - audio files typically show an icon
  return {
    success: false,
    error: "Audio thumbnail not implemented - using icon",
  };
}

// Main function to generate thumbnail based on file type
export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string
): Promise<ThumbnailResult> {
  if (mimeType.startsWith("video/")) {
    return generateVideoThumbnail(buffer, mimeType);
  } else if (mimeType.startsWith("audio/")) {
    return generateAudioThumbnail(buffer, mimeType);
  }

  return {
    success: false,
    error: "Unsupported file type for thumbnail",
  };
}

// Check if file type supports thumbnail
export function supportsThumbnail(mimeType: string): boolean {
  const supportedTypes = [
    "video/",
    "audio/",
    "image/",
  ];
  return supportedTypes.some((type) => mimeType.startsWith(type));
}

// Get appropriate icon class for file type (for UI display)
export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("pdf")) return "file-text";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "archive";
  return "file";
}

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const execAsync = promisify(exec);

export interface FileMetadata {
  // General
  hash?: string; // SHA-256
  md5?: string;

  // Image
  width?: number;
  height?: number;
  aspectRatio?: string;
  dpi?: number;
  bitDepth?: number;
  colorSpace?: string;
  colorProfile?: string;
  compression?: string;
  orientation?: string;
  hdr?: boolean;

  // Camera/EXIF
  camera?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  focalLength35mm?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  exposureMode?: string;
  meteringMode?: string;
  whiteBalance?: string;
  flash?: string;
  focusMode?: string;
  dateTaken?: string;
  software?: string;
  artist?: string;
  copyright?: string;

  // GPS
  gps?: {
    lat: number;
    lng: number;
    altitude?: number;
  };

  // Video
  duration?: number; // seconds
  fps?: number;
  videoBitrate?: number;
  videoCodec?: string;
  videoProfile?: string;
  audioCodec?: string;
  audioBitrate?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  audioLanguage?: string;
  containerFormat?: string;
  rotation?: number;
  hdrFormat?: string;
  subtitleTracks?: number;
  chapterCount?: number;
  creationTool?: string;

  // Audio (music)
  title?: string;
  albumArtist?: string;
  album?: string;
  year?: number;
  genre?: string;
  trackNumber?: string;
  discNumber?: string;
  composer?: string;
  bpm?: number;
  encoder?: string;
  hasAlbumArt?: boolean;

  // Document
  pageCount?: number;
  author?: string;
  documentTitle?: string;
  subject?: string;
  keywords?: string[];
  creatorApp?: string;
  pdfVersion?: string;
  encrypted?: boolean;
}

/**
 * Extract comprehensive metadata from a file using ffprobe + exiftool
 */
export async function extractMetadata(filePath: string, mimeType: string): Promise<FileMetadata> {
  const metadata: FileMetadata = {};

  try {
    // Calculate file hash
    const hashPromise = calculateHash(filePath);

    // Run extractors in parallel
    const [hash, ffprobeData, exifData] = await Promise.all([
      hashPromise,
      extractFfprobe(filePath, mimeType).catch(() => null),
      extractExiftool(filePath).catch(() => null),
    ]);

    metadata.hash = hash.sha256;
    metadata.md5 = hash.md5;

    // Merge ffprobe data
    if (ffprobeData) {
      Object.assign(metadata, ffprobeData);
    }

    // Merge exiftool data (higher priority for EXIF/camera data)
    if (exifData) {
      // Only override if exifData has the value
      if (exifData.width) metadata.width = exifData.width;
      if (exifData.height) metadata.height = exifData.height;
      if (exifData.camera) metadata.camera = exifData.camera;
      if (exifData.cameraModel) metadata.cameraModel = exifData.cameraModel;
      if (exifData.lens) metadata.lens = exifData.lens;
      if (exifData.focalLength) metadata.focalLength = exifData.focalLength;
      if (exifData.focalLength35mm) metadata.focalLength35mm = exifData.focalLength35mm;
      if (exifData.iso) metadata.iso = exifData.iso;
      if (exifData.shutterSpeed) metadata.shutterSpeed = exifData.shutterSpeed;
      if (exifData.aperture) metadata.aperture = exifData.aperture;
      if (exifData.exposureMode) metadata.exposureMode = exifData.exposureMode;
      if (exifData.meteringMode) metadata.meteringMode = exifData.meteringMode;
      if (exifData.whiteBalance) metadata.whiteBalance = exifData.whiteBalance;
      if (exifData.flash) metadata.flash = exifData.flash;
      if (exifData.focusMode) metadata.focusMode = exifData.focusMode;
      if (exifData.dateTaken) metadata.dateTaken = exifData.dateTaken;
      if (exifData.software) metadata.software = exifData.software;
      if (exifData.artist) metadata.artist = exifData.artist;
      if (exifData.copyright) metadata.copyright = exifData.copyright;
      if (exifData.gps) metadata.gps = exifData.gps;
      if (exifData.dpi) metadata.dpi = exifData.dpi;
      if (exifData.bitDepth) metadata.bitDepth = exifData.bitDepth;
      if (exifData.colorSpace) metadata.colorSpace = exifData.colorSpace;
      if (exifData.colorProfile) metadata.colorProfile = exifData.colorProfile;
      if (exifData.orientation) metadata.orientation = exifData.orientation;
      if (exifData.hdr !== undefined) metadata.hdr = exifData.hdr;
      // Audio tags from exiftool (ID3)
      if (exifData.title) metadata.title = exifData.title;
      if (exifData.albumArtist) metadata.albumArtist = exifData.albumArtist;
      if (exifData.album) metadata.album = exifData.album;
      if (exifData.year) metadata.year = exifData.year;
      if (exifData.genre) metadata.genre = exifData.genre;
      if (exifData.trackNumber) metadata.trackNumber = exifData.trackNumber;
      if (exifData.discNumber) metadata.discNumber = exifData.discNumber;
      if (exifData.composer) metadata.composer = exifData.composer;
      if (exifData.bpm) metadata.bpm = exifData.bpm;
      if (exifData.encoder) metadata.encoder = exifData.encoder;
      if (exifData.hasAlbumArt !== undefined) metadata.hasAlbumArt = exifData.hasAlbumArt;
      // Document
      if (exifData.pageCount) metadata.pageCount = exifData.pageCount;
      if (exifData.author) metadata.author = exifData.author;
      if (exifData.documentTitle) metadata.documentTitle = exifData.documentTitle;
      if (exifData.subject) metadata.subject = exifData.subject;
      if (exifData.keywords) metadata.keywords = exifData.keywords;
      if (exifData.creatorApp) metadata.creatorApp = exifData.creatorApp;
      if (exifData.pdfVersion) metadata.pdfVersion = exifData.pdfVersion;
      if (exifData.encrypted !== undefined) metadata.encrypted = exifData.encrypted;
    }

    // Calculate aspect ratio
    if (metadata.width && metadata.height) {
      metadata.aspectRatio = calculateAspectRatio(metadata.width, metadata.height);
    }

  } catch (err) {
    console.error("Metadata extraction error:", err);
  }

  // Remove undefined/null values
  return cleanMetadata(metadata);
}

/**
 * Calculate SHA-256 and MD5 hash of file
 */
async function calculateHash(filePath: string): Promise<{ sha256: string; md5: string }> {
  return new Promise((resolve, reject) => {
    const sha256 = crypto.createHash("sha256");
    const md5 = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => {
      sha256.update(chunk);
      md5.update(chunk);
    });
    stream.on("end", () => {
      resolve({
        sha256: sha256.digest("hex"),
        md5: md5.digest("hex"),
      });
    });
    stream.on("error", reject);
  });
}

/**
 * Extract metadata via ffprobe (best for video/audio streams)
 */
async function extractFfprobe(filePath: string, mimeType: string): Promise<Partial<FileMetadata> | null> {
  const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams -show_chapters "${filePath}"`;
  const { stdout } = await execAsync(cmd, { timeout: 30000 });
  const data = JSON.parse(stdout);

  const result: Partial<FileMetadata> = {};
  const streams = data.streams || [];
  const format = data.format || {};
  const chapters = data.chapters || [];

  // Find video and audio streams
  const videoStream = streams.find((s: any) => s.codec_type === "video" && s.codec_name !== "mjpeg");
  const audioStream = streams.find((s: any) => s.codec_type === "audio");
  const subtitleStreams = streams.filter((s: any) => s.codec_type === "subtitle");

  // Video/Image dimensions
  if (videoStream) {
    result.width = videoStream.width;
    result.height = videoStream.height;
    result.videoCodec = videoStream.codec_name;
    result.videoProfile = videoStream.profile;

    // Rotation
    const rotation = videoStream.tags?.rotate || videoStream.side_data_list?.find((s: any) => s.rotation)?.rotation;
    if (rotation) result.rotation = parseInt(rotation);

    // HDR detection
    if (videoStream.color_transfer === "smpte2084" || videoStream.color_transfer === "arib-std-b67") {
      result.hdr = true;
      result.hdrFormat = videoStream.color_transfer === "smpte2084" ? "HDR10" : "HLG";
    }

    // FPS
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
      if (den && den > 0) result.fps = Math.round((num / den) * 100) / 100;
    }

    // Video bitrate
    if (videoStream.bit_rate) {
      result.videoBitrate = parseInt(videoStream.bit_rate);
    }
  }

  // Audio stream
  if (audioStream) {
    result.audioCodec = audioStream.codec_name;
    result.audioChannels = audioStream.channels;
    result.audioSampleRate = parseInt(audioStream.sample_rate);
    if (audioStream.bit_rate) result.audioBitrate = parseInt(audioStream.bit_rate);
    if (audioStream.tags?.language) result.audioLanguage = audioStream.tags.language;
  }

  // Duration
  if (format.duration && parseFloat(format.duration) > 0) {
    result.duration = Math.round(parseFloat(format.duration) * 100) / 100;
  }

  // Container format
  result.containerFormat = format.format_long_name || format.format_name;

  // Chapters
  if (chapters.length > 0) {
    result.chapterCount = chapters.length;
  }

  // Subtitle tracks
  if (subtitleStreams.length > 0) {
    result.subtitleTracks = subtitleStreams.length;
  }

  // Format tags (audio metadata)
  const tags = format.tags || {};
  if (tags.title) result.title = tags.title;
  if (tags.artist) result.albumArtist = tags.artist;
  if (tags.album) result.album = tags.album;
  if (tags.genre) result.genre = tags.genre;
  if (tags.date || tags.year) result.year = parseInt(tags.date || tags.year);
  if (tags.track) result.trackNumber = tags.track;
  if (tags.disc) result.discNumber = tags.disc;
  if (tags.composer) result.composer = tags.composer;
  if (tags.encoder || tags.encoding_tool) result.creationTool = tags.encoder || tags.encoding_tool;

  // BPM from tags
  if (tags.TBPM || tags.bpm) result.bpm = parseInt(tags.TBPM || tags.bpm);

  return result;
}

/**
 * Extract metadata via exiftool (best for EXIF, IPTC, XMP, GPS)
 */
async function extractExiftool(filePath: string): Promise<Partial<FileMetadata> | null> {
  const cmd = `exiftool -json -G -n "${filePath}"`;
  const { stdout } = await execAsync(cmd, { timeout: 30000 });
  const data = JSON.parse(stdout);

  if (!data || !data[0]) return null;
  const tags = data[0];

  const result: Partial<FileMetadata> = {};

  // Dimensions
  const imgWidth = tags["File:ImageWidth"] || tags["EXIF:ImageWidth"] || tags["EXIF:ExifImageWidth"];
  const imgHeight = tags["File:ImageHeight"] || tags["EXIF:ImageHeight"] || tags["EXIF:ExifImageHeight"];
  if (imgWidth) result.width = parseInt(imgWidth);
  if (imgHeight) result.height = parseInt(imgHeight);

  // Camera
  const make = tags["EXIF:Make"] || tags["MakerNotes:Make"];
  const model = tags["EXIF:Model"] || tags["MakerNotes:Model"];
  if (make && model) {
    result.camera = model.includes(make) ? model : `${make} ${model}`;
    result.cameraModel = model;
  } else if (model) {
    result.camera = model;
    result.cameraModel = model;
  }

  // Lens
  const lens = tags["EXIF:LensModel"] || tags["Composite:LensID"] || tags["EXIF:Lens"] || tags["XMP:Lens"];
  if (lens) result.lens = lens;

  // Focal length
  const fl = tags["EXIF:FocalLength"];
  const fl35 = tags["EXIF:FocalLengthIn35mmFormat"] || tags["Composite:FocalLength35efl"];
  if (fl) result.focalLength = `${fl}mm`;
  if (fl35) result.focalLength35mm = `${fl35}mm`;

  // ISO
  const iso = tags["EXIF:ISO"] || tags["EXIF:ISOSpeedRatings"];
  if (iso) result.iso = parseInt(iso);

  // Shutter speed
  const exposure = tags["EXIF:ExposureTime"] || tags["Composite:ShutterSpeed"];
  if (exposure) {
    if (typeof exposure === "number" && exposure < 1) {
      result.shutterSpeed = `1/${Math.round(1 / exposure)}s`;
    } else if (typeof exposure === "string") {
      result.shutterSpeed = exposure.includes("/") ? `${exposure}s` : `${exposure}s`;
    } else {
      result.shutterSpeed = `${exposure}s`;
    }
  }

  // Aperture
  const aperture = tags["EXIF:FNumber"] || tags["Composite:Aperture"];
  if (aperture) result.aperture = `f/${aperture}`;

  // Exposure mode
  const expMode = tags["EXIF:ExposureMode"];
  if (expMode !== undefined) {
    const modes: Record<number, string> = { 0: "Auto", 1: "Manual", 2: "Auto Bracket" };
    result.exposureMode = modes[expMode] || String(expMode);
  }

  // Metering mode
  const metering = tags["EXIF:MeteringMode"];
  if (metering !== undefined) {
    const meters: Record<number, string> = {
      0: "Unknown", 1: "Average", 2: "Center-weighted", 3: "Spot",
      4: "Multi-spot", 5: "Multi-segment", 6: "Partial", 255: "Other"
    };
    result.meteringMode = meters[metering] || String(metering);
  }

  // White balance
  const wb = tags["EXIF:WhiteBalance"];
  if (wb !== undefined) {
    result.whiteBalance = wb === 0 ? "Auto" : "Manual";
  }

  // Flash
  const flash = tags["EXIF:Flash"];
  if (flash !== undefined) {
    result.flash = (flash & 1) ? "Fired" : "Off";
  }

  // Focus mode
  const focus = tags["MakerNotes:FocusMode"] || tags["EXIF:FocusMode"];
  if (focus) result.focusMode = String(focus);

  // Date taken
  const dateOrig = tags["EXIF:DateTimeOriginal"] || tags["EXIF:CreateDate"] || tags["XMP:DateCreated"];
  if (dateOrig) {
    // Convert EXIF date format "2026:05:01 10:30:00" to ISO
    const isoDate = String(dateOrig).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    result.dateTaken = isoDate;
  }

  // Software
  const sw = tags["EXIF:Software"] || tags["XMP:CreatorTool"];
  if (sw) result.software = sw;

  // Artist/Author
  const artist = tags["EXIF:Artist"] || tags["IPTC:By-line"] || tags["XMP:Creator"];
  if (artist) result.artist = Array.isArray(artist) ? artist[0] : artist;

  // Copyright
  const cr = tags["EXIF:Copyright"] || tags["IPTC:CopyrightNotice"] || tags["XMP:Rights"];
  if (cr) result.copyright = cr;

  // GPS
  const lat = tags["EXIF:GPSLatitude"] || tags["Composite:GPSLatitude"];
  const lng = tags["EXIF:GPSLongitude"] || tags["Composite:GPSLongitude"];
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    result.gps = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const alt = tags["EXIF:GPSAltitude"];
    if (alt) result.gps.altitude = parseFloat(alt);
  }

  // DPI
  const xRes = tags["EXIF:XResolution"];
  if (xRes) result.dpi = parseInt(xRes);

  // Bit depth
  const bits = tags["EXIF:BitsPerSample"] || tags["File:BitsPerSample"] || tags["PNG:BitDepth"];
  if (bits) result.bitDepth = Array.isArray(bits) ? bits[0] : parseInt(bits);

  // Color space
  const cs = tags["EXIF:ColorSpace"] || tags["ICC_Profile:ColorSpaceData"];
  if (cs !== undefined) {
    if (cs === 1 || cs === "sRGB") result.colorSpace = "sRGB";
    else if (cs === 65535 || cs === "Uncalibrated") result.colorSpace = "Uncalibrated";
    else result.colorSpace = String(cs);
  }

  // ICC Profile
  const icc = tags["ICC_Profile:ProfileDescription"];
  if (icc) result.colorProfile = icc;

  // Orientation
  const orient = tags["EXIF:Orientation"];
  if (orient !== undefined) {
    const orientations: Record<number, string> = {
      1: "Horizontal", 2: "Mirror horizontal", 3: "Rotate 180",
      4: "Mirror vertical", 5: "Mirror horizontal + Rotate 270",
      6: "Rotate 90 CW", 7: "Mirror horizontal + Rotate 90", 8: "Rotate 270 CW"
    };
    result.orientation = orientations[orient] || String(orient);
  }

  // HDR
  if (tags["MakerNotes:HDRImageType"] || tags["XMP:HDRPMakerNote"]) {
    result.hdr = true;
  }

  // Audio ID3 tags
  if (tags["ID3:Title"] || tags["ID3v2:Title"]) result.title = tags["ID3:Title"] || tags["ID3v2:Title"];
  if (tags["ID3:Artist"] || tags["ID3v2:Artist"]) result.albumArtist = tags["ID3:Artist"] || tags["ID3v2:Artist"];
  if (tags["ID3:Album"] || tags["ID3v2:Album"]) result.album = tags["ID3:Album"] || tags["ID3v2:Album"];
  if (tags["ID3:Year"] || tags["ID3v2:Year"]) result.year = parseInt(tags["ID3:Year"] || tags["ID3v2:Year"]);
  if (tags["ID3:Genre"] || tags["ID3v2:Genre"]) result.genre = tags["ID3:Genre"] || tags["ID3v2:Genre"];
  if (tags["ID3:Track"] || tags["ID3v2:Track"]) result.trackNumber = String(tags["ID3:Track"] || tags["ID3v2:Track"]);
  if (tags["ID3:PartOfSet"] || tags["ID3v2:PartOfSet"]) result.discNumber = String(tags["ID3:PartOfSet"] || tags["ID3v2:PartOfSet"]);
  if (tags["ID3v2:Composer"]) result.composer = tags["ID3v2:Composer"];
  if (tags["ID3v2:BeatsPerMinute"]) result.bpm = parseInt(tags["ID3v2:BeatsPerMinute"]);
  if (tags["ID3v2:EncodedBy"] || tags["ID3v2:Encoder"]) result.encoder = tags["ID3v2:EncodedBy"] || tags["ID3v2:Encoder"];

  // Check for album art (embedded picture)
  if (tags["ID3v2:Picture"] || tags["EXIF:ThumbnailImage"]) {
    result.hasAlbumArt = true;
  }

  // PDF / Document
  const pages = tags["PDF:PageCount"] || tags["XMP:Pages"];
  if (pages) result.pageCount = parseInt(pages);
  const pdfAuthor = tags["PDF:Author"] || tags["XMP:Author"];
  if (pdfAuthor) result.author = pdfAuthor;
  const pdfTitle = tags["PDF:Title"] || tags["XMP:Title"];
  if (pdfTitle) result.documentTitle = pdfTitle;
  const pdfSubject = tags["PDF:Subject"] || tags["XMP:Subject"];
  if (pdfSubject) result.subject = pdfSubject;
  const pdfKeywords = tags["PDF:Keywords"] || tags["XMP:Keywords"];
  if (pdfKeywords) {
    result.keywords = typeof pdfKeywords === "string" ? pdfKeywords.split(/[,;]\s*/) : pdfKeywords;
  }
  const creator = tags["PDF:Creator"] || tags["XMP:CreatorTool"];
  if (creator) result.creatorApp = creator;
  const pdfVer = tags["PDF:PDFVersion"];
  if (pdfVer) result.pdfVersion = String(pdfVer);
  const encrypted = tags["PDF:Encryption"];
  if (encrypted) result.encrypted = true;

  return result;
}

/**
 * Calculate human-readable aspect ratio
 */
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  // Common ratios
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9";
  if (Math.abs(ratio - 4 / 3) < 0.02) return "4:3";
  if (Math.abs(ratio - 3 / 2) < 0.02) return "3:2";
  if (Math.abs(ratio - 1) < 0.02) return "1:1";
  if (Math.abs(ratio - 21 / 9) < 0.05) return "21:9";
  if (Math.abs(ratio - 9 / 16) < 0.02) return "9:16";
  if (Math.abs(ratio - 3 / 4) < 0.02) return "3:4";
  if (Math.abs(ratio - 2 / 3) < 0.02) return "2:3";

  // If simplified ratio is reasonable, show it
  if (w <= 32 && h <= 32) return `${w}:${h}`;
  return `${width}:${height}`;
}

/**
 * Remove null/undefined values from metadata
 */
function cleanMetadata(meta: FileMetadata): FileMetadata {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined && value !== null && value !== "" && value !== 0) {
      // Keep 0 for specific fields where 0 is meaningful
      if (value === 0 && ["rotation", "iso"].includes(key)) {
        cleaned[key] = value;
      } else if (value !== 0) {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

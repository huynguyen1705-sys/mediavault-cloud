"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Cloud, 
  HardDrive, 
  Image, 
  Video, 
  Music, 
  FolderOpen,
  ArrowUp,
  Clock,
  Loader2,
  CheckCircle,
  Upload,
  X,
  File,
  Eye,
  Link,
} from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

interface DashboardStats {
  storageUsedBytes: number;
  storageLimitBytes: number;
  bandwidthUsedBytes: number;
  bandwidthLimitBytes: number;
  totalFiles: number;
  totalFolders: number;
  totalShares: number;
  expiringFiles: number;
  recentFiles: any[];
  plan: {
    name: string;
    displayName: string;
    storageGb: number;
    bandwidthGb: number;
  };
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoaded && user) {
      // Fetch dashboard stats
      Promise.all([
        fetch("/api/user").then(r => r.json()),
        fetch("/api/analytics?range=7").then(r => r.json()).catch(() => null),
      ]).then(([userData, analyticsData]) => {
        // Build stats from user data + analytics
        setStats({
          storageUsedBytes: (userData.user?.plan?.storageUsedGb || 0) * 1024 * 1024 * 1024,
          storageLimitBytes: (userData.user?.plan?.storageGb || 1) * 1024 * 1024 * 1024,
          bandwidthUsedBytes: 0, // Bandwidth tracked separately, default to 0 for now
          bandwidthLimitBytes: (userData.user?.plan?.bandwidthGb || 10) * 1024 * 1024 * 1024,
          totalFiles: userData.user?.filesCount || 0,
          totalFolders: 0,
          totalShares: 0,
          expiringFiles: userData.expiringFiles || 0,
          recentFiles: analyticsData?.fileTypeBreakdown || [],
          plan: userData.user?.plan || { name: "free", displayName: "Free", storageGb: 1, bandwidthGb: 10 },
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isLoaded, user]);

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const newFiles = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: "pending" as const,
    }));

    setUploadQueue((prev) => [...prev, ...newFiles]);

    const MULTIPART_THRESHOLD = 200 * 1024 * 1024; // 200MB - only for very large files (R2 CORS ETag issue for smaller)
    const PART_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const CONCURRENT_PARTS = 4;

    // Upload single file (small files < 50MB)
    const uploadSingle = async (uploadFile: typeof newFiles[0], updateProgress: (p: number) => void) => {
      const urlRes = await fetch(
        `/api/upload-url?fileName=${encodeURIComponent(uploadFile.file.name)}&contentType=${encodeURIComponent(uploadFile.file.type || "application/octet-stream")}&fileSize=${uploadFile.file.size}`
      );
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey } = await urlRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) updateProgress(Math.round((e.loaded / e.total) * 90));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", uploadFile.file.type || "application/octet-stream");
        xhr.send(uploadFile.file);
      });

      return fileKey;
    };

    // Upload large file via multipart — XHR for real-time progress per part
    const uploadMultipart = async (uploadFile: typeof newFiles[0], updateProgress: (p: number) => void) => {
      const file = uploadFile.file;
      const totalParts = Math.ceil(file.size / PART_SIZE);

      // Init multipart
      const initRes = await fetch("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init", fileName: file.name, contentType: file.type || "application/octet-stream", fileSize: file.size }),
      });
      if (!initRes.ok) throw new Error((await initRes.json().catch(() => ({}))).error || "Failed to init multipart");
      const { uploadId, fileKey } = await initRes.json();

      // Get ALL part URLs in one batch call (max 10 at a time)
      const allPartUrls: Record<number, string> = {};
      for (let i = 0; i < totalParts; i += 10) {
        const nums = Array.from({ length: Math.min(10, totalParts - i) }, (_, j) => i + j + 1);
        const urlRes = await fetch("/api/upload/multipart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-part-urls", fileKey, uploadId, partNumbers: nums }),
        });
        if (!urlRes.ok) throw new Error("Failed to get part URLs");
        const { urls } = await urlRes.json();
        Object.assign(allPartUrls, urls);
      }

      const completedParts: { PartNumber: number; ETag: string }[] = [];
      let uploadedBytes = 0;

      // Upload single part with XHR (real-time progress)
      const uploadPart = async (partNum: number) => {
        const start = (partNum - 1) * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partSize = end - start;

        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const partProgress = e.loaded / e.total;
              const totalProgress = (uploadedBytes + partSize * partProgress) / file.size;
              updateProgress(Math.round(totalProgress * 90));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.getResponseHeader("etag") || `"part${partNum}"`);
            } else reject(new Error(`Part ${partNum} failed (${xhr.status})`));
          };
          xhr.onerror = () => reject(new Error(`Part ${partNum} network error`));
          xhr.open("PUT", allPartUrls[partNum]);
          xhr.send(chunk);
        });

        uploadedBytes += partSize;
        completedParts.push({ PartNumber: partNum, ETag: etag });
        updateProgress(Math.round((uploadedBytes / file.size) * 90));
      };

      // Process parts with concurrency
      for (let i = 0; i < totalParts; i += CONCURRENT_PARTS) {
        const batch = Array.from({ length: Math.min(CONCURRENT_PARTS, totalParts - i) }, (_, j) => i + j + 1);
        await Promise.all(batch.map(uploadPart));
      }

      // Complete multipart
      completedParts.sort((a, b) => a.PartNumber - b.PartNumber);
      const completeRes = await fetch("/api/upload/multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", fileKey, uploadId, parts: completedParts }),
      });
      if (!completeRes.ok) {
        await fetch("/api/upload/multipart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "abort", fileKey, uploadId }) });
        throw new Error("Failed to complete multipart upload");
      }

      return fileKey;
    };

    // Main upload orchestrator
    const uploadOne = async (uploadFile: typeof newFiles[0]) => {
      try {
        setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, status: "uploading" } : f));

        const updateProgress = (percent: number) => {
          setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, progress: percent } : f));
        };

        // Choose strategy based on file size
        const fileKey = uploadFile.file.size >= MULTIPART_THRESHOLD
          ? await uploadMultipart(uploadFile, updateProgress)
          : await uploadSingle(uploadFile, updateProgress);

        updateProgress(95);

        // Confirm upload (save to DB + thumbnail)
        const confirmRes = await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey, fileName: uploadFile.file.name, mimeType: uploadFile.file.type || "application/octet-stream", fileSize: uploadFile.file.size }),
        });
        if (!confirmRes.ok) throw new Error("Upload confirmation failed");
        const confirmData = await confirmRes.json().catch(() => null);
        if (confirmData?.file?.id) {
          try {
            const existing = JSON.parse(sessionStorage.getItem('mv-highlight-files') || '[]');
            existing.push(confirmData.file.id);
            sessionStorage.setItem('mv-highlight-files', JSON.stringify(existing));
          } catch { /* Safari Private */ }
        }

        updateProgress(100);
        setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, status: "completed", progress: 100 } : f));
      } catch (error: any) {
        setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, status: "error", error: error.message } : f));
      }
    };

    // Sort: largest files first → they start early, small files fill remaining slots
    const sorted = [...newFiles].sort((a, b) => b.file.size - a.file.size);

    // Upload 10 files concurrently (largest first strategy)
    const CONCURRENT_FILES = 10;
    for (let i = 0; i < sorted.length; i += CONCURRENT_FILES) {
      await Promise.all(sorted.slice(i, i + CONCURRENT_FILES).map(uploadOne));
    }

    // Redirect after all complete
    setTimeout(() => {
      setUploadQueue((prev) => {
        const hasCompleted = prev.some(f => f.status === "completed");
        const hasUploading = prev.some(f => f.status === "uploading" || f.status === "pending");
        if (hasCompleted && !hasUploading) router.push("/files");
        return prev;
      });
    }, 1500);
  }, [router]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const storagePercent = stats ? Math.round((stats.storageUsedBytes / stats.storageLimitBytes) * 100) : 0;
  const bandwidthPercent = stats ? Math.round((stats.bandwidthUsedBytes / stats.bandwidthLimitBytes) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome + Upload Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Welcome Text */}
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">
            Welcome back, {user?.firstName || "User"}
          </h1>
          <p className="text-gray-400">
            Manage your media files and account settings
          </p>
          {/* Plan Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-full">
            <Cloud className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-300 font-medium">{stats?.plan.displayName || "Free"} Plan</span>
            {(stats?.plan.name !== "pro") && (
              <NextLink href="/pricing" className="ml-2 px-2 py-0.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-full transition-colors">
                Upgrade
              </NextLink>
            )}
          </div>
        </div>

        {/* Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`
            p-6 border-2 border-dashed rounded-xl cursor-pointer
            transition-all duration-300 text-center
            ${isDragOver
              ? "border-violet-500 bg-violet-500/10"
              : "border-gray-700 hover:border-violet-500/50 hover:bg-[#111111]/50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-300">Drop files here or click to upload</p>
          <p className="text-xs text-gray-500 mt-1">Images, videos, audio files</p>
        </div>
      </div>

      {/* Upload Progress - Professional Panel */}
      {uploadQueue.length > 0 && (
        <div className="mb-8 bg-[#111111]/80 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          {/* Summary Header */}
          <div className="px-5 py-3 bg-gray-800/50 border-b border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Upload className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">
                  {uploadQueue.filter(f => f.status === "uploading").length > 0
                    ? `Uploading ${uploadQueue.filter(f => f.status === "uploading").length} of ${uploadQueue.length}`
                    : uploadQueue.every(f => f.status === "completed")
                      ? "All uploads complete"
                      : `${uploadQueue.length} file${uploadQueue.length > 1 ? "s" : ""} queued`
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {(() => {
                    const totalSize = uploadQueue.reduce((sum, f) => sum + (f.file?.size || 0), 0);
                    const avgProgress = Math.round(uploadQueue.reduce((sum, f) => sum + f.progress, 0) / uploadQueue.length);
                    return `${avgProgress}% • ${formatBytes(totalSize)} total`;
                  })()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-medium">
                {uploadQueue.filter(f => f.status === "completed").length} done
              </span>
              {uploadQueue.some(f => f.status === "error") && (
                <span className="text-xs text-red-400 font-medium">
                  {uploadQueue.filter(f => f.status === "error").length} failed
                </span>
              )}
            </div>
          </div>
          {/* Overall Progress Bar */}
          <div className="px-5 py-2 bg-[#111111]/50">
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-violet-500 to-violet-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(uploadQueue.reduce((sum, f) => sum + f.progress, 0) / uploadQueue.length)}%` }}
              />
            </div>
          </div>
          {/* File List (collapsible if many) */}
          <div className={`divide-y divide-gray-800/50 ${uploadQueue.length > 5 ? "max-h-48 overflow-y-auto" : ""}`}>
            {uploadQueue.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-800/30 transition-colors">
                <div className="w-5 flex-shrink-0">
                  {uploadFile.status === "uploading" && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                  {uploadFile.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {uploadFile.status === "error" && <X className="w-4 h-4 text-red-400" />}
                  {uploadFile.status === "pending" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{uploadFile.file?.name}</p>
                  {uploadFile.status === "error" && <p className="text-xs text-red-400 truncate">{uploadFile.error}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {uploadFile.status === "uploading" && (
                    <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{uploadFile.progress}%</span>
                  )}
                  <span className="text-xs text-gray-500">{formatBytes(uploadFile.file?.size || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats - 4 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Storage */}
        <div className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Storage Used</span>
            <HardDrive className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{formatBytes(stats?.storageUsedBytes || 0)}</div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${storagePercent > 90 ? "bg-red-500" : "bg-violet-500"}`}
              style={{ width: `${Math.min(storagePercent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{formatBytes(stats?.storageLimitBytes || 0)} total</div>
        </div>

        {/* Bandwidth */}
        <div className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Bandwidth Used</span>
            <Link className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{formatBytes(stats?.bandwidthUsedBytes || 0)}</div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full"
              style={{ width: `${Math.min(bandwidthPercent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{formatBytes(stats?.bandwidthLimitBytes || 0)} total</div>
        </div>

        {/* Total Files */}
        <div className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Total Files</span>
            <File className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{stats?.totalFiles || 0}</div>
          <div className="text-xs text-gray-500">files stored</div>
        </div>

        {/* Expiring Soon */}
        <div className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Expiring</span>
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <div className={`text-2xl font-bold mb-2 ${(stats?.expiringFiles || 0) > 0 ? "text-orange-400" : "text-white"}`}>
            {stats?.expiringFiles || 0}
          </div>
          <div className="text-xs text-gray-500">files expiring soon</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <NextLink
          href="/files"
          className="p-6 bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 rounded-2xl hover:border-violet-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Open File Manager</h3>
              <p className="text-sm text-gray-400">View and manage files</p>
            </div>
          </div>
        </NextLink>

        <NextLink
          href="/analytics"
          className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">View Analytics</h3>
              <p className="text-sm text-gray-400">Storage & bandwidth stats</p>
            </div>
          </div>
        </NextLink>

        <NextLink
          href="/settings"
          className="p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Account Settings</h3>
              <p className="text-sm text-gray-400">Profile & preferences</p>
            </div>
          </div>
        </NextLink>
      </div>

      {/* Storage Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Types Breakdown */}
        <div className="p-6 bg-[#111111] border border-gray-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">File Types</h3>
          <div className="space-y-3">
            {stats?.recentFiles?.length ? stats.recentFiles.map((type: any) => (
              <div key={type.type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {type.type === "images" && <Image className="w-5 h-5 text-pink-400" />}
                  {type.type === "videos" && <Video className="w-5 h-5 text-purple-400" />}
                  {type.type === "audio" && <Music className="w-5 h-5 text-yellow-400" />}
                  {type.type === "documents" && <File className="w-5 h-5 text-blue-400" />}
                  {type.type === "other" && <File className="w-5 h-5 text-gray-400" />}
                  <span className="text-gray-300 capitalize">{type.type}</span>
                </div>
                <span className="text-gray-400 font-medium">{type.count}</span>
              </div>
            )) : (
              <div className="text-gray-500 text-sm">No files yet</div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-6 bg-[#111111] border border-gray-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <NextLink href="/files" className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowUp className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-300">Upload new files</span>
            </NextLink>
            <NextLink href="/settings" className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              <Cloud className="w-5 h-5 text-violet-400" />
              <span className="text-gray-300">Manage subscription</span>
            </NextLink>
            <NextLink href="/files?filter=shared" className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              <Link className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300">View shared links</span>
            </NextLink>
          </div>
        </div>
      </div>
    </div>
  );
}
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


    // Upload files in parallel (max 3 concurrent)
    const uploadChunk = async (uploadFile: typeof newFiles[0]) => {
      try {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "uploading" } : f
          )
        );
        const formData = new FormData();
        formData.append("file", uploadFile.file);
        if (uploadFile.folderId) formData.append("folderId", uploadFile.folderId);

        // Use XMLHttpRequest for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadQueue((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id ? { ...f, progress: percent } : f
                )
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadQueue((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id ? { ...f, status: "completed", progress: 100 } : f
                )
              );
              resolve();
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.error || "Upload failed"));
              } catch {
                reject(new Error("Upload failed"));
              }
            }
          };


          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });
      } catch (error: any) {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error", error: error.message } : f
          )
        );
      }
    };
    // Upload chunks in parallel, max 3 at a time
    for (let i = 0; i < newFiles.length; i += 3) {
      await Promise.all(newFiles.slice(i, i + 3).map(uploadChunk));
    }
    // Only redirect after ALL files complete
    const allCompleted = uploadQueue.every(f => f.status === "completed");
    if (allCompleted && newFiles.length > 0) {
      setTimeout(() => router.push("/files"), 1000);
    }
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
              : "border-gray-700 hover:border-violet-500/50 hover:bg-gray-900/50"
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

      {/* Upload Progress - Full Width Below */}
      {uploadQueue.length > 0 && (
        <div className="mb-8 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Uploading {uploadQueue.length} file(s)...</h3>
          <div className="space-y-2">
            {uploadQueue.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
                {uploadFile.status === "uploading" && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                {uploadFile.status === "completed" && <CheckCircle className="w-4 h-4 text-green-400" />}
                {uploadFile.status === "error" && <div className="w-4 h-4 rounded-full bg-red-500" />}
                <span className="text-sm text-gray-300 truncate flex-1">{uploadFile.file?.name}</span>
                {uploadFile.status === "error" && <span className="text-xs text-red-400">{uploadFile.error}</span>}
                <button onClick={() => setUploadQueue(prev => prev.filter(f => f.id !== uploadFile.id))} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats - 4 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Storage */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
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
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
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
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Total Files</span>
            <File className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{stats?.totalFiles || 0}</div>
          <div className="text-xs text-gray-500">files stored</div>
        </div>

        {/* Expiring Soon */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
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
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
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
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
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
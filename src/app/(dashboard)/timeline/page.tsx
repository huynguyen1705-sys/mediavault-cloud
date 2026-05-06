"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, Image, Video, Music, File, Eye, ChevronRight, Calendar } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

interface TimelineFile {
  id: string;
  name: string;
  mimeType: string;
  fileSize: string;
  createdAt: string;
  thumbnailUrl: string | null;
  url: string | null;
  shareUrl: string | null;
  caption?: string;
}

interface DateGroup {
  label: string;
  date: string;
  files: TimelineFile[];
}

type TimeFilter = "all" | "year" | "month" | "week";

export default function TimelinePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [selectedFile, setSelectedFile] = useState<TimelineFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  // Group files by date label
  const groupByDate = useCallback((files: any[]): DateGroup[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    const buckets: Record<string, TimelineFile[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      "This Month": [],
      "This Year": [],
      Older: [],
    };

    files.forEach((file: any) => {
      const fileDate = new Date(file.createdAt);
      const fileDay = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());

      if (fileDay.getTime() === today.getTime()) {
        buckets.Today.push(file);
      } else if (fileDay.getTime() === yesterday.getTime()) {
        buckets.Yesterday.push(file);
      } else if (fileDay >= thisWeekStart) {
        buckets["This Week"].push(file);
      } else if (fileDay >= thisMonthStart) {
        buckets["This Month"].push(file);
      } else if (fileDay >= thisYearStart) {
        buckets["This Year"].push(file);
      } else {
        buckets.Older.push(file);
      }
    });

    return Object.entries(buckets)
      .filter(([, files]) => files.length > 0)
      .map(([label, files]) => ({
        label,
        date: label,
        files: files as TimelineFile[],
      }));
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/timeline")
        .then((r) => r.json())
        .then((data) => {
          const grouped = groupByDate(data.files || []);
          setGroups(grouped);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, user, groupByDate, router]);

  const getFileIcon = (mimeType: string, size: "sm" | "md" = "sm") => {
    const s = size === "sm" ? "w-5 h-5" : "w-8 h-8";
    if (mimeType.startsWith("image/")) return <Image className={`${s} text-pink-400`} />;
    if (mimeType.startsWith("video/")) return <Video className={`${s} text-purple-400`} />;
    if (mimeType.startsWith("audio/")) return <Music className={`${s} text-yellow-400`} />;
    return <File className={`${s} text-gray-400`} />;
  };

  const formatBytes = (bytes: number | string) => {
    const b = typeof bytes === "string" ? parseInt(bytes) : bytes;
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " MB";
    return (b / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const handleFileClick = (file: TimelineFile) => {
    setSelectedFile(file);
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) {
      setShowPreview(true);
    } else {
      setShowMobileSheet(true);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0f0f0f]/80 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Timeline</h1>
              <p className="text-sm text-gray-500 mt-0.5">Your media organized by time</p>
            </div>
            {/* Time Filter */}
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-xl p-1">
              {(["all", "year", "month", "week"] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {f === "all" ? "All" : f === "year" ? "Year" : f === "month" ? "Month" : "Week"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {groups.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No files yet</p>
            <p className="text-gray-600 text-sm mt-1">Upload some media to see your timeline</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.label}>
                {/* Date Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <h2 className="text-lg font-semibold text-white">{group.label}</h2>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                      {group.files.length}
                    </span>
                  </div>
                  {group.files.length > 9 && (
                    <button className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                      View all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.files.slice(0, 10).map((file) => {
                    const ext = file.name.split(".").pop()?.toLowerCase() || "";
                    return (
                      <button
                        key={file.id}
                        onClick={() => handleFileClick(file)}
                        className="group text-left bg-[#1a1a1a] hover:bg-[#222] rounded-xl overflow-hidden border border-gray-800 hover:border-violet-500/30 transition-all"
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square bg-[#111] relative overflow-hidden">
                          {file.thumbnailUrl ? (
                            <img
                              src={file.thumbnailUrl}
                              alt={file.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getFileIcon(file.mimeType, "md")}
                            </div>
                          )}
                          {/* Play icon for video */}
                          {file.mimeType?.startsWith("video/") && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Video className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Caption */}
                        <div className="p-2.5">
                          <p className="text-xs text-white font-medium truncate">{file.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {file.fileSize && formatBytes(file.fileSize)}
                            {file.createdAt && " · " + new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Sheet */}
      {showMobileSheet && selectedFile && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setShowMobileSheet(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0f0f0f] rounded-t-2xl shadow-2xl border-t border-gray-800 md:hidden">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            <div className="px-4 pb-4 border-b border-gray-800 flex items-center gap-3">
              {selectedFile.thumbnailUrl ? (
                <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                  {getFileIcon(selectedFile.mimeType, "md")}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-white">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{selectedFile.fileSize}</p>
              </div>
              <button onClick={() => setShowMobileSheet(false)} className="p-2 hover:bg-gray-800 rounded-full">
                <span className="text-gray-400">✕</span>
              </button>
            </div>
            {/* Actions */}
            <div className="p-4 grid grid-cols-4 gap-4">
              <button
                onClick={() => { setShowPreview(true); setShowMobileSheet(false); }}
                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-xs text-gray-400">View</span>
              </button>
              {selectedFile.shareUrl && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + selectedFile.shareUrl);
                    setShowMobileSheet(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <span className="text-emerald-400 text-lg">🔗</span>
                  </div>
                  <span className="text-xs text-gray-400">Share</span>
                </button>
              )}
              {selectedFile.url && (
                <a
                  href={`/api/files/${selectedFile.id}/proxy?download=1`}
                  download={selectedFile.name}
                  onClick={() => setShowMobileSheet(false)}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <span className="text-amber-400 text-lg">↓</span>
                  </div>
                  <span className="text-xs text-gray-400">Download</span>
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* Desktop Preview Modal */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowPreview(false)}>
          <div className="relative max-w-4xl w-full bg-[#0f0f0f] rounded-2xl border border-gray-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {selectedFile.mimeType?.startsWith("image/") && selectedFile.thumbnailUrl ? (
              <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-full max-h-[70vh] object-contain" />
            ) : selectedFile.mimeType?.startsWith("video/") ? (
              <video src={selectedFile.url || undefined} controls className="w-full max-h-[70vh]" />
            ) : (
              <div className="flex items-center justify-center h-64">
                {getFileIcon(selectedFile.mimeType, "md")}
              </div>
            )}
            <div className="p-4 border-t border-gray-800 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedFile.fileSize}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

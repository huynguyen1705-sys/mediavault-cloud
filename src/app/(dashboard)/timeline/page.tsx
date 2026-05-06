"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Loader2,
  Image,
  Video,
  Music,
  File,
  Eye,
  ChevronDown,
  ChevronRight,
  Calendar,
  Play,
  Download,
  Share2,
  Info,
  Trash2,
  Edit,
  FolderInput,
  X,
  Copy,
  Link,
} from "lucide-react";
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
}

interface DateGroup {
  label: string;
  sublabel: string;
  files: TimelineFile[];
}

type TimeFilter = "7days" | "30days" | "year" | "all";

const FILTER_LABELS: Record<TimeFilter, string> = {
  "7days": "Last 7 days",
  "30days": "Last 30 days",
  year: "This year",
  all: "All time",
};

export default function TimelinePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TimelineFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2000);
  };

  // Group files by date
  const groupByDate = useCallback((files: TimelineFile[]): DateGroup[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const buckets: Record<string, { sublabel: string; files: TimelineFile[] }> = {};

    files.forEach((file) => {
      const fileDate = new Date(file.createdAt);
      const fileDay = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());

      let label: string;
      let sublabel: string;

      if (fileDay.getTime() === today.getTime()) {
        label = "TODAY";
        sublabel = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      } else if (fileDay.getTime() === yesterday.getTime()) {
        label = "YESTERDAY";
        sublabel = yesterday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      } else if (fileDay >= thisWeekStart) {
        label = "THIS WEEK";
        sublabel = `${thisWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      } else if (fileDay >= thisMonthStart) {
        label = "THIS MONTH";
        sublabel = thisMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } else {
        // Group by month
        const monthKey = fileDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        label = monthKey.toUpperCase();
        sublabel = monthKey;
      }

      if (!buckets[label]) {
        buckets[label] = { sublabel, files: [] };
      }
      buckets[label].files.push(file);
    });

    return Object.entries(buckets).map(([label, data]) => ({
      label,
      sublabel: data.sublabel,
      files: data.files,
    }));
  }, []);

  // Fetch data
  useEffect(() => {
    if (isLoaded && user) {
      setLoading(true);
      const filterParam = filter === "7days" ? "week" : filter === "30days" ? "month" : filter;
      fetch(`/api/timeline?filter=${filterParam}`)
        .then((r) => r.json())
        .then((data) => {
          setGroups(groupByDate(data.files || []));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, user, filter, groupByDate, router]);

  const getFileIcon = (mimeType: string, size: "sm" | "md" | "lg" = "sm") => {
    const s = size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-10 h-10";
    if (mimeType?.startsWith("image/")) return <Image className={`${s} text-pink-400`} />;
    if (mimeType?.startsWith("video/")) return <Video className={`${s} text-purple-400`} />;
    if (mimeType?.startsWith("audio/")) return <Music className={`${s} text-yellow-400`} />;
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
    if (window.innerWidth >= 768) {
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
    <div className="min-h-screen bg-[#0a0a0a] light:bg-gray-50">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-[#0a0a0a]/90 light:bg-white/90 backdrop-blur-md border-b border-gray-800 light:border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white light:text-gray-900">Timeline</h1>
              <p className="text-sm text-gray-500 light:text-gray-400 mt-0.5">Your media organized by time</p>
            </div>
            {/* Filter Dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] light:bg-white border border-gray-700 light:border-gray-300 rounded-xl text-sm text-gray-300 light:text-gray-700 hover:border-violet-500/50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-violet-400" />
                {FILTER_LABELS[filter]}
                <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] light:bg-white border border-gray-700 light:border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
                  {(Object.entries(FILTER_LABELS) as [TimeFilter, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setFilter(key); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        filter === key
                          ? "bg-violet-600/20 text-violet-300 light:text-violet-600"
                          : "text-gray-300 light:text-gray-700 hover:bg-gray-800 light:hover:bg-gray-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {groups.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-[#1a1a1a] light:bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-10 h-10 text-white light:text-gray-500" />
            </div>
            <p className="text-white light:text-gray-900 font-semibold text-lg">No media yet</p>
            <p className="text-gray-500 text-sm mt-2">Upload files to see your timeline</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical dotted timeline line */}
            <div className="absolute left-4 md:left-6 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-700 light:border-gray-300" />

            {/* Date Groups */}
            <div className="space-y-10">
              {groups.map((group, groupIdx) => (
                <div key={group.label} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute left-4 md:left-6 -translate-x-1/2 top-1 z-10">
                    <div className="w-3 h-3 rounded-full bg-violet-500 ring-4 ring-[#0a0a0a] light:ring-gray-50" />
                  </div>

                  {/* Date header + content */}
                  <div className="pl-10 md:pl-16">
                    {/* Date Label */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-base font-bold tracking-wide text-white light:text-gray-900">
                          {group.label}
                        </h2>
                        <p className="text-xs text-gray-500 light:text-gray-400 mt-0.5">{group.sublabel}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 light:text-gray-400">{group.files.length} items</span>
                        {group.files.length > 6 && (
                          <button className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-0.5 font-medium transition-colors">
                            See all <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Masonry-style Grid */}
                    <div className="columns-2 sm:columns-3 md:columns-3 lg:columns-4 gap-3 space-y-3">
                      {group.files.slice(0, 12).map((file) => {
                        const isImage = file.mimeType?.startsWith("image/");
                        const isVideo = file.mimeType?.startsWith("video/");
                        const isAudio = file.mimeType?.startsWith("audio/");

                        return (
                          <div
                            key={file.id}
                            className="break-inside-avoid group cursor-pointer"
                            onClick={() => handleFileClick(file)}
                          >
                            <div className="bg-[#171717] light:bg-[#f5f5f5] rounded-2xl overflow-hidden border border-gray-800/50 light:border-gray-200 hover:border-violet-500/40 light:hover:border-violet-400/40 transition-all hover:shadow-xl hover:shadow-black/20 light:hover:shadow-gray-400/20">
                              {/* Thumbnail */}
                              {file.thumbnailUrl ? (
                                <div className="relative overflow-hidden">
                                  <img
                                    src={file.thumbnailUrl}
                                    alt={file.name}
                                    className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                    loading="lazy"
                                    style={{ minHeight: "120px", maxHeight: "280px" }}
                                  />
                                  {/* Video play overlay */}
                                  {isVideo && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                                      </div>
                                    </div>
                                  )}
                                  {/* Type badge */}
                                  {isVideo && (
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-medium text-white/80 backdrop-blur-sm">
                                      VIDEO
                                    </div>
                                  )}
                                  {/* Hover overlay */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center py-10 bg-[#171717] light:bg-[#f0f0f0]">
                                  {getFileIcon(file.mimeType, "lg")}
                                </div>
                              )}

                              {/* Caption */}
                              <div className="px-3 py-2.5">
                                <p className="text-xs font-medium text-gray-200 light:text-gray-800 truncate leading-tight">
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-gray-500 light:text-gray-400 mt-1">
                                  {formatBytes(file.fileSize)} · {new Date(file.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* End dot */}
              <div className="relative">
                <div className="absolute left-4 md:left-6 -translate-x-1/2 top-0 z-10">
                  <div className="w-2 h-2 rounded-full bg-gray-600 light:bg-gray-400 ring-4 ring-[#0a0a0a] light:ring-gray-50" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      {showMobileSheet && selectedFile && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setShowMobileSheet(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0f0f0f] light:bg-white rounded-t-2xl shadow-2xl border-t border-gray-800 light:border-gray-200 md:hidden animate-sheet-in">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-600 light:bg-gray-300 rounded-full" />
            </div>
            <div className="px-4 pb-3 border-b border-gray-800 light:border-gray-200 flex items-center gap-3">
              {selectedFile.thumbnailUrl ? (
                <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gray-800 light:bg-gray-100 rounded-lg flex items-center justify-center">
                  {getFileIcon(selectedFile.mimeType, "md")}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-white light:text-gray-900 text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(selectedFile.fileSize)}</p>
              </div>
              <button onClick={() => setShowMobileSheet(false)} className="p-2 hover:bg-gray-800 light:hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3">
              <button
                onClick={() => { setShowPreview(true); setShowMobileSheet(false); }}
                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 light:hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-[10px] text-gray-400 light:text-gray-600">View</span>
              </button>
              <button
                onClick={() => {
                  const url = selectedFile.shareUrl
                    ? `${window.location.origin}${selectedFile.shareUrl}`
                    : `${window.location.origin}/api/files/${selectedFile.id}`;
                  navigator.clipboard.writeText(url);
                  showToast("Link copied!");
                  setShowMobileSheet(false);
                }}
                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 light:hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[10px] text-gray-400 light:text-gray-600">Share</span>
              </button>
              <a
                href={`/api/files/${selectedFile.id}/proxy?download=1`}
                download={selectedFile.name}
                onClick={() => setShowMobileSheet(false)}
                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 light:hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Download className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-[10px] text-gray-400 light:text-gray-600">Download</span>
              </a>
              <button
                onClick={() => { router.push(`/files?highlight=${selectedFile.id}`); setShowMobileSheet(false); }}
                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 light:hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Info className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-[10px] text-gray-400 light:text-gray-600">Details</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Desktop Preview Modal */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85" onClick={() => setShowPreview(false)}>
          <div
            className="relative max-w-5xl w-full bg-[#171717] light:bg-[#f5f5f5] rounded-2xl border border-gray-800 light:border-gray-200 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Media */}
            {selectedFile.mimeType?.startsWith("image/") && selectedFile.thumbnailUrl ? (
              <img src={selectedFile.url || selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-full max-h-[75vh] object-contain bg-black" />
            ) : selectedFile.mimeType?.startsWith("video/") && selectedFile.url ? (
              <video src={selectedFile.url} controls autoPlay className="w-full max-h-[75vh] bg-black" />
            ) : selectedFile.mimeType?.startsWith("audio/") && selectedFile.url ? (
              <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-violet-500/10 to-transparent">
                <Music className="w-16 h-16 text-violet-400 mb-4" />
                <audio src={selectedFile.url} controls className="w-80" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-72 bg-[#171717] light:bg-[#f0f0f0]">
                {getFileIcon(selectedFile.mimeType, "lg")}
              </div>
            )}

            {/* Bottom bar */}
            <div className="px-5 py-4 border-t border-gray-800 light:border-gray-200 flex items-center justify-between bg-[#171717] light:bg-[#f5f5f5]">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white light:text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatBytes(selectedFile.fileSize)} · {new Date(selectedFile.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <a
                  href={`/api/files/${selectedFile.id}/proxy?download=1`}
                  download={selectedFile.name}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 bg-[#1a1a1a] light:bg-gray-800 border border-gray-700 rounded-xl shadow-2xl text-sm text-white font-medium animate-fadeIn">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

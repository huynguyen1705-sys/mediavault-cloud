"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar, Loader2, Eye, Download, Folder, Image, Film, Music,
  FileText, File as FileIcon, X, ChevronLeft, ChevronRight, Trash2,
  Check, Link2, Search
} from "lucide-react";

interface TimelineFile {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  url: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  folderName: string;
  metadata: any;
}

interface TimelineGroup {
  date: string;
  files: TimelineFile[];
  count: number;
  totalSize: number;
}

type ViewMode = "day" | "week" | "month" | "year";
type FileFilter = "all" | "image" | "video" | "audio" | "document";

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string, view: ViewMode): string {
  if (view === "year") return dateStr;
  if (view === "month") {
    const [y, m] = dateStr.split("-");
    const mn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${mn[parseInt(m) - 1]} ${y}`;
  }
  const d = new Date(dateStr + "T00:00:00");
  const mn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (view === "week") return `Week of ${mn[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return `${dn[d.getDay()]}, ${mn[d.getMonth()]} ${d.getDate()}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

function getTypeIcon(mime: string | null, size = "w-5 h-5") {
  if (!mime) return <FileIcon className={`${size} text-gray-400`} />;
  if (mime.startsWith("image/")) return <Image className={`${size} text-emerald-500`} />;
  if (mime.startsWith("video/")) return <Film className={`${size} text-blue-500`} />;
  if (mime.startsWith("audio/")) return <Music className={`${size} text-pink-500`} />;
  if (mime.includes("pdf")) return <FileText className={`${size} text-red-500`} />;
  return <FileIcon className={`${size} text-gray-400`} />;
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineGroup[]>([]);
  const [view, setView] = useState<ViewMode>("day");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TimelineFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ file: TimelineFile; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Fetch presigned URL on demand
  const openPreview = async (file: TimelineFile) => {
    setPreviewFile(file);
    if (!file.url) {
      try {
        const res = await fetch(`/api/files/${file.id}/proxy`);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          setPreviewFile(prev => prev?.id === file.id ? { ...prev, url: blobUrl } : prev);
        }
      } catch { /* */ }
    }
  };

  const fetchTimeline = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ view, limit: "50" });
      if (cursor) params.set("cursor", cursor);
      if (filter !== "all") params.set("filter", filter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/timeline?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setTimeline(prev => [...prev, ...(data.timeline || [])]);
        } else {
          setTimeline(data.timeline || []);
        }
        setNextCursor(data.nextCursor || null);
      }
    } catch { /* */ }
    setLoading(false);
    setLoadingMore(false);
  }, [view, filter, searchQuery]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore && nextCursor) {
        fetchTimeline(nextCursor);
      }
    }, { rootMargin: "400px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchTimeline]);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCopyLink = async (file: TimelineFile) => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      });
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(`https://fii.one/s/${data.shareToken}`);
        showToast("Share link copied!");
      }
    } catch { showToast("Failed"); }
    setContextMenu(null);
  };

  const handleDownload = async (file: TimelineFile) => {
    try {
      const res = await fetch(`/api/files/${file.id}/proxy?download=1`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { showToast("Download failed"); }
    setContextMenu(null);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedFiles.size} files permanently?`)) return;
    try {
      const res = await fetch("/api/files/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selectedFiles) }),
      });
      if (res.ok) {
        showToast(`Deleted ${selectedFiles.size} files`);
        setSelectedFiles(new Set());
        fetchTimeline();
      }
    } catch { showToast("Delete failed"); }
  };

  const totalFiles = timeline.reduce((s, g) => s + g.count, 0);
  const totalSize = timeline.reduce((s, g) => s + g.totalSize, 0);

  const allFiles = timeline.flatMap(g => g.files);

  const filters: { key: FileFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Folder className="w-3.5 h-3.5" /> },
    { key: "image", label: "Photos", icon: <Image className="w-3.5 h-3.5" /> },
    { key: "video", label: "Videos", icon: <Film className="w-3.5 h-3.5" /> },
    { key: "audio", label: "Audio", icon: <Music className="w-3.5 h-3.5" /> },
    { key: "document", label: "Docs", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Timeline</h1>
                <p className="text-xs text-gray-500 dark:text-white/40">{totalFiles.toLocaleString()} files · {formatBytes(totalSize)}</p>
              </div>
            </div>

            {/* View Selector */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
              {(["day", "week", "month", "year"] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    view === v
                      ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                  }`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Filters + Search */}
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  filter === f.key
                    ? "bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm"
                    : "text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10"
                }`}>
                {f.icon} {f.label}
              </button>
            ))}

            <div className="flex-1" />

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
              <input
                type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="pl-9 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-violet-500 w-48"
              />
            </div>

            {selectedFiles.size > 0 && (
              <>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{selectedFiles.size} selected</span>
                <button onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
                <button onClick={() => setSelectedFiles(new Set())} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white/60">Clear</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content — Vertical Timeline */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Calendar className="w-16 h-16 text-gray-200 dark:text-white/10 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No files found</h2>
            <p className="text-sm text-gray-500 dark:text-white/40">Upload files or try different filters</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-violet-300 dark:from-violet-500/30 via-gray-200 dark:via-white/10 to-transparent" />

            <div className="space-y-8">
              {timeline.map((group) => {
                const today = isToday(group.date);
                const images = group.files.filter(f => f.mimeType?.startsWith("image/")).length;
                const videos = group.files.filter(f => f.mimeType?.startsWith("video/")).length;
                const audio = group.files.filter(f => f.mimeType?.startsWith("audio/")).length;

                return (
                  <div key={group.date} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1">
                      <div className={`relative rounded-full ring-4 ring-gray-50 dark:ring-[#0a0a0a] ${
                        today ? "w-5 h-5 bg-violet-500 shadow-lg shadow-violet-500/40"
                        : group.count >= 10 ? "w-4 h-4 bg-violet-400 dark:bg-violet-500"
                        : group.count >= 5 ? "w-3.5 h-3.5 bg-cyan-400 dark:bg-cyan-500"
                        : "w-3 h-3 bg-gray-300 dark:bg-white/25"
                      }`} />
                      {today && <div className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-30" />}
                    </div>

                    {/* Date Header */}
                    <div className="mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className={`text-lg font-bold ${today ? "text-violet-600 dark:text-violet-400" : "text-gray-900 dark:text-white"}`}>
                          {today ? "Today" : formatDate(group.date, view)}
                        </h2>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          group.count >= 10 ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300"
                          : group.count >= 5 ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300"
                          : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40"
                        }`}>{group.count} files</span>
                        <span className="text-xs text-gray-400 dark:text-white/30">{formatBytes(group.totalSize)}</span>
                        {/* Type tags */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {images > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">📷 {images}</span>}
                          {videos > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">🎬 {videos}</span>}
                          {audio > 0 && <span className="px-1.5 py-0.5 rounded bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 font-medium">🎵 {audio}</span>}
                        </div>
                      </div>
                    </div>

                    {/* File Grid — Thumbnail Mosaic */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {group.files.map(file => {
                        const isSelected = selectedFiles.has(file.id);
                        return (
                          <div
                            key={file.id}
                            className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all ${
                              isSelected
                                ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-[#0a0a0a]"
                                : "hover:ring-2 hover:ring-violet-500/50 hover:ring-offset-1 hover:ring-offset-gray-50 dark:hover:ring-offset-[#0a0a0a]"
                            }`}
                            onClick={() => openPreview(file)}
                            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}
                          >
                            {/* Thumbnail / Placeholder */}
                            {file.thumbnailUrl ? (
                              <div className="aspect-square bg-gray-100 dark:bg-white/5">
                                <img src={file.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ) : (
                              <div className="aspect-square bg-gray-100 dark:bg-white/[0.03] border-2 border-gray-200 dark:border-white/5 flex flex-col items-center justify-center gap-1">
                                {getTypeIcon(file.mimeType, "w-8 h-8")}
                                <span className="text-[9px] text-gray-400 dark:text-white/25 font-medium uppercase tracking-wider">
                                  {file.mimeType?.split("/")[1]?.split("+")[0]?.substring(0, 4) || "FILE"}
                                </span>
                              </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                              <p className="text-[11px] font-medium text-white truncate">{file.name}</p>
                              <p className="text-[9px] text-white/60">{formatBytes(Number(file.fileSize))}</p>
                            </div>

                            {/* Checkbox */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-violet-600 border-violet-600"
                                  : "bg-black/30 border-white/30 opacity-0 group-hover:opacity-100"
                              } border`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>

                            {/* Quick Actions */}
                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                className="p-1 bg-black/40 hover:bg-black/60 rounded-md transition-colors" title="Download">
                                <Download className="w-3 h-3 text-white" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleCopyLink(file); }}
                                className="p-1 bg-black/40 hover:bg-black/60 rounded-md transition-colors" title="Share">
                                <Link2 className="w-3 h-3 text-white" />
                              </button>
                            </div>

                            {/* Video duration indicator */}
                            {file.mimeType?.startsWith("video/") && (
                              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-medium">
                                <Film className="w-3 h-3 inline mr-0.5" /> Video
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {group.count > group.files.length && (
                      <p className="text-xs text-gray-400 dark:text-white/25 mt-2">
                        +{group.count - group.files.length} more files
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-10" />
            {loadingMore && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500 mr-2" />
                <span className="text-sm text-gray-500 dark:text-white/40">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { openPreview(contextMenu.file); setContextMenu(null); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={() => handleDownload(contextMenu.file)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5">
            <Download className="w-4 h-4" /> Download
          </button>
          <button onClick={() => handleCopyLink(contextMenu.file)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5">
            <Link2 className="w-4 h-4" /> Copy Share Link
          </button>
          <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
          <button onClick={() => { toggleSelect(contextMenu.file.id); setContextMenu(null); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5">
            <Check className="w-4 h-4" /> {selectedFiles.has(contextMenu.file.id) ? "Deselect" : "Select"}
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <X className="w-6 h-6 text-white" />
          </button>
          {(() => {
            const idx = allFiles.findIndex(f => f.id === previewFile.id);
            return (
              <>
                {idx > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); openPreview(allFiles[idx - 1]); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                )}
                {idx < allFiles.length - 1 && (
                  <button onClick={(e) => { e.stopPropagation(); openPreview(allFiles[idx + 1]); }}
                    className="absolute right-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                )}
              </>
            );
          })()}
          <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {!previewFile.url && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
              </div>
            )}
            {previewFile.mimeType?.startsWith("image/") && previewFile.url && (
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[78vh] object-contain rounded-xl" />
            )}
            {previewFile.mimeType?.startsWith("video/") && previewFile.url && (
              <video src={previewFile.url} controls className="max-w-full max-h-[78vh] rounded-xl" autoPlay />
            )}
            {previewFile.mimeType?.startsWith("audio/") && previewFile.url && (
              <div className="bg-[#1a1a1a] rounded-xl p-8 w-full max-w-md"><audio src={previewFile.url} controls className="w-full" /></div>
            )}
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-white">{previewFile.name}</p>
              <p className="text-xs text-white/40 mt-1">
                {formatBytes(Number(previewFile.fileSize))} · {previewFile.folderName} · {new Date(previewFile.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => handleDownload(previewFile)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => handleCopyLink(previewFile)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

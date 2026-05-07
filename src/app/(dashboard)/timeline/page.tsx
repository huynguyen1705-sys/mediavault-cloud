"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar, Loader2, Eye, Download, Share2, Folder, Image, Film, Music,
  FileText, File as FileIcon, X, ChevronLeft, ChevronRight, Trash2,
  Filter, Copy, Check, Link2, FolderInput, ArrowDown, Search, CalendarDays
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
type FileFilter = "all" | "image" | "video" | "audio" | "document" | "other";

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
    const [year, month] = dateStr.split("-");
    const mn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${mn[parseInt(month) - 1]} ${year}`;
  }
  const d = new Date(dateStr + "T00:00:00");
  const mn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (view === "week") return `Week of ${mn[d.getMonth()]} ${d.getDate()}`;
  return `${dn[d.getDay()]}, ${mn[d.getMonth()]} ${d.getDate()}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

function matchesFilter(mime: string | null, filter: FileFilter): boolean {
  if (filter === "all") return true;
  if (!mime) return filter === "other";
  if (filter === "image") return mime.startsWith("image/");
  if (filter === "video") return mime.startsWith("video/");
  if (filter === "audio") return mime.startsWith("audio/");
  if (filter === "document") return mime.includes("pdf") || mime.includes("document") || mime.includes("sheet") || mime.includes("text") || mime.includes("presentation");
  return !mime.startsWith("image/") && !mime.startsWith("video/") && !mime.startsWith("audio/");
}

function getTypeIcon(mime: string | null, size = "w-4 h-4") {
  if (!mime) return <FileIcon className={`${size} text-gray-400`} />;
  if (mime.startsWith("image/")) return <Image className={`${size} text-emerald-500`} />;
  if (mime.startsWith("video/")) return <Film className={`${size} text-blue-500`} />;
  if (mime.startsWith("audio/")) return <Music className={`${size} text-pink-500`} />;
  if (mime.includes("pdf")) return <FileText className={`${size} text-red-500`} />;
  return <FileIcon className={`${size} text-gray-400`} />;
}

function getTypeBg(mime: string | null): string {
  if (!mime) return "from-gray-500/20 to-gray-600/20";
  if (mime.startsWith("image/")) return "from-emerald-500/20 to-emerald-600/20";
  if (mime.startsWith("video/")) return "from-blue-500/20 to-blue-600/20";
  if (mime.startsWith("audio/")) return "from-pink-500/20 to-pink-600/20";
  if (mime.includes("pdf")) return "from-red-500/20 to-red-600/20";
  return "from-gray-500/20 to-gray-600/20";
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineGroup[]>([]);
  const [view, setView] = useState<ViewMode>("day");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<TimelineFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ file: TimelineFile; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timeline?view=${view}&limit=300`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [view]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const scrollTimeline = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === "left" ? -420 : 420, behavior: "smooth" });
  };

  // Filter + search
  const filteredTimeline = timeline.map(group => {
    const filtered = group.files.filter(f => {
      if (!matchesFilter(f.mimeType, filter)) return false;
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    return { ...group, files: filtered, count: filtered.length };
  }).filter(g => g.count > 0);

  // Toggle file selection
  const toggleSelect = (id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Bulk actions
  const handleBulkShare = async () => {
    showToast(`Creating share links for ${selectedFiles.size} files...`);
    // TODO: implement bulk share API
    setSelectedFiles(new Set());
  };

  const handleBulkDownload = () => {
    selectedFiles.forEach(id => {
      const file = timeline.flatMap(g => g.files).find(f => f.id === id);
      if (file?.url) {
        const a = document.createElement("a");
        a.href = file.url;
        a.download = file.name;
        a.click();
      }
    });
    showToast(`Downloading ${selectedFiles.size} files`);
    setSelectedFiles(new Set());
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

  // Context menu actions
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
    } catch { showToast("Failed to create share link"); }
    setContextMenu(null);
  };

  const handleDownload = (file: TimelineFile) => {
    if (file.url) {
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name;
      a.click();
    }
    setContextMenu(null);
  };

  // Stats
  const totalFiles = filteredTimeline.reduce((s, g) => s + g.count, 0);
  const totalSize = filteredTimeline.reduce((s, g) => s + g.totalSize, 0);

  const filters: { key: FileFilter; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: <Folder className="w-3.5 h-3.5" /> },
    { key: "image", label: "Images", icon: <Image className="w-3.5 h-3.5" /> },
    { key: "video", label: "Videos", icon: <Film className="w-3.5 h-3.5" /> },
    { key: "audio", label: "Audio", icon: <Music className="w-3.5 h-3.5" /> },
    { key: "document", label: "Docs", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-medium text-sm flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
        <div className="max-w-[98%] mx-auto px-4 py-3">
          {/* Row 1: Title + Zoom */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Calendar className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Timeline</h1>
                <p className="text-[11px] text-gray-500 dark:text-white/40">
                  {totalFiles} files · {formatBytes(totalSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => scrollTimeline("left")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-white/50" />
              </button>
              <button onClick={() => scrollTimeline("right")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-white/50" />
              </button>
              <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-1" />
              {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    view === v
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                      : "text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Filters + Search + Bulk Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* File type filters */}
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  filter === f.key
                    ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                    : "text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5"
                }`}>
                {f.icon} {f.label}
              </button>
            ))}

            <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-1" />

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="pl-8 pr-3 py-1.5 text-[11px] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 w-44"
              />
            </div>

            {/* Bulk Actions (when files selected) */}
            {selectedFiles.size > 0 && (
              <>
                <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-1" />
                <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                  {selectedFiles.size} selected
                </span>
                <button onClick={handleBulkDownload}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                  <Download className="w-3 h-3" /> Download
                </button>
                <button onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
                <button onClick={() => setSelectedFiles(new Set())}
                  className="text-[11px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition-colors">
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : filteredTimeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="w-16 h-16 text-gray-200 dark:text-white/10 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white/90 mb-2">
            {timeline.length === 0 ? "No Files Yet" : "No matching files"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-white/40">
            {timeline.length === 0 ? "Upload some files to see your timeline" : "Try adjusting filters or search"}
          </p>
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: "thin" }}>
          {/* Timeline rail */}
          <div className="relative px-6 py-6">
            {/* Horizontal line — animated gradient */}
            <div className="absolute top-[52px] left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500/0 via-violet-500/30 dark:via-violet-400/20 to-violet-500/0" />
            <div className="absolute top-[51px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent" />

            <div className="inline-flex gap-5">
              {filteredTimeline.map((group) => (
                <div key={group.date} className="flex-shrink-0 w-80">
                  {/* Date Marker */}
                  <div className="relative flex items-center gap-3 mb-4">
                    {/* Dot on rail — size based on file count */}
                    <div className="relative">
                      <div className={`rounded-full shrink-0 ring-4 ring-gray-50 dark:ring-[#0a0a0a] transition-all ${
                        isToday(group.date)
                          ? "w-4 h-4 bg-violet-500 shadow-lg shadow-violet-500/40"
                          : group.count >= 10 ? "w-3.5 h-3.5 bg-violet-400 dark:bg-violet-500/60"
                          : group.count >= 5 ? "w-3 h-3 bg-cyan-400 dark:bg-cyan-500/50"
                          : "w-2.5 h-2.5 bg-gray-300 dark:bg-white/20"
                      }`} />
                      {isToday(group.date) && (
                        <div className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-bold ${
                          isToday(group.date) ? "text-violet-600 dark:text-violet-400" : "text-gray-900 dark:text-white"
                        }`}>
                          {isToday(group.date) ? "Today" : formatDate(group.date, view)}
                        </h3>
                        {/* File count badge */}
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                          group.count >= 10 ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300"
                          : group.count >= 5 ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300"
                          : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40"
                        }`}>
                          {group.count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-gray-500 dark:text-white/40">
                          {formatBytes(group.totalSize)}
                        </p>
                        {/* Mini type breakdown */}
                        <div className="flex items-center gap-1">
                          {(() => {
                            const images = group.files.filter(f => f.mimeType?.startsWith("image/")).length;
                            const videos = group.files.filter(f => f.mimeType?.startsWith("video/")).length;
                            const audio = group.files.filter(f => f.mimeType?.startsWith("audio/")).length;
                            const docs = group.files.filter(f => f.mimeType?.includes("pdf") || f.mimeType?.includes("document")).length;
                            return (
                              <>
                                {images > 0 && <span className="text-[9px] text-emerald-500 dark:text-emerald-400/70">📷{images}</span>}
                                {videos > 0 && <span className="text-[9px] text-blue-500 dark:text-blue-400/70">🎬{videos}</span>}
                                {audio > 0 && <span className="text-[9px] text-pink-500 dark:text-pink-400/70">🎵{audio}</span>}
                                {docs > 0 && <span className="text-[9px] text-red-500 dark:text-red-400/70">📄{docs}</span>}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      {/* Activity bar — visual weight indicator */}
                      <div className="mt-1.5 w-full h-1 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            group.count >= 10 ? "bg-gradient-to-r from-violet-500 to-violet-400" 
                            : group.count >= 5 ? "bg-gradient-to-r from-cyan-500 to-cyan-400"
                            : "bg-gray-300 dark:bg-white/20"
                          }`}
                          style={{ width: `${Math.min(100, (group.count / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* File Cards — Tree style */}
                  <div className="relative pl-6">
                    {/* Vertical tree line from date dot down through files */}
                    <div className="absolute left-[5px] top-0 bottom-2 w-px bg-gradient-to-b from-gray-300 dark:from-white/15 via-gray-200 dark:via-white/10 to-transparent" />

                    <div className="space-y-1.5">
                    {group.files.map((file) => {
                      const isSelected = selectedFiles.has(file.id);
                      return (
                        <div
                          key={file.id}
                          className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ml-3 ${
                            isSelected
                              ? "bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/30 border ring-1 ring-violet-200 dark:ring-violet-500/20"
                              : "bg-[#f3f4f6] dark:bg-white/[0.03] hover:bg-[#e5e7eb] dark:hover:bg-white/[0.06] border-2 border-[#9ca3af] dark:border-white/5 shadow-md dark:shadow-none"
                          }`}
                          onClick={() => setPreviewFile(file)}
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}
                        >
                          {/* Tree branch connector */}
                          <div className="absolute -left-[15px] top-1/2 w-[12px] h-px bg-gray-300 dark:bg-white/15" />
                          <div className="absolute -left-[15px] top-1/2 w-[5px] h-[5px] -translate-y-1/2 rounded-full bg-gray-300 dark:bg-white/20 ring-2 ring-gray-50 dark:ring-[#0a0a0a]" />
                          {/* Checkbox */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? "bg-violet-600 border-violet-600"
                                : "border-gray-300 dark:border-white/20 opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>

                          {/* Thumbnail */}
                          {file.thumbnailUrl ? (
                            <img src={file.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getTypeBg(file.mimeType)} flex items-center justify-center shrink-0`}>
                              {getTypeIcon(file.mimeType)}
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-gray-900 dark:text-white/90 truncate">{file.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-500 dark:text-white/40">{formatBytes(Number(file.fileSize))}</span>
                              <span className="text-[10px] text-gray-400 dark:text-white/25">
                                {new Date(file.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>

                          {/* Quick actions on hover */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Download">
                              <Download className="w-3.5 h-3.5 text-gray-500 dark:text-white/40" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleCopyLink(file); }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Share">
                              <Link2 className="w-3.5 h-3.5 text-gray-500 dark:text-white/40" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {group.count > group.files.length && (
                      <div className="relative ml-3 py-1">
                        <div className="absolute -left-[15px] top-1/2 w-[12px] h-px bg-gray-200 dark:bg-white/10" />
                        <div className="absolute -left-[15px] top-1/2 w-[4px] h-[4px] -translate-y-1/2 rounded-full bg-gray-200 dark:bg-white/10" />
                        <p className="text-[11px] text-gray-400 dark:text-white/25 pl-2">
                          +{group.count - group.files.length} more
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-1 overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { setPreviewFile(contextMenu.file); setContextMenu(null); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button onClick={() => handleDownload(contextMenu.file)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button onClick={() => handleCopyLink(contextMenu.file)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <Link2 className="w-3.5 h-3.5" /> Copy Share Link
          </button>
          <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
          <button onClick={() => { toggleSelect(contextMenu.file.id); setContextMenu(null); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <Check className="w-3.5 h-3.5" /> {selectedFiles.has(contextMenu.file.id) ? "Deselect" : "Select"}
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <X className="w-6 h-6 text-white" />
          </button>
          {/* Nav arrows */}
          {(() => {
            const allFiles = filteredTimeline.flatMap(g => g.files);
            const idx = allFiles.findIndex(f => f.id === previewFile.id);
            return (
              <>
                {idx > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); setPreviewFile(allFiles[idx - 1]); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                )}
                {idx < allFiles.length - 1 && (
                  <button onClick={(e) => { e.stopPropagation(); setPreviewFile(allFiles[idx + 1]); }}
                    className="absolute right-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10">
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                )}
              </>
            );
          })()}
          <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
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
            {/* Action buttons below preview */}
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => handleDownload(previewFile)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => handleCopyLink(previewFile)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                <Link2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

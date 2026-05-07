"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, ZoomIn, ZoomOut, Loader2, Eye, Download, Share2, Folder, Image, Film, Music, FileText, File as FileIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

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
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }
  const d = new Date(dateStr);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  if (view === "week") {
    return `Week of ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  
  return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getTypeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="w-4 h-4 text-gray-400" />;
  if (mime.startsWith("image/")) return <Image className="w-4 h-4 text-emerald-400" />;
  if (mime.startsWith("video/")) return <Film className="w-4 h-4 text-blue-400" />;
  if (mime.startsWith("audio/")) return <Music className="w-4 h-4 text-pink-400" />;
  if (mime.includes("pdf")) return <FileText className="w-4 h-4 text-red-400" />;
  return <FileIcon className="w-4 h-4 text-gray-400" />;
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineGroup[]>([]);
  const [view, setView] = useState<ViewMode>("day");
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<TimelineFile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timeline?view=${view}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [view]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const scrollTimeline = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
        <div className="max-w-[98%] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Timeline</h1>
                <p className="text-xs text-gray-500 dark:text-white/40">Visual journey through your files</p>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={scrollTimeline.bind(null, "left")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-white/60" />
              </button>
              <button
                onClick={scrollTimeline.bind(null, "right")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-white/60" />
              </button>
              
              <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />

              {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    view === v
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="w-16 h-16 text-gray-300 dark:text-white/10 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white/90 mb-2">No Files Yet</h2>
          <p className="text-sm text-gray-500 dark:text-white/40">Upload some files to see your timeline</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden px-4 py-6"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="inline-flex gap-6 min-h-[calc(100vh-140px)]">
            {timeline.map((group) => (
              <div
                key={group.date}
                className="flex-shrink-0 w-80"
              >
                {/* Date Header */}
                <div className="sticky top-[88px] z-[5] bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-xl p-3 mb-3 shadow-sm dark:shadow-none">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(group.date, view)}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-white/40">
                    <span>{group.count} files</span>
                    <span>·</span>
                    <span>{formatBytes(group.totalSize)}</span>
                  </div>
                </div>

                {/* Files Grid */}
                <div className="space-y-2">
                  {group.files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setPreviewFile(file)}
                      className="group cursor-pointer bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/5 rounded-xl p-3 transition-all hover:shadow-md dark:hover:shadow-none"
                    >
                      <div className="flex items-center gap-3">
                        {file.thumbnailUrl ? (
                          <img
                            src={file.thumbnailUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0 ring-1 ring-gray-200 dark:ring-white/10"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0 ring-1 ring-gray-200 dark:ring-white/10">
                            {getTypeIcon(file.mimeType)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white/90 truncate">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-white/40">{formatBytes(Number(file.fileSize))}</span>
                            <span className="text-xs text-gray-400 dark:text-white/30 flex items-center gap-1">
                              <Folder className="w-2.5 h-2.5" /> {file.folderName}
                            </span>
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-gray-400 dark:text-white/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>
                  ))}

                  {group.count > group.files.length && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-400 dark:text-white/30">
                        +{group.count - group.files.length} more files
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {previewFile.mimeType?.startsWith("image/") && previewFile.url && (
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            )}
            {previewFile.mimeType?.startsWith("video/") && previewFile.url && (
              <video src={previewFile.url} controls className="max-w-full max-h-[80vh] rounded-xl" autoPlay />
            )}
            {previewFile.mimeType?.startsWith("audio/") && previewFile.url && (
              <div className="bg-[#1a1a1a] rounded-xl p-8 w-full max-w-md">
                <audio src={previewFile.url} controls className="w-full" />
              </div>
            )}
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-white">{previewFile.name}</p>
              <p className="text-xs text-white/40 mt-1">{formatBytes(Number(previewFile.fileSize))} · {previewFile.folderName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

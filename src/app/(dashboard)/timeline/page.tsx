"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2, Download, X, ChevronLeft, ChevronRight,
  Check, Link2, Image, Film, Music, FileText, File as FileIcon,
  ZoomIn, ZoomOut, Eye, ArrowLeft
} from "lucide-react";

/* ═══════════ TYPES ═══════════ */
interface MonthData {
  month: number;
  count: number;
  size: number;
  types: { type: string; count: number }[];
  sampleThumbnails: string[];
}

interface DayData {
  day: number;
  date: string;
  count: number;
  size: number;
  sampleThumbnails: string[];
  dayOfWeek: number;
}

interface FileData {
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

type ZoomLevel = "year" | "month" | "day";

/* ═══════════ HELPERS ═══════════ */
function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getTypeIcon(mime: string | null, size = "w-5 h-5") {
  if (!mime) return <FileIcon className={`${size} text-gray-400`} />;
  if (mime.startsWith("image/")) return <Image className={`${size} text-emerald-500`} />;
  if (mime.startsWith("video/")) return <Film className={`${size} text-blue-500`} />;
  if (mime.startsWith("audio/")) return <Music className={`${size} text-pink-500`} />;
  if (mime.includes("pdf")) return <FileText className={`${size} text-red-500`} />;
  return <FileIcon className={`${size} text-gray-400`} />;
}

function intensityColor(count: number, max: number, isDark: boolean): string {
  if (count === 0) return isDark ? "bg-white/[0.02]" : "bg-gray-50";
  const r = count / max;
  if (isDark) {
    if (r >= 0.75) return "bg-violet-500/40";
    if (r >= 0.5) return "bg-violet-500/25";
    if (r >= 0.25) return "bg-violet-500/15";
    return "bg-violet-500/8";
  } else {
    if (r >= 0.75) return "bg-violet-100";
    if (r >= 0.5) return "bg-violet-50";
    if (r >= 0.25) return "bg-violet-50/60";
    return "bg-violet-50/30";
  }
}

function intensityBorder(count: number, max: number, isDark: boolean): string {
  if (count === 0) return isDark ? "border-white/5" : "border-gray-100";
  const r = count / max;
  if (isDark) {
    if (r >= 0.5) return "border-violet-500/30";
    return "border-violet-500/15";
  } else {
    if (r >= 0.5) return "border-violet-300";
    return "border-violet-200";
  }
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function TimelinePage() {
  const [zoom, setZoom] = useState<ZoomLevel>("year");
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthKey, setMonthKey] = useState(""); // "2026-05"
  const [dayKey, setDayKey] = useState(""); // "2026-05-07"
  const [months, setMonths] = useState<MonthData[]>([]);
  const [days, setDays] = useState<DayData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [maxCount, setMaxCount] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Theme detection
  useEffect(() => {
    const check = () => setIsDark(!document.documentElement.classList.contains("light"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Fetch data based on zoom level
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/timeline?";
      if (zoom === "year") url += `zoom=year&y=${year}`;
      else if (zoom === "month") url += `zoom=month&m=${monthKey}`;
      else url += `zoom=day&d=${dayKey}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (zoom === "year") {
          setMonths(data.months || []);
          setTotalFiles(data.totalFiles || 0);
          setTotalSize(data.totalSize || 0);
          setMaxCount(data.maxCount || 1);
        } else if (zoom === "month") {
          setDays(data.days || []);
          setTotalFiles(data.totalFiles || 0);
          setMaxCount(data.maxCount || 1);
        } else {
          setFiles(data.files || []);
          setTotalFiles(data.totalFiles || 0);
        }
      }
    } catch { /* */ }
    setLoading(false);
  }, [zoom, year, monthKey, dayKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Navigation
  const zoomIntoMonth = (month: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setMonthKey(`${year}-${String(month).padStart(2, "0")}`);
      setZoom("month");
      setTransitioning(false);
    }, 200);
  };

  const zoomIntoDay = (date: string) => {
    setTransitioning(true);
    setTimeout(() => {
      setDayKey(date);
      setZoom("day");
      setTransitioning(false);
    }, 200);
  };

  const zoomOut = () => {
    setTransitioning(true);
    setTimeout(() => {
      if (zoom === "day") {
        setZoom("month");
      } else if (zoom === "month") {
        setZoom("year");
      }
      setTransitioning(false);
    }, 200);
  };

  // Preview
  const openPreview = async (file: FileData) => {
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

  const handleCopyLink = async (file: FileData) => {
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
  };

  const handleDownload = async (file: FileData) => {
    try {
      const res = await fetch(`/api/files/${file.id}/proxy?download=1`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { showToast("Download failed"); }
  };

  // Breadcrumb
  const breadcrumb = () => {
    const parts: { label: string; action?: () => void }[] = [];
    parts.push({ label: String(year), action: zoom !== "year" ? () => { setZoom("year"); } : undefined });
    if (zoom === "month" || zoom === "day") {
      const [, m] = monthKey.split("-");
      parts.push({ label: MONTH_NAMES[parseInt(m) - 1], action: zoom === "day" ? () => { setZoom("month"); } : undefined });
    }
    if (zoom === "day") {
      const d = new Date(dayKey + "T00:00:00");
      parts.push({ label: `${d.getDate()} ${DAY_NAMES[d.getDay()]}` });
    }
    return parts;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060608] transition-colors">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Navigation Bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#060608]/80 backdrop-blur-2xl border-b border-gray-200/60 dark:border-white/[0.04]">
        <div className="w-[98%] mx-auto py-4">
          <div className="flex items-center justify-between">
            {/* Left: Breadcrumb */}
            <div className="flex items-center gap-2">
              {zoom !== "year" && (
                <button onClick={zoomOut}
                  className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-white/40" />
                </button>
              )}
              <div className="flex items-center gap-1">
                {breadcrumb().map((part, i) => (
                  <div key={i} className="flex items-center">
                    {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/15 mx-1" />}
                    {part.action ? (
                      <button onClick={part.action}
                        className="text-sm font-medium text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors">
                        {part.label}
                      </button>
                    ) : (
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{part.label}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Stats + Year Nav */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 dark:text-white/25 tabular-nums hidden sm:block">
                {totalFiles.toLocaleString()} files
                {zoom === "year" && ` · ${formatBytes(totalSize)}`}
              </span>

              {zoom === "year" && (
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-0.5">
                  <button onClick={() => setYear(y => y - 1)}
                    className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-white/40" />
                  </button>
                  <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[56px] text-center tabular-nums">{year}</span>
                  <button onClick={() => setYear(y => y + 1)}
                    disabled={year >= currentYear}
                    className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20">
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-white/40" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`w-[98%] mx-auto py-6 transition-all duration-300 ${transitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <span className="text-xs text-gray-400 dark:text-white/25">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {/* ═══════════ YEAR VIEW ═══════════ */}
            {zoom === "year" && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {months.map((m) => {
                  const isCurrentMonth = year === currentYear && m.month === currentMonth;
                  const hasFiles = m.count > 0;
                  const images = m.types.find(t => t.type === "image")?.count || 0;
                  const videos = m.types.find(t => t.type === "video")?.count || 0;

                  return (
                    <div
                      key={m.month}
                      onClick={() => hasFiles && zoomIntoMonth(m.month)}
                      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
                        hasFiles ? "cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/10 dark:hover:shadow-violet-500/5" : "opacity-40"
                      } ${intensityColor(m.count, maxCount, isDark)} border-2 ${intensityBorder(m.count, maxCount, isDark)}`}
                    >
                      {/* Thumbnail Mosaic */}
                      {m.sampleThumbnails.length > 0 ? (
                        <div className="aspect-[4/3] relative">
                          <div className={`grid gap-px w-full h-full ${
                            m.sampleThumbnails.length === 1 ? "grid-cols-1" :
                            m.sampleThumbnails.length <= 2 ? "grid-cols-2" :
                            m.sampleThumbnails.length <= 4 ? "grid-cols-2 grid-rows-2" : "grid-cols-3 grid-rows-2"
                          }`}>
                            {m.sampleThumbnails.map((url, i) => (
                              <img key={i} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ))}
                          </div>
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          {/* Month name on image */}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="text-lg font-bold text-white drop-shadow-lg">{MONTH_SHORT[m.month - 1]}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-white/80 font-medium">{m.count} files</span>
                              <span className="text-xs text-white/50">{formatBytes(m.size)}</span>
                            </div>
                          </div>
                          {/* Type badges */}
                          {(images > 0 || videos > 0) && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              {images > 0 && (
                                <span className="px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded-md text-[9px] text-white/90 font-medium">
                                  📷 {images}
                                </span>
                              )}
                              {videos > 0 && (
                                <span className="px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded-md text-[9px] text-white/90 font-medium">
                                  🎬 {videos}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Current month indicator */}
                          {isCurrentMonth && (
                            <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 ring-2 ring-white/30" />
                          )}
                          {/* Zoom hint on hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full flex items-center gap-1.5">
                              <ZoomIn className="w-4 h-4 text-white" />
                              <span className="text-xs font-medium text-white">Explore</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[4/3] flex flex-col items-center justify-center p-4">
                          <h3 className={`text-2xl font-bold ${isCurrentMonth ? "text-violet-500" : "text-gray-300 dark:text-white/15"}`}>
                            {MONTH_SHORT[m.month - 1]}
                          </h3>
                          {hasFiles && (
                            <span className="text-xs text-gray-400 dark:text-white/25 mt-1">{m.count} files</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══════════ MONTH VIEW (Calendar Grid) ═══════════ */}
            {zoom === "month" && (
              <div>
                {/* Day-of-week headers */}
                {/* Calendar cells — 15 columns wide */}
                <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-1.5 w-[98%] mx-auto"
                  style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>


                  {days.map((day) => {
                    const isToday = day.date === todayStr;
                    const hasFiles = day.count > 0;

                    return (
                      <div
                        key={day.day}
                        onClick={() => hasFiles && zoomIntoDay(day.date)}
                        className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
                          hasFiles ? "cursor-pointer hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-500/10" : ""
                        } ${intensityColor(day.count, maxCount, isDark)} border ${intensityBorder(day.count, maxCount, isDark)} ${
                          isToday ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-[#060608]" : ""
                        }`}
                      >
                        {/* Thumbnail preview or empty */}
                        {day.sampleThumbnails.length > 0 ? (
                          <div className="aspect-square relative">
                            <div className={`grid gap-px w-full h-full ${
                              day.sampleThumbnails.length === 1 ? "" :
                              day.sampleThumbnails.length <= 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
                            }`}>
                              {day.sampleThumbnails.map((url, i) => (
                                <img key={i} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ))}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            {/* Day number */}
                            <div className="absolute bottom-1 left-2">
                              <span className="text-sm font-bold text-white drop-shadow-lg">{day.day}</span>
                            </div>
                            {/* Count badge */}
                            <div className="absolute top-1 right-1">
                              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                                day.count >= 10 ? "bg-violet-500 text-white" :
                                day.count >= 5 ? "bg-violet-400/80 text-white" :
                                "bg-black/30 text-white/80"
                              }`}>{day.count}</span>
                            </div>
                            {/* Hover overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                              <ZoomIn className="w-5 h-5 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-square flex items-center justify-center">
                            <span className={`text-sm font-medium ${
                              isToday ? "text-violet-600 dark:text-violet-400 font-bold" :
                              hasFiles ? "text-gray-700 dark:text-white/60" :
                              "text-gray-300 dark:text-white/10"
                            }`}>{day.day}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Month density bar */}
                <div className="mt-6 flex items-center gap-1">
                  {days.map(day => (
                    <div
                      key={day.day}
                      onClick={() => day.count > 0 && zoomIntoDay(day.date)}
                      className={`flex-1 h-2 rounded-full transition-all ${
                        day.count > 0 ? "cursor-pointer hover:h-3" : ""
                      } ${intensityColor(day.count, maxCount, isDark)}`}
                      title={`${MONTH_SHORT[parseInt(monthKey.split("-")[1]) - 1]} ${day.day}: ${day.count} files`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════ DAY VIEW (Masonry Gallery) ═══════════ */}
            {zoom === "day" && (
              <div>
                {files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                      <Image className="w-8 h-8 text-gray-300 dark:text-white/15" />
                    </div>
                    <p className="text-gray-500 dark:text-white/30 font-medium">No files on this day</p>
                  </div>
                ) : (
                  <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-6 xl:columns-8 gap-2 space-y-2">
                    {files.map(file => (
                      <div
                        key={file.id}
                        className="group relative break-inside-avoid rounded-xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-200"
                        onClick={() => openPreview(file)}
                      >
                        {file.thumbnailUrl ? (
                          <img src={file.thumbnailUrl} alt="" className="w-full rounded-xl" loading="lazy" />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 dark:bg-white/[0.03] border-2 border-gray-200 dark:border-white/5 rounded-xl flex flex-col items-center justify-center gap-2">
                            {getTypeIcon(file.mimeType, "w-10 h-10")}
                            <span className="text-[10px] text-gray-400 dark:text-white/25 font-medium px-2 text-center truncate max-w-full">
                              {file.name}
                            </span>
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col justify-end p-3">
                          <p className="text-xs font-medium text-white truncate">{file.name}</p>
                          <p className="text-[10px] text-white/60 mt-0.5">{formatBytes(Number(file.fileSize))}</p>
                          {/* Quick actions */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                              className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors">
                              <Download className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleCopyLink(file); }}
                              className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors">
                              <Link2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>

                        {/* Video indicator */}
                        {file.mimeType?.startsWith("video/") && (
                          <div className="absolute top-2 left-2 p-1 bg-black/40 backdrop-blur-sm rounded-md">
                            <Film className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center" onClick={() => setPreviewFile(null)}>
          <button className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full z-10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Nav arrows */}
          {(() => {
            const idx = files.findIndex(f => f.id === previewFile.id);
            return (
              <>
                {idx > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); openPreview(files[idx - 1]); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                )}
                {idx < files.length - 1 && (
                  <button onClick={(e) => { e.stopPropagation(); openPreview(files[idx + 1]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10 transition-colors">
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                )}
              </>
            );
          })()}

          <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center px-4" onClick={e => e.stopPropagation()}>
            {!previewFile.url && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              </div>
            )}
            {previewFile.mimeType?.startsWith("image/") && previewFile.url && (
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[78vh] object-contain rounded-xl" />
            )}
            {previewFile.mimeType?.startsWith("video/") && previewFile.url && (
              <video src={previewFile.url} controls className="max-w-full max-h-[78vh] rounded-xl" autoPlay />
            )}
            {previewFile.mimeType?.startsWith("audio/") && previewFile.url && (
              <div className="bg-white/5 rounded-2xl p-8 w-full max-w-md"><audio src={previewFile.url} controls className="w-full" /></div>
            )}
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-white">{previewFile.name}</p>
              <p className="text-xs text-white/30 mt-1">
                {formatBytes(Number(previewFile.fileSize))} · {previewFile.folderName}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => handleDownload(previewFile)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => handleCopyLink(previewFile)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                <Link2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

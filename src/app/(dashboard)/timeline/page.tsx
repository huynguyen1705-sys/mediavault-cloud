"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Loader2, Image, Video, Music, File, Eye, ChevronDown, ChevronRight,
  Calendar, Play, Download, Info, X, Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import TimelineDot from "@/components/TimelineDot";

/* ─── Types ─── */
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
interface DateGroup { label: string; sublabel: string; files: TimelineFile[]; }
type TimeFilter = "7days" | "30days" | "year" | "all";

const FILTER_LABELS: Record<TimeFilter, string> = {
  "7days": "Last 7 days",
  "30days": "Last 30 days",
  year: "This year",
  all: "All time",
};

/* ─── Helpers ─── */
const fmtBytes = (bytes: number | string) => {
  const b = typeof bytes === "string" ? parseInt(bytes) : bytes;
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
  if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " MB";
  if (b < 1024 * 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  return (b / (1024 * 1024 * 1024 * 1024)).toFixed(2) + " TB";
};

const fileIcon = (mime: string, size: "sm" | "md" | "lg" = "sm") => {
  const s = size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-10 h-10";
  if (mime?.startsWith("image/")) return <Image className={`${s} text-pink-400`} />;
  if (mime?.startsWith("video/")) return <Video className={`${s} text-purple-400`} />;
  if (mime?.startsWith("audio/")) return <Music className={`${s} text-yellow-400`} />;
  return <File className={`${s} text-gray-400`} />;
};

/* ─── Component ─── */
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
  const [toastMsg, setToastMsg] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);
  const [isLight, setIsLight] = useState(false);

  /* Close filter on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* Theme detection */
  useEffect(() => {
    const update = () => setIsLight(document.documentElement.classList.contains("light"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(""), 2000); };

  /* Group files by date */
  const groupByDate = useCallback((files: TimelineFile[]): DateGroup[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const buckets: Record<string, { sublabel: string; files: TimelineFile[] }> = {};

    files.forEach((f) => {
      const d = new Date(f.createdAt);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      let label: string, sublabel: string;
      if (day.getTime() === today.getTime()) {
        label = "TODAY"; sublabel = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      } else if (day.getTime() === yesterday.getTime()) {
        label = "YESTERDAY"; sublabel = yesterday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      } else if (day >= weekStart) {
        label = "THIS WEEK"; sublabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      } else if (day >= monthStart) {
        label = "THIS MONTH"; sublabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } else {
        const mk = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        label = mk.toUpperCase(); sublabel = mk;
      }
      if (!buckets[label]) buckets[label] = { sublabel, files: [] };
      buckets[label].files.push(f);
    });

    return Object.entries(buckets).map(([label, data]) => ({ label, sublabel: data.sublabel, files: data.files }));
  }, []);

  /* Fetch */
  useEffect(() => {
    if (isLoaded && user) {
      setLoading(true);
      const p = filter === "7days" ? "week" : filter === "30days" ? "month" : filter;
      fetch(`/api/timeline?filter=${p}`).then(r => r.json()).then(d => { setGroups(groupByDate(d.files || [])); setLoading(false); }).catch(() => setLoading(false));
    } else if (isLoaded && !user) router.push("/login");
  }, [isLoaded, user, filter, groupByDate, router]);

  const onFileClick = (f: TimelineFile) => {
    setSelectedFile(f);
    window.innerWidth >= 768 ? setShowPreview(true) : setShowMobileSheet(true);
  };

  /* ─── Loading ─── */
  if (!isLoaded || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );

  /* ─── Computed stats ─── */
  const totalFiles = groups.reduce((a, g) => a + g.files.length, 0);
  const totalImages = groups.reduce((a, g) => a + g.files.filter(f => f.mimeType?.startsWith("image/")).length, 0);
  const totalVideos = groups.reduce((a, g) => a + g.files.filter(f => f.mimeType?.startsWith("video/")).length, 0);
  const totalSize = groups.reduce((a, g) => a + g.files.reduce((b, f) => b + parseInt(f.fileSize || "0"), 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] light:bg-gray-50">

      {/* ══════ HEADER ══════ */}
      <div className="sticky top-16 z-30 bg-[#0a0a0a]/90 light:bg-white/90 backdrop-blur-md border-b border-gray-800 light:border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white light:text-gray-900">Timeline</h1>
              <p className="text-sm text-gray-500 mt-0.5">Your media organized by time</p>
            </div>
            <div className="relative" ref={filterRef}>
              <button onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] light:bg-white border border-gray-700 light:border-gray-300 rounded-xl text-sm text-gray-300 light:text-gray-700 hover:border-violet-500/50 transition-colors">
                <Calendar className="w-4 h-4 text-violet-400" />
                {FILTER_LABELS[filter]}
                <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] light:bg-white border border-gray-700 light:border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
                  {(Object.entries(FILTER_LABELS) as [TimeFilter, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => { setFilter(k); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filter === k ? "bg-violet-600/20 text-violet-300 light:text-violet-600" : "text-gray-300 light:text-gray-700 hover:bg-gray-800 light:hover:bg-gray-100"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ BODY ══════ */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {groups.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-[#1a1a1a] light:bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-white light:text-gray-900 font-semibold text-lg">No media yet</p>
            <p className="text-gray-500 text-sm mt-2">Upload files to see your timeline</p>
          </div>
        ) : (
          <div className="flex gap-4">

            {/* ── COL 1: Nav & Stats (desktop only) ── */}
            <div className="hidden lg:block w-[20%] shrink-0">
              <div className="sticky top-36 space-y-4">
                <div className="bg-[#141414] light:bg-white border border-gray-800 light:border-gray-200 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation</h3>
                  <div className="space-y-1">
                    {["Overview", "Timeline", "Memory", "Events"].map(item => (
                      <button key={item}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${item === "Timeline" ? "bg-violet-600/20 text-violet-300 light:text-violet-600 font-medium" : "text-gray-400 light:text-gray-600 hover:bg-gray-800 light:hover:bg-gray-100"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-[#141414] light:bg-white border border-gray-800 light:border-gray-200 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Stats</h3>
                  <div className="space-y-3">
                    {[["Total Files", totalFiles, "text-white light:text-gray-900"], ["Time Groups", groups.length, "text-white light:text-gray-900"], ["Images", totalImages, "text-pink-400"], ["Videos", totalVideos, "text-purple-400"]].map(([label, val, cls]) => (
                      <div key={label as string} className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{label as string}</span>
                        <span className={`text-sm font-semibold ${cls}`}>{val as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── COL 2: Timeline dots (tablet+) ── */}
            <div className="hidden md:block w-[20%] shrink-0">
              <div className="sticky top-36">
                <div className="bg-[#141414] light:bg-white border border-gray-800 light:border-gray-200 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Timeline</h3>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-700 light:border-gray-300" />
                    <div className="space-y-4">
                      {groups.map(g => (
                        <div key={g.label} className="relative pl-8">
                          <TimelineDot type="group" isLight={isLight} />
                          <p className="text-xs font-semibold text-white light:text-gray-900">{g.label}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{g.files.length} items</p>
                        </div>
                      ))}
                      <div className="relative pl-8"><TimelineDot type="end" isLight={isLight} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── COL 3: Main media grid ── */}
            <div className="w-full md:w-[60%] min-w-0">
              <div className="space-y-8">
                {groups.map(group => (
                  <div key={group.label}>
                    {/* Date header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500 md:hidden" />
                        <h2 className="text-base font-bold tracking-wide text-white light:text-gray-900">{group.label}</h2>
                        <span className="text-xs text-gray-500 bg-gray-800 light:bg-gray-200 px-2 py-0.5 rounded-full">{group.files.length}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-600 light:text-gray-400 hidden sm:block">{group.sublabel}</span>
                        {group.files.length > 8 && (
                          <button className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-0.5 font-medium transition-colors">
                            See all <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Masonry */}
                    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                      {group.files.slice(0, 12).map(file => {
                        const isVid = file.mimeType?.startsWith("video/");
                        return (
                          <div key={file.id} className="break-inside-avoid group cursor-pointer card-hover"
                            onClick={() => onFileClick(file)}>
                            <div className="bg-[#171717] light:bg-[#f5f5f5] rounded-2xl overflow-hidden border border-gray-800/50 light:border-gray-200 hover:border-violet-500/40 transition-all hover:shadow-lg hover:shadow-black/20">
                              {file.thumbnailUrl ? (
                                <div className="relative overflow-hidden">
                                  <img src={file.thumbnailUrl} alt={file.name}
                                    className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                    loading="lazy" style={{ minHeight: "120px", maxHeight: "280px" }} />
                                  {isVid && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                                      </div>
                                    </div>
                                  )}
                                  {isVid && <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-medium text-white/80 backdrop-blur-sm">VIDEO</div>}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center py-10 bg-[#171717] light:bg-[#f0f0f0]">
                                  {fileIcon(file.mimeType, "lg")}
                                </div>
                              )}
                              <div className="px-3 py-2.5">
                                <p className="text-xs font-medium text-gray-200 light:text-gray-800 truncate leading-tight">{file.name}</p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  {fmtBytes(file.fileSize)} · {new Date(file.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── COL 4: File details & Insights (desktop only) ── */}
            <div className="hidden lg:block w-[20%] shrink-0">
              <div className="sticky top-36 space-y-4">
                {selectedFile ? (
                  <div className="bg-[#141414] light:bg-white border border-gray-800 light:border-gray-200 rounded-2xl overflow-hidden">
                    {selectedFile.thumbnailUrl ? (
                      <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-[#1a1a1a] light:bg-gray-100 flex items-center justify-center">
                        {fileIcon(selectedFile.mimeType, "lg")}
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-white light:text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{fmtBytes(selectedFile.fileSize)} · {new Date(selectedFile.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 bg-violet-600/20 text-violet-300 light:text-violet-600 rounded-full font-medium">{selectedFile.mimeType?.split("/")[0]?.toUpperCase()}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-800 light:bg-gray-200 text-gray-400 light:text-gray-600 rounded-full">{selectedFile.name.split(".").pop()?.toUpperCase()}</span>
                      </div>
                      <div className="mt-4 space-y-2">
                        <button onClick={() => setShowPreview(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs text-white font-medium transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                        <a href={`/api/files/${selectedFile.id}/proxy?download=1`} download={selectedFile.name}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 light:bg-gray-100 hover:bg-gray-700 light:hover:bg-gray-200 rounded-lg text-xs text-gray-300 light:text-gray-700 font-medium transition-colors">
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                        {selectedFile.shareUrl && (
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${selectedFile.shareUrl}`); toast("Link copied!"); }}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 light:bg-gray-100 hover:bg-gray-700 light:hover:bg-gray-200 rounded-lg text-xs text-gray-300 light:text-gray-700 font-medium transition-colors">
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#141414] light:bg-white border border-gray-800 light:border-gray-200 rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-gray-800 light:bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Eye className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-xs text-gray-500">Click a file to see details</p>
                  </div>
                )}
                <div className="bg-[#141414] light:bg-white border border-gray-800 light:border-gray-200 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Insights</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Storage used</span>
                        <span className="text-gray-300 light:text-gray-700">{fmtBytes(totalSize)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 light:bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: "45%" }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-500">Last Upload</span>
                      <span className="text-[10px] text-gray-300 light:text-gray-700">
                        {groups[0]?.files[0] ? new Date(groups[0].files[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ══════ MOBILE BOTTOM SHEET ══════ */}
      {showMobileSheet && selectedFile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowMobileSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414] light:bg-white rounded-t-2xl border-t border-gray-800 light:border-gray-200 animate-sheet-in">
            <div className="w-10 h-1 bg-gray-600 light:bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="flex flex-col items-center p-6">
              {selectedFile.thumbnailUrl ? (
                <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-32 h-32 object-cover rounded-xl mb-4" />
              ) : (
                <div className="w-32 h-32 bg-[#1a1a1a] light:bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  {fileIcon(selectedFile.mimeType, "lg")}
                </div>
              )}
              <p className="text-base font-semibold text-white light:text-gray-900 truncate max-w-[calc(100%-2rem)]">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">{fmtBytes(selectedFile.fileSize)} · {new Date(selectedFile.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              <div className="mt-6 w-full flex justify-around">
                <button onClick={() => { setShowPreview(true); setShowMobileSheet(false); }}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 light:hover:bg-gray-100 rounded-xl transition-colors">
                  <div className="w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center"><Eye className="w-5 h-5 text-violet-400" /></div>
                  <span className="text-[10px] text-gray-400 light:text-gray-600">Preview</span>
                </button>
                <a href={`/api/files/${selectedFile.id}/proxy?download=1`} download={selectedFile.name}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 light:hover:bg-gray-100 rounded-xl transition-colors">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center"><Download className="w-5 h-5 text-emerald-400" /></div>
                  <span className="text-[10px] text-gray-400 light:text-gray-600">Download</span>
                </a>
                <button onClick={() => { router.push(`/files?highlight=${selectedFile.id}`); setShowMobileSheet(false); }}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 light:hover:bg-gray-100 rounded-xl transition-colors">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center"><Info className="w-5 h-5 text-blue-400" /></div>
                  <span className="text-[10px] text-gray-400 light:text-gray-600">Details</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════ DESKTOP PREVIEW MODAL ══════ */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85" onClick={() => setShowPreview(false)}>
          <div className="relative max-w-5xl w-full bg-[#171717] light:bg-[#f5f5f5] rounded-2xl border border-gray-800 light:border-gray-200 overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
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
              <div className="flex items-center justify-center h-72 bg-[#171717] light:bg-[#f0f0f0]">{fileIcon(selectedFile.mimeType, "lg")}</div>
            )}
            <div className="px-5 py-4 border-t border-gray-800 light:border-gray-200 flex items-center justify-between bg-[#171717] light:bg-[#f5f5f5]">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white light:text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{fmtBytes(selectedFile.fileSize)} · {new Date(selectedFile.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <a href={`/api/files/${selectedFile.id}/proxy?download=1`} download={selectedFile.name}
                className="ml-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TOAST ══════ */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 bg-[#1a1a1a] light:bg-gray-800 border border-gray-700 rounded-xl shadow-2xl text-sm text-white font-medium animate-fadeIn">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

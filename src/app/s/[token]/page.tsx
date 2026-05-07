"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Download, Lock, Image, Film, Music, FileText, File, Copy, Share2, Clock, HardDrive, FileType, User, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from "lucide-react";

/* ─── Types ─── */
interface FileData {
  type: "file" | "folder";
  name: string;
  mimeType?: string;
  fileSize?: string;
  url?: string | null;
  allowDownload: boolean;
  owner: string;
  createdAt: string;
  files?: Array<{ id: string; name: string; mimeType?: string | null; fileSize: bigint | string }>;
  folders?: Array<{ id: string; name: string }>;
}

/* ─── Helpers ─── */
function formatFileSize(bytes: string | bigint): string {
  const b = typeof bytes === "bigint" ? Number(bytes) : parseInt(bytes as string);
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ mimeType, className }: { mimeType?: string | null; className?: string }) {
  const cls = className || "w-10 h-10";
  if (!mimeType) return <File className={`${cls} text-gray-500`} />;
  if (mimeType.startsWith("image/")) return <Image className={`${cls} text-green-400`} />;
  if (mimeType.startsWith("video/")) return <Film className={`${cls} text-purple-400`} />;
  if (mimeType.startsWith("audio/")) return <Music className={`${cls} text-yellow-400`} />;
  if (mimeType.startsWith("text/") || mimeType.includes("pdf")) return <FileText className={`${cls} text-blue-400`} />;
  return <File className={`${cls} text-gray-500`} />;
}

/* ─── Image Viewer with Zoom/Pan/Touch ─── */
function ImageViewer({ url, name }: { url: string; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [lastDist, setLastDist] = useState(0);
  const [lastCenter, setLastCenter] = useState({ x: 0, y: 0 });

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 8;

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);

  const zoomIn = useCallback(() => setScale(s => Math.min(s * 1.3, MAX_SCALE)), []);
  const zoomOut = useCallback(() => {
    setScale(s => {
      const ns = Math.max(s / 1.3, MIN_SCALE);
      if (ns <= 1) setPos({ x: 0, y: 0 });
      return ns;
    });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => {
      const ns = Math.max(MIN_SCALE, Math.min(s * delta, MAX_SCALE));
      if (ns <= 1) setPos({ x: 0, y: 0 });
      return ns;
    });
  }, []);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPosStart({ ...pos });
  }, [scale, pos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPos({
      x: posStart.x + (e.clientX - dragStart.x),
      y: posStart.y + (e.clientY - dragStart.y),
    });
  }, [dragging, dragStart, posStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Touch: pinch zoom + drag
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setLastDist(getTouchDist(e.touches));
      setLastCenter(getTouchCenter(e.touches));
      setPosStart({ ...pos });
    } else if (e.touches.length === 1 && scale > 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setPosStart({ ...pos });
    }
  }, [scale, pos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      const center = getTouchCenter(e.touches);
      if (lastDist > 0) {
        const ratio = dist / lastDist;
        setScale(s => Math.max(MIN_SCALE, Math.min(s * ratio, MAX_SCALE)));
        setPos(p => ({
          x: p.x + (center.x - lastCenter.x),
          y: p.y + (center.y - lastCenter.y),
        }));
      }
      setLastDist(dist);
      setLastCenter(center);
    } else if (e.touches.length === 1 && dragging) {
      setPos({
        x: posStart.x + (e.touches[0].clientX - dragStart.x),
        y: posStart.y + (e.touches[0].clientY - dragStart.y),
      });
    }
  }, [dragging, dragStart, posStart, lastDist, lastCenter]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setDragging(false);
    if (e.touches.length < 2) setLastDist(0);
    if (scale <= 1) setPos({ x: 0, y: 0 });
  }, [scale]);

  // Double-tap to zoom
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      e.preventDefault();
      if (scale > 1.5) { reset(); } else { setScale(3); }
    }
    lastTap.current = now;
  }, [scale, reset]);

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  }, [fullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-gray-700 bg-black/90 group">
      {/* Image Container */}
      <div
        className={`w-full overflow-hidden ${fullscreen ? "h-screen" : "min-h-[300px] max-h-[80vh]"} flex items-center justify-center touch-none select-none`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={url}
          alt={name}
          className="max-w-full max-h-full object-contain transition-transform duration-100"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: "center center",
            width: "100%",
          }}
          draggable={false}
        />
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-2.5 px-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 sm:opacity-100">
        <button onClick={zoomOut} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-white/70 w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={reset} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-1" title="Reset">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={toggleFullscreen} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Fullscreen">
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Zoom hint on mobile */}
      {scale === 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-white/40 bg-black/40 px-2 py-1 rounded-full sm:hidden pointer-events-none">
          Pinch to zoom · Double-tap to enlarge
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function PublicGalleryPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<FileData | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (pwd?: string) => {
    if (pwd) setSubmitting(true); else setLoading(true);
    setError(null);
    setPasswordError(null);
    try {
      const url = pwd ? `/api/share/${token}?password=${encodeURIComponent(pwd)}` : `/api/share/${token}`;
      const res = await fetch(url);
      const json = await res.json();

      if (res.status === 401 && json.requiresPassword) {
        setRequiresPassword(true); setShowPasswordInput(true);
        setLoading(false); setSubmitting(false); return;
      }
      if (res.status === 401 && !json.requiresPassword) {
        setPasswordError(json.error || "Invalid password");
        setLoading(false); setSubmitting(false); return;
      }
      if (res.status === 404) { setError("Share not found or has expired."); setLoading(false); setSubmitting(false); return; }
      if (res.status === 410) { setError("This share link has expired."); setLoading(false); setSubmitting(false); return; }
      if (!res.ok) { setError(json.error || "Failed to load shared content."); setLoading(false); setSubmitting(false); return; }

      setData(json);
      setRequiresPassword(false);
      if (showPasswordInput) {
        setUnlocked(true);
        setTimeout(() => { setShowPasswordInput(false); setUnlocked(false); }, 300);
      }
    } catch { setError("Failed to connect. Please try again."); }
    setLoading(false);
    setSubmitting(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => { e.preventDefault(); fetchData(password); };
  const isPreviewable = (mime?: string | null) => mime && (mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/"));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="https://fii.one" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">F</div>
            <span className="text-lg font-semibold text-white">fii.one</span>
          </a>
          {data && <span className="ml-auto text-sm text-gray-400 hidden sm:block">Shared by {data.owner}</span>}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-400">Loading shared content...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔗</div>
            <h1 className="text-2xl font-bold text-white mb-2">Link Unavailable</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* ═══ File Preview ═══ */}
            {data.type === "file" && (
              <div className="space-y-6">
                {/* Media Preview */}
                {data.url && data.mimeType?.startsWith("image/") ? (
                  <ImageViewer url={data.url} name={data.name} />
                ) : data.url && data.mimeType?.startsWith("video/") ? (
                  <div className="rounded-xl overflow-hidden border border-gray-700 bg-black">
                    <video src={data.url} controls className="w-full max-h-[80vh]" playsInline />
                  </div>
                ) : data.url && data.mimeType?.startsWith("audio/") ? (
                  <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 flex flex-col items-center gap-4">
                    <Music className="w-16 h-16 text-yellow-400" />
                    <p className="text-sm text-gray-400">{data.name}</p>
                    <audio src={data.url} controls className="w-full max-w-md" />
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-xl p-10 border border-gray-800 flex flex-col items-center gap-4">
                    <FileIcon mimeType={data.mimeType} className="w-16 h-16" />
                    <p className="text-gray-400">Preview not available for this file type</p>
                  </div>
                )}

                {/* File Info Card */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="px-5 sm:px-6 py-5 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                        <FileIcon mimeType={data.mimeType} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-white truncate">{data.name}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Shared by {data.owner}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 sm:px-6 py-4 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-4 h-4 text-gray-500 shrink-0" />
                      <div><p className="text-xs text-gray-500">Size</p><p className="text-sm text-gray-200">{data.fileSize ? formatFileSize(data.fileSize) : "Unknown"}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileType className="w-4 h-4 text-gray-500 shrink-0" />
                      <div><p className="text-xs text-gray-500">Type</p><p className="text-sm text-gray-200 truncate">{data.mimeType?.split("/")[1]?.toUpperCase() || "Unknown"}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                      <div><p className="text-xs text-gray-500">Shared</p><p className="text-sm text-gray-200">{new Date(data.createdAt).toLocaleDateString()}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-500 shrink-0" />
                      <div><p className="text-xs text-gray-500">Owner</p><p className="text-sm text-gray-200">{data.owner}</p></div>
                    </div>
                  </div>

                  {/* Share link */}
                  <div className="px-5 sm:px-6 py-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5" /> Share this file</p>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={typeof window !== "undefined" ? window.location.href : `https://fii.one/s/${token}`}
                        className="flex-1 min-w-0 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none" />
                      <button
                        onClick={() => { navigator.clipboard.writeText(window.location.href); const b = document.getElementById("copy-btn"); if (b) { b.textContent = "Copied!"; setTimeout(() => { b.textContent = "Copy"; }, 2000); } }}
                        id="copy-btn"
                        className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 font-medium transition-colors flex items-center gap-1.5 shrink-0">
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                    </div>
                  </div>

                  {/* Download */}
                  {data.allowDownload && data.url && (
                    <div className="px-5 sm:px-6 py-4 border-t border-gray-800 bg-gray-900/50">
                      <button
                        onClick={async () => {
                          try {
                            const btn = document.getElementById("dl-btn");
                            if (btn) btn.textContent = "Downloading...";
                            const dlUrl = password ? `/api/share/${token}/download?password=${encodeURIComponent(password)}` : `/api/share/${token}/download`;
                            const res = await fetch(dlUrl);
                            if (!res.ok) throw new Error("Download failed");
                            const blob = await res.blob();
                            const u = URL.createObjectURL(blob);
                            const a = document.createElement("a"); a.href = u; a.download = data.name;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
                            if (btn) btn.textContent = "Downloaded ✓";
                            setTimeout(() => { if (btn) btn.textContent = "Download File"; }, 2000);
                          } catch { alert("Download failed. Please try again."); }
                        }}
                        id="dl-btn"
                        className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30">
                        <Download className="w-5 h-5" /> Download File
                        <span className="text-white/60 text-sm ml-1">({data.fileSize ? formatFileSize(data.fileSize) : ""})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ Folder Preview ═══ */}
            {data.type === "folder" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center"><span className="text-2xl">📁</span></div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{data.name}</h1>
                    <p className="text-sm text-gray-400">{data.files?.length ?? 0} files · {data.folders?.length ?? 0} folders</p>
                  </div>
                </div>
                {data.folders && data.folders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Folders</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {data.folders.map(f => (
                        <div key={f.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
                          <span className="text-2xl">📁</span>
                          <span className="text-sm font-medium text-gray-200 truncate">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.files && data.files.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Files</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data.files.map(f => (
                        <div key={f.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                          <FileIcon mimeType={f.mimeType} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">{f.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(f.fileSize)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(!data.files || data.files.length === 0) && (!data.folders || data.folders.length === 0) && (
                  <div className="text-center py-12 text-gray-500">This folder is empty.</div>
                )}
              </div>
            )}
          </>
        ) : null}

        {/* Password Modal */}
        {showPasswordInput && (
          <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 ${unlocked ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
            <div className={`bg-gray-900 rounded-2xl border border-gray-800 p-8 max-w-md w-full transition-all duration-300 ${unlocked ? "opacity-0 scale-90" : "opacity-100 scale-100"}`}>
              <div className="flex flex-col items-center mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${unlocked ? "bg-green-600/20" : "bg-purple-600/20"}`}>
                  <Lock className={`w-7 h-7 transition-colors duration-300 ${unlocked ? "text-green-400" : "text-purple-400"}`} />
                </div>
                <h2 className="text-xl font-bold text-white">{unlocked ? "Unlocked!" : "Password Required"}</h2>
                <p className="text-sm text-gray-400 mt-1 text-center">{unlocked ? "Access granted. Loading file..." : "This shared content is protected. Enter the password to access."}</p>
              </div>
              {!unlocked && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <input type="password" value={password} onChange={e => { setPassword(e.target.value); setPasswordError(null); }}
                      placeholder="Enter password"
                      className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors ${passwordError ? "border-red-500 focus:border-red-400" : "border-gray-700 focus:border-purple-500"}`}
                      autoFocus />
                    {passwordError && <p className="text-red-400 text-sm mt-2 flex items-center gap-1"><span>⚠️</span> {passwordError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={submitting} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-colors">
                      {submitting ? "Checking..." : "Unlock"}
                    </button>
                    <button type="button" onClick={() => setShowPasswordInput(false)} className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

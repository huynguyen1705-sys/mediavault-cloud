"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Search, Sparkles, Loader2, X, Image, Film, Music, FileText,
  File as FileIcon, Folder, Download, Link2, Clock, Check
} from "lucide-react";

/* ═══════════ TYPES ═══════════ */
interface BGFile {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  thumbnailUrl: string | null;
}

interface SearchResult {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  url: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  folderName: string;
  similarity: number;
  snippet: string;
}

/* ═══════════ HELPERS ═══════════ */
function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getTypeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="w-5 h-5 text-gray-400" />;
  if (mime.startsWith("image/")) return <Image className="w-5 h-5 text-emerald-500" />;
  if (mime.startsWith("video/")) return <Film className="w-5 h-5 text-blue-500" />;
  if (mime.startsWith("audio/")) return <Music className="w-5 h-5 text-pink-500" />;
  if (mime.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  return <FileIcon className="w-5 h-5 text-gray-400" />;
}

function getMatchBadge(similarity: number) {
  if (similarity >= 0.7) return { label: "High", color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" };
  if (similarity >= 0.5) return { label: "Good", color: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300" };
  if (similarity >= 0.3) return { label: "Related", color: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" };
  return { label: "Similar", color: "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300" };
}

// Seeded random for consistent layout
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

// Generate scattered positions for files
function generatePositions(count: number, containerW: number, containerH: number) {
  const rng = seededRandom(42);
  const sizes = [64, 80, 96, 112, 128, 144, 160, 48, 72, 56];
  const positions: { x: number; y: number; size: number; rotation: number; delay: number }[] = [];
  
  for (let i = 0; i < count; i++) {
    const size = sizes[i % sizes.length];
    positions.push({
      x: rng() * (containerW - size),
      y: rng() * (containerH - size),
      size,
      rotation: (rng() - 0.5) * 20, // -10 to +10 degrees
      delay: rng() * 2, // stagger animation
    });
  }
  return positions;
}

/* ═══════════ MAIN ═══════════ */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [bgFiles, setBgFiles] = useState<BGFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [bgLoading, setBgLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [lightboxFile, setLightboxFile] = useState<BGFile | SearchResult | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [containerSize, setContainerSize] = useState({ w: 1400, h: 900 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Load background files
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/files?limit=120&page=1");
        if (res.ok) {
          const data = await res.json();
          const files = (data.files || []).filter((f: any) => f.thumbnailPath || f.mimeType?.startsWith("image/") || f.mimeType?.startsWith("video/"));
          setBgFiles(files.map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            fileSize: f.fileSize,
            thumbnailUrl: f.thumbnailPath ? `https://cdn.fii.one/${f.thumbnailPath}` : null,
          })));
        }
      } catch { /* */ }
      setBgLoading(false);
    })();
  }, []);

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerSize({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      } else {
        setContainerSize({ w: window.innerWidth, h: window.innerHeight });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Load recent searches
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fii_recent_searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* */ }
    inputRef.current?.focus();
  }, []);

  const saveRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem("fii_recent_searches", JSON.stringify(updated));
  };

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    saveRecentSearch(searchQuery.trim());
    const start = performance.now();
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSearchTime(Math.round(performance.now() - start));
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length === 0) {
      setSearched(false);
      setResults([]);
    } else if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(value), 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); doSearch(query); }
    if (e.key === "Escape") { setQuery(""); setResults([]); setSearched(false); inputRef.current?.focus(); }
  };

  const handleCopyLink = async (file: { id: string }) => {
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

  // Open lightbox — fetch actual file URL
  const openLightbox = async (file: BGFile | SearchResult) => {
    setLightboxFile(file);
    setLightboxUrl(null);
    try {
      const res = await fetch(`/api/files/${file.id}/proxy`);
      if (res.ok) {
        const blob = await res.blob();
        setLightboxUrl(URL.createObjectURL(blob));
      }
    } catch { /* */ }
  };

  // Determine which files are visible (search results or all)
  const resultIds = useMemo(() => new Set(results.map(r => r.id)), [results]);

  // Generate scattered positions
  const positions = useMemo(
    () => generatePositions(bgFiles.length, containerSize.w, containerSize.h),
    [bgFiles.length, containerSize.w, containerSize.h]
  );

  const suggestions = [
    "Photos from last week", "Large video files", "PDF documents",
    "Recent uploads", "Design files", "Music and audio",
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060608] relative overflow-hidden" ref={containerRef}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* ═══════════ BACKGROUND FILE MATRIX ═══════════ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {bgFiles.map((file, i) => {
          const pos = positions[i];
          if (!pos) return null;
          const isMatch = searched && resultIds.has(file.id);
          const isFiltered = searched && !resultIds.has(file.id);

          return (
            <div
              key={file.id}
              className={`absolute pointer-events-auto cursor-pointer rounded-lg overflow-hidden shadow-lg transition-all duration-700 ease-out ${
                isFiltered
                  ? "opacity-[0.03] scale-75 blur-sm grayscale"
                  : isMatch
                  ? "opacity-100 scale-110 ring-2 ring-violet-500 shadow-xl shadow-violet-500/20 z-10"
                  : "opacity-[0.15] dark:opacity-[0.12] hover:opacity-40 dark:hover:opacity-30"
              }`}
              style={{
                left: pos.x,
                top: pos.y,
                width: pos.size,
                height: pos.size,
                transform: `rotate(${isMatch ? 0 : pos.rotation}deg)`,
                animationDelay: `${pos.delay}s`,
              }}
              onClick={() => openLightbox(file)}
            >
              {file.thumbnailUrl ? (
                <img src={file.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                  {getTypeIcon(file.mimeType)}
                </div>
              )}
              {/* Hover info */}
              <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-end p-1.5">
                <p className="text-[8px] text-white truncate w-full font-medium">{file.name}</p>
              </div>
              {/* Match glow */}
              {isMatch && (
                <div className="absolute inset-0 border-2 border-violet-400 rounded-lg animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.3) 100%)" }}
      />

      {/* ═══════════ SEARCH UI (on top) ═══════════ */}
      <div className="relative z-20 min-h-screen flex flex-col">
        {/* Search Header — centered */}
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 ${searched ? "flex-none pt-6" : ""}`}>
          <div className="w-full max-w-2xl px-4">
            {/* Logo */}
            {!searched && (
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 flex items-center justify-center mb-5 shadow-2xl shadow-violet-500/30 backdrop-blur-xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 drop-shadow-lg">
                  Search Everything
                </h1>
                <p className="text-gray-500 dark:text-white/40 text-lg">AI-powered · Semantic · Instant</p>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-cyan-500/20 blur-xl" />
              <div className="relative">
                <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you're looking for..."
                  className="w-full pl-14 pr-14 py-5 bg-white/90 dark:bg-black/60 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 rounded-2xl text-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:outline-none focus:border-violet-500 focus:shadow-2xl focus:shadow-violet-500/20 transition-all shadow-xl"
                />
                {loading && <Loader2 className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-violet-500 animate-spin" />}
                {query && !loading && (
                  <button onClick={() => { setQuery(""); setResults([]); setSearched(false); inputRef.current?.focus(); }}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white/60">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Result count */}
            {searched && !loading && (
              <p className="text-xs text-gray-500 dark:text-white/30 mt-3 px-2 text-center">
                {results.length} results found · {searchTime}ms · {bgFiles.length - results.length} files filtered
              </p>
            )}

            {/* Suggestions (before search) */}
            {!searched && (
              <div className="mt-8 text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setQuery(s); doSearch(s); }}
                      className="px-4 py-2 bg-white/70 dark:bg-white/[0.05] backdrop-blur-sm border border-gray-200/60 dark:border-white/5 rounded-xl text-sm text-gray-600 dark:text-white/50 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all shadow-sm">
                      {s}
                    </button>
                  ))}
                </div>
                {recentSearches.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {recentSearches.slice(0, 5).map((s, i) => (
                      <button key={i} onClick={() => { setQuery(s); doSearch(s); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 transition-colors">
                        <Clock className="w-3 h-3" /> {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search Results List */}
        {searched && (
          <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-20">
            <div className="space-y-2">
              {results.map((result) => {
                const badge = getMatchBadge(result.similarity);
                return (
                  <div key={result.id} onClick={() => openLightbox(result)}
                    className="group flex items-center gap-4 p-3.5 bg-white/90 dark:bg-black/50 backdrop-blur-xl border border-gray-200/60 dark:border-white/5 rounded-xl cursor-pointer hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10 transition-all">
                    {result.thumbnailUrl ? (
                      <img src={result.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                        {getTypeIcon(result.mimeType)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{result.name}</p>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
                      </div>
                      {result.snippet && <p className="text-[11px] text-gray-500 dark:text-white/35 line-clamp-1">{result.snippet}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-white/20 mt-0.5">
                        <span>{formatBytes(Number(result.fileSize))}</span>
                        <span className="flex items-center gap-1"><Folder className="w-2.5 h-2.5" /> {result.folderName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={e => { e.stopPropagation(); handleCopyLink(result); }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                        <Link2 className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {results.length === 0 && !loading && (
                <div className="text-center py-16">
                  <Search className="w-12 h-12 text-gray-200 dark:text-white/10 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-white/30 font-medium">No files match your search</p>
                  <p className="text-sm text-gray-400 dark:text-white/20 mt-1">Try different keywords</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ LIGHTBOX (non-fullscreen) ═══════════ */}
      {lightboxFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8" onClick={() => { setLightboxFile(null); setLightboxUrl(null); }}>
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          
          {/* Lightbox card */}
          <div className="relative z-10 max-w-3xl max-h-[75vh] w-auto bg-white/95 dark:bg-[#111]/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button onClick={() => { setLightboxFile(null); setLightboxUrl(null); }}
              className="absolute top-3 right-3 z-10 p-1.5 bg-black/30 hover:bg-black/50 rounded-full transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Content */}
            {!lightboxUrl ? (
              <div className="flex items-center justify-center w-80 h-60">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : (
              <>
                {lightboxFile.mimeType?.startsWith("image/") && (
                  <img src={lightboxUrl} alt={lightboxFile.name} className="max-w-full max-h-[60vh] object-contain" />
                )}
                {lightboxFile.mimeType?.startsWith("video/") && (
                  <video src={lightboxUrl} controls autoPlay className="max-w-full max-h-[60vh]" />
                )}
                {lightboxFile.mimeType?.startsWith("audio/") && (
                  <div className="p-8 w-96"><audio src={lightboxUrl} controls className="w-full" /></div>
                )}
              </>
            )}

            {/* File info bar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/30 dark:border-white/5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lightboxFile.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-white/25">{formatBytes(Number(lightboxFile.fileSize))}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => handleCopyLink(lightboxFile)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Share">
                  <Link2 className="w-4 h-4 text-gray-500 dark:text-white/40" />
                </button>
                <a href={lightboxUrl || "#"} download={lightboxFile.name}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Download">
                  <Download className="w-4 h-4 text-gray-500 dark:text-white/40" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

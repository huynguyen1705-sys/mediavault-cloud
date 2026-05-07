"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Sparkles, Loader2, X, Image, Film, Music, FileText,
  File as FileIcon, Folder, Download, Eye, Link2, Clock, TrendingUp,
  Check, Filter
} from "lucide-react";

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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [previewFile, setPreviewFile] = useState<SearchResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Load recent searches from localStorage
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

  // Auto-search with debounce (600ms)
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(value), 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); doSearch(query); }
    if (e.key === "Escape") { setQuery(""); setResults([]); setSearched(false); }
  };

  const handleCopyLink = async (file: SearchResult) => {
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

  const suggestions = [
    "Photos from last week",
    "Large video files",
    "PDF documents",
    "Recent uploads",
    "Design files",
    "Music and audio",
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Search Header */}
      <div className={`transition-all duration-500 ${searched ? "pt-8" : "pt-[25vh]"}`}>
        <div className="max-w-3xl mx-auto px-4">
          {/* Logo + Title */}
          {!searched && (
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-4 shadow-xl shadow-violet-500/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Search Your Files</h1>
              <p className="text-gray-500 dark:text-white/40">AI-powered semantic search across all your files</p>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you're looking for..."
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-white/[0.05] border-2 border-gray-300 dark:border-white/10 rounded-2xl text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-violet-500 focus:shadow-lg focus:shadow-violet-500/10 transition-all shadow-md dark:shadow-none"
            />
            {loading && (
              <Loader2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-violet-500 animate-spin" />
            )}
            {query && !loading && (
              <button
                onClick={() => { setQuery(""); setResults([]); setSearched(false); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Results count */}
          {searched && !loading && (
            <p className="text-xs text-gray-500 dark:text-white/40 mt-2 px-1">
              {results.length} results · {searchTime}ms
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 mt-6 pb-20">
        {/* Before search: Suggestions + Recent */}
        {!searched && (
          <div className="space-y-6">
            {/* Suggestions */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-3 uppercase tracking-wider">Try searching for</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(s); doSearch(s); }}
                    className="px-3 py-2 bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl text-sm text-gray-700 dark:text-white/60 hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-violet-400 transition-all shadow-sm dark:shadow-none"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-3 uppercase tracking-wider">Recent</p>
                <div className="space-y-1">
                  {recentSearches.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(s); doSearch(s); }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                      <span className="text-sm text-gray-700 dark:text-white/60">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {searched && (
          <div className="space-y-3">
            {results.map((result) => {
              const badge = getMatchBadge(result.similarity);
              return (
                <div
                  key={result.id}
                  onClick={() => setPreviewFile(result)}
                  className="group flex items-center gap-4 p-4 bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl cursor-pointer hover:border-violet-500/50 hover:shadow-lg dark:hover:shadow-none transition-all shadow-md dark:shadow-none"
                >
                  {/* Thumbnail */}
                  {result.thumbnailUrl ? (
                    <img src={result.thumbnailUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      {getTypeIcon(result.mimeType)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{result.name}</p>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
                    </div>
                    {result.snippet && (
                      <p className="text-xs text-gray-500 dark:text-white/40 line-clamp-1 mb-1">{result.snippet}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-white/30">
                      <span>{formatBytes(Number(result.fileSize))}</span>
                      <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {result.folderName}</span>
                      <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setPreviewFile(result); }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Preview">
                      <Eye className="w-4 h-4 text-gray-500 dark:text-white/40" />
                    </button>
                    {result.url && (
                      <a href={result.url} download={result.name} onClick={e => e.stopPropagation()}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Download">
                        <Download className="w-4 h-4 text-gray-500 dark:text-white/40" />
                      </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleCopyLink(result); }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Share">
                      <Link2 className="w-4 h-4 text-gray-500 dark:text-white/40" />
                    </button>
                  </div>
                </div>
              );
            })}

            {results.length === 0 && !loading && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-gray-200 dark:text-white/10 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-white/40 font-medium">No files found</p>
                <p className="text-sm text-gray-400 dark:text-white/25 mt-1">Try different keywords or a broader description</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
            <X className="w-6 h-6 text-white" />
          </button>
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
              <p className="text-xs text-white/40 mt-1">{formatBytes(Number(previewFile.fileSize))} · {previewFile.folderName}</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              {previewFile.url && (
                <a href={previewFile.url} download={previewFile.name}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
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

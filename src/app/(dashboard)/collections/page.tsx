"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Pin, PinOff, Trash2, Loader2, RefreshCw, Folder, ChevronLeft, Download, Eye, X, Share2, Image, Film, Music, FileText, File as FileIcon } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  type: "auto" | "manual";
  fileCount: number;
  thumbnailMosaic: string[];
  isPinned: boolean;
  rules: any;
  createdAt: string;
  updatedAt: string;
}

interface CollectionFile {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  url: string | null;
  thumbnailUrl: string | null;
  metadata: any;
  createdAt: string;
  folderName: string;
  score: number;
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getTypeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="w-5 h-5 text-gray-500" />;
  if (mime.startsWith("image/")) return <Image className="w-5 h-5 text-green-400" />;
  if (mime.startsWith("video/")) return <Film className="w-5 h-5 text-blue-400" />;
  if (mime.startsWith("audio/")) return <Music className="w-5 h-5 text-pink-400" />;
  if (mime.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  return <FileIcon className="w-5 h-5 text-gray-400" />;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionFiles, setCollectionFiles] = useState<CollectionFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<CollectionFile | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      if (res.ok) {
        await fetchCollections();
      }
    } catch { /* */ }
    setGenerating(false);
  };

  const handlePin = async (id: string, isPinned: boolean) => {
    await fetch(`/api/collections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !isPinned }),
    });
    setCollections(prev => prev.map(c => c.id === id ? { ...c, isPinned: !isPinned } : c));
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setCollections(prev => prev.filter(c => c.id !== id));
    if (selectedCollection?.id === id) setSelectedCollection(null);
  };

  const openCollection = async (collection: Collection) => {
    setSelectedCollection(collection);
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}/files`);
      if (res.ok) {
        const data = await res.json();
        setCollectionFiles(data.files || []);
      }
    } catch { /* */ }
    setLoadingFiles(false);
  };

  // ── Collection Detail View ──
  if (selectedCollection) {
    return (
      <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedCollection(null)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{selectedCollection.name}</h1>
            <p className="text-sm text-gray-500">{selectedCollection.fileCount} files · {selectedCollection.type === "auto" ? "AI Generated" : "Manual"}</p>
          </div>
          <button onClick={() => handlePin(selectedCollection.id, selectedCollection.isPinned)}
            className={`p-2 rounded-lg transition-colors ${selectedCollection.isPinned ? "text-amber-400 bg-amber-500/10" : "text-gray-500 hover:bg-gray-800"}`}>
            {selectedCollection.isPinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Files Grid */}
        {loadingFiles ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {collectionFiles.map(file => (
              <div
                key={file.id}
                onClick={() => setPreviewFile(file)}
                className="group cursor-pointer rounded-xl overflow-hidden border border-gray-800 hover:border-violet-500/50 transition-all bg-[#111]"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden relative">
                  {file.thumbnailUrl ? (
                    <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center p-3">
                      {getTypeIcon(file.mimeType)}
                      <span className="text-[9px] text-gray-500 uppercase">{file.name.split(".").pop()}</span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full"><Eye className="w-4 h-4 text-white" /></button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500">{formatBytes(Number(file.fileSize))}</span>
                    <span className="text-[10px] text-gray-600 truncate"><Folder className="w-2.5 h-2.5 inline text-amber-400" /> {file.folderName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {collectionFiles.length === 0 && !loadingFiles && (
          <div className="text-center py-20 text-gray-500">No files in this collection</div>
        )}

        {/* Preview Modal */}
        {previewFile && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
            <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10"><X className="w-6 h-6 text-white" /></button>
            <div className="max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
              {previewFile.mimeType?.startsWith("image/") && previewFile.url && (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
              )}
              {previewFile.mimeType?.startsWith("video/") && previewFile.url && (
                <video src={previewFile.url} controls className="max-w-full max-h-[80vh] rounded-xl" autoPlay />
              )}
              {previewFile.mimeType?.startsWith("audio/") && previewFile.url && (
                <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md">
                  <audio src={previewFile.url} controls className="w-full" />
                </div>
              )}
              {!previewFile.mimeType?.startsWith("image/") && !previewFile.mimeType?.startsWith("video/") && !previewFile.mimeType?.startsWith("audio/") && (
                <div className="bg-gray-900 rounded-xl p-8 text-center">
                  {getTypeIcon(previewFile.mimeType)}
                  <p className="text-gray-400 mt-3">Preview not available</p>
                </div>
              )}
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-white">{previewFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">{formatBytes(Number(previewFile.fileSize))} · {previewFile.folderName}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Collections Grid View ──
  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-400" />
            Smart Collections
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI-organized groups of your files</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-violet-500/20"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate"}
          </button>
          <button onClick={fetchCollections} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : collections.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <Sparkles className="w-16 h-16 text-violet-400/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Collections Yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Click "Generate" to let AI analyze your files and create smart collections based on time, location, content, and file types.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl inline-flex items-center gap-2 transition-colors"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? "Analyzing files..." : "Generate Smart Collections"}
          </button>
        </div>
      ) : (
        /* Collections Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {collections.map(collection => (
            <div
              key={collection.id}
              className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-800 hover:border-violet-500/50 bg-[#111] transition-all hover:shadow-xl hover:shadow-violet-500/5"
            >
              {/* Thumbnail Mosaic */}
              <div
                className="aspect-video bg-gray-900 relative overflow-hidden"
                onClick={() => openCollection(collection)}
              >
                {collection.thumbnailMosaic.length >= 4 ? (
                  <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {collection.thumbnailMosaic.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ))}
                  </div>
                ) : collection.thumbnailMosaic.length >= 1 ? (
                  <img src={collection.thumbnailMosaic[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-gray-700" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Pin badge */}
                {collection.isPinned && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500/90 rounded text-[9px] font-bold text-black">📌 Pinned</div>
                )}

                {/* File count badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded-full text-[10px] text-white/80 font-medium">
                  {collection.fileCount} files
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex items-start justify-between">
                <div className="flex-1 min-w-0" onClick={() => openCollection(collection)}>
                  <p className="text-sm font-semibold truncate">{collection.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {collection.type === "auto" ? "AI Generated" : "Manual"} · {new Date(collection.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePin(collection.id, collection.isPinned); }}
                    className={`p-1 rounded transition-colors ${collection.isPinned ? "text-amber-400" : "text-gray-500 hover:text-white"}`}
                    title={collection.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(collection.id); }}
                    className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

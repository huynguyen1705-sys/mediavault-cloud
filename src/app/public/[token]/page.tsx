"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Download, Lock, Image, Film, Music, FileText, File } from "lucide-react";

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

function formatFileSize(bytes: string | bigint): string {
  const b = typeof bytes === "bigint" ? Number(bytes) : parseInt(bytes as string);
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ mimeType }: { mimeType?: string | null }) {
  if (!mimeType) return <File className="w-10 h-10 text-gray-500" />;
  if (mimeType.startsWith("image/")) return <Image className="w-10 h-10 text-green-400" />;
  if (mimeType.startsWith("video/")) return <Film className="w-10 h-10 text-purple-400" />;
  if (mimeType.startsWith("audio/")) return <Music className="w-10 h-10 text-yellow-400" />;
  if (mimeType.startsWith("text/") || mimeType.includes("pdf")) return <FileText className="w-10 h-10 text-blue-400" />;
  return <File className="w-10 h-10 text-gray-500" />;
}

function PreviewMedia({ mimeType, url }: { mimeType?: string | null; url?: string | null }) {
  if (!url || !mimeType) return null;
  if (mimeType.startsWith("image/")) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-800">
        <img
          src={url}
          alt="Preview"
          className="max-w-full max-h-96 mx-auto object-contain"
          style={{ display: "block", margin: "0 auto" }}
        />
      </div>
    );
  }
  if (mimeType.startsWith("video/")) {
    return (
      <video
        src={url}
        controls
        className="max-w-full max-h-96 rounded-xl border border-gray-700"
      />
    );
  }
  if (mimeType.startsWith("audio/")) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <audio src={url} controls className="w-full" />
      </div>
    );
  }
  return null;
}

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

  const fetchData = async (pwd?: string) => {
    setLoading(true);
    setError(null);
    setPasswordError(null);
    try {
      const url = pwd ? `/api/share/${token}?password=${encodeURIComponent(pwd)}` : `/api/share/${token}`;
      const res = await fetch(url);
      const json = await res.json();

      if (res.status === 401 && json.requiresPassword) {
        setRequiresPassword(true);
        setShowPasswordInput(true);
        setLoading(false);
        return;
      }

      if (res.status === 404) { setError("Share not found or has expired."); setLoading(false); return; }
      if (res.status === 410) { setError("This share link has expired."); setLoading(false); return; }
      if (!res.ok) { setError(json.error || "Failed to load shared content."); setLoading(false); return; }

      setData(json);
      setRequiresPassword(false);
    } catch {
      setError("Failed to connect. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(password);
  };

  const isPreviewable = (mime?: string | null) =>
    mime && (mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/"));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
            M
          </div>
          <span className="text-lg font-semibold text-white">fii.one</span>
          {data && (
            <span className="ml-auto text-sm text-gray-400">
              Shared by {data.owner}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
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
            {/* File Preview */}
            {data.type === "file" && (
              <div className="space-y-6">
                {/* Preview */}
                {data.url && isPreviewable(data.mimeType) ? (
                  <PreviewMedia mimeType={data.mimeType} url={data.url} />
                ) : (
                  <div className="bg-gray-900 rounded-xl p-10 border border-gray-800 flex flex-col items-center gap-4">
                    <FileIcon mimeType={data.mimeType} />
                    <p className="text-gray-400">Preview not available for this file type</p>
                  </div>
                )}

                {/* File info + download */}
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-white truncate">{data.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {data.fileSize ? formatFileSize(data.fileSize) : "Unknown size"}
                      {" · "}
                      {data.mimeType || "Unknown type"}
                    </p>
                  </div>
                  {data.allowDownload && data.url && (
                    <a
                      href={data.url}
                      download={data.name}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Folder Preview */}
            {data.type === "folder" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📁</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{data.name}</h1>
                    <p className="text-sm text-gray-400">
                      {data.files?.length ?? 0} files · {data.folders?.length ?? 0} folders
                    </p>
                  </div>
                </div>

                {/* Folders */}
                {data.folders && data.folders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Folders</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {data.folders.map((f) => (
                        <div key={f.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
                          <span className="text-2xl">📁</span>
                          <span className="text-sm font-medium text-gray-200 truncate">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {data.files && data.files.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Files</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data.files.map((f) => (
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 max-w-md w-full">
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Password Required</h2>
                <p className="text-sm text-gray-400 mt-1 text-center">
                  This shared content is protected. Enter the password to access.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-400 text-sm mt-2">{passwordError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordInput(false)}
                    className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
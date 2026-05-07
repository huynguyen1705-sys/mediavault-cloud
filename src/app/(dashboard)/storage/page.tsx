"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HardDrive, Folder, FolderOpen, ChevronRight, Image, Film, Music, FileText,
  File as FileIcon, Loader2, TrendingUp, BarChart3, AlertTriangle, ArrowDown
} from "lucide-react";

interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  fileCount: number;
  totalSize: number;
  types: Record<string, number>;
  lastModified: string;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  folderCount: number;
  typeBreakdown: { type: string; count: number; size: number }[];
  largestFiles: { id: string; name: string; mimeType: string | null; fileSize: string; folderName: string; createdAt: string }[];
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getTypeColor(type: string): string {
  switch (type) {
    case "image": return "bg-emerald-500";
    case "video": return "bg-blue-500";
    case "audio": return "bg-pink-500";
    case "application": return "bg-amber-500";
    case "text": return "bg-violet-500";
    default: return "bg-gray-500";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "image": return "Images";
    case "video": return "Videos";
    case "audio": return "Audio";
    case "application": return "Documents";
    case "text": return "Text";
    default: return "Other";
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "image": return <Image className="w-4 h-4 text-emerald-500" />;
    case "video": return <Film className="w-4 h-4 text-blue-500" />;
    case "audio": return <Music className="w-4 h-4 text-pink-500" />;
    case "application": return <FileText className="w-4 h-4 text-amber-500" />;
    default: return <FileIcon className="w-4 h-4 text-gray-500" />;
  }
}

/* ── Folder Tree Item ── */
function FolderTreeItem({ folder, allFolders, depth = 0 }: {
  folder: FolderData; allFolders: FolderData[]; depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const children = allFolders.filter(f => f.parentId === folder.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer transition-all
          hover:bg-gray-200 dark:hover:bg-white/5
          border-2 border-transparent hover:border-gray-300 dark:hover:border-white/10`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <ChevronRight className={`w-3.5 h-3.5 text-gray-500 dark:text-white/40 transition-transform ${expanded ? "rotate-90" : ""}`} />
        ) : (
          <div className="w-3.5 h-3.5" />
        )}
        {expanded ? (
          <FolderOpen className="w-4 h-4 text-amber-500" />
        ) : (
          <Folder className="w-4 h-4 text-amber-500" />
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">{folder.name}</span>
        <span className="text-xs text-gray-500 dark:text-white/40 tabular-nums">{folder.fileCount}</span>
        <span className="text-xs text-gray-400 dark:text-white/30 tabular-nums w-20 text-right">{formatBytes(folder.totalSize)}</span>
      </div>
      {expanded && children.map(child => (
        <FolderTreeItem key={child.id} folder={child} allFolders={allFolders} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function StoragePage() {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [rootData, setRootData] = useState<{ fileCount: number; totalSize: number; types: Record<string, number> } | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStorage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storage");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        setRootData(data.root);
        setStats(data.stats);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStorage(); }, [fetchStorage]);

  const rootFolders = folders.filter(f => !f.parentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Storage Overview</h1>
            <p className="text-xs text-gray-500 dark:text-white/40">Folder tree + detailed storage breakdown</p>
          </div>
        </div>

        {stats && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 shadow-md dark:shadow-none">
                <p className="text-xs text-gray-500 dark:text-white/40">Total Files</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFiles.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 shadow-md dark:shadow-none">
                <p className="text-xs text-gray-500 dark:text-white/40">Total Size</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBytes(stats.totalSize)}</p>
              </div>
              <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 shadow-md dark:shadow-none">
                <p className="text-xs text-gray-500 dark:text-white/40">Folders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.folderCount}</p>
              </div>
              <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl p-4 shadow-md dark:shadow-none">
                <p className="text-xs text-gray-500 dark:text-white/40">File Types</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.typeBreakdown.length}</p>
              </div>
            </div>

            {/* Main Grid: Folder Tree + Type Breakdown + Largest Files */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Folder Tree */}
              <div className="lg:col-span-2 bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl shadow-md dark:shadow-none overflow-hidden">
                <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-white/5">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-500" /> Folder Tree
                  </h2>
                </div>
                <div className="p-3 max-h-[500px] overflow-y-auto">
                  {/* Root files */}
                  {rootData && rootData.fileCount > 0 && (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-gray-100 dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 mb-1">
                      <div className="w-3.5 h-3.5" />
                      <HardDrive className="w-4 h-4 text-gray-500 dark:text-white/40" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">My Files (root)</span>
                      <span className="text-xs text-gray-500 dark:text-white/40 tabular-nums">{rootData.fileCount}</span>
                      <span className="text-xs text-gray-400 dark:text-white/30 tabular-nums w-20 text-right">{formatBytes(rootData.totalSize)}</span>
                    </div>
                  )}
                  {rootFolders.map(folder => (
                    <FolderTreeItem key={folder.id} folder={folder} allFolders={folders} />
                  ))}
                  {rootFolders.length === 0 && !rootData?.fileCount && (
                    <p className="text-sm text-gray-500 dark:text-white/40 text-center py-8">No folders yet</p>
                  )}
                </div>
              </div>

              {/* Right sidebar: Type breakdown + Largest Files */}
              <div className="space-y-6">
                {/* Type Breakdown */}
                <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl shadow-md dark:shadow-none overflow-hidden">
                  <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-white/5">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-500" /> Storage by Type
                    </h2>
                  </div>
                  <div className="p-4">
                    {/* Visual bar */}
                    <div className="w-full h-4 rounded-full overflow-hidden flex mb-4">
                      {stats.typeBreakdown.map((t, i) => (
                        <div
                          key={i}
                          className={`h-full ${getTypeColor(t.type)} transition-all`}
                          style={{ width: `${(t.size / stats.totalSize) * 100}%` }}
                          title={`${getTypeLabel(t.type)}: ${formatBytes(t.size)}`}
                        />
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="space-y-2">
                      {stats.typeBreakdown.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {getTypeIcon(t.type)}
                          <span className="text-xs font-medium text-gray-900 dark:text-white flex-1">{getTypeLabel(t.type)}</span>
                          <span className="text-xs text-gray-500 dark:text-white/40 tabular-nums">{t.count}</span>
                          <span className="text-xs text-gray-400 dark:text-white/30 tabular-nums">{formatBytes(t.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Largest Files */}
                <div className="bg-white dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-xl shadow-md dark:shadow-none overflow-hidden">
                  <div className="px-4 py-3 border-b-2 border-gray-200 dark:border-white/5">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Largest Files
                    </h2>
                  </div>
                  <div className="p-3 space-y-1">
                    {stats.largestFiles.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                        <span className="text-[10px] text-gray-400 dark:text-white/30 w-4 tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{f.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-white/40">{f.folderName}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">{formatBytes(Number(f.fileSize))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

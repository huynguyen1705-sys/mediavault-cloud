"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  FolderPlus, 
  Upload, 
  Grid, 
  List, 
  Search, 
  MoreVertical,
  Image,
  Video,
  Music,
  File,
  Folder,
  ChevronRight,
  Home,
  X,
  Copy,
  Share2,
  Trash2,
  Download,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  FolderOpen,
  FileText,
  Archive,
  Cloud,
  CloudUpload,
  Check,
  XCircle,
  Clock,
  FileCode,
  FileSpreadsheet,
  FileJson,
  Presentation,
  Film,
  Headphones,
  Bookmark,
  FileType,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  AlertTriangle,
  Trash,
  Lock,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  FileText as FileTextIcon,
  FileCode as FileCodeIcon
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

interface FileItem {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  url: string | null;
  thumbnailUrl: string | null;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  isPublic: boolean;
  downloadEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
}

interface UploadFile {
  id: string;
  name: string;
  size: number;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
}

export default function FilesPage() {
  const { user, isLoaded } = useUser();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "My Files" }]);
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [trashMode, setTrashMode] = useState(false);
  const [trashFiles, setTrashFiles] = useState<any[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: FolderItem } | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpireHours, setShareExpireHours] = useState<number>(0);
  const [shareAllowDownload, setShareAllowDownload] = useState(true);
  const [shareOptions, setShareOptions] = useState<{passwordProtected: boolean; expiresAt: string | null; allowDownload: boolean} | null>(null);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("folderId", currentFolderId || "root");
      if (searchQuery) params.set("search", searchQuery);
      if (filterType !== "all") params.set("type", filterType);

      const res = await fetch(`/api/files?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error("Fetch files error:", error);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, currentFolderId, searchQuery, filterType]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Handle file upload with progress tracking
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      status: "pending" as const,
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newFiles]);

    // Process files one by one
    for (let i = 0; i < newFiles.length; i++) {
      const uploadFile = newFiles[i];
      const actualFile = Array.from(fileList).find((f) => f.name === uploadFile.name);
      if (!actualFile) continue;

      // Update status to uploading
      setUploadQueue((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading" } : f))
      );

      try {
        const formData = new FormData();
        formData.append("file", actualFile);
        if (currentFolderId) {
          formData.append("folderId", currentFolderId);
        }

        // Simulate progress (since fetch doesn't support upload progress natively)
        const progressInterval = setInterval(() => {
          setUploadQueue((prev) =>
            prev.map((f) => {
              if (f.id === uploadFile.id && f.status === "uploading" && f.progress < 90) {
                return { ...f, progress: f.progress + Math.random() * 15 };
              }
              return f;
            })
          );
        }, 300);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Upload failed");
        }

        // Mark as completed
        setUploadQueue((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "completed", progress: 100 } : f))
        );
      } catch (error: any) {
        console.error("Upload error:", error);
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error", error: error.message } : f
          )
        );
      }
    }

    // Clear completed uploads after delay
    setTimeout(() => {
      setUploadQueue((prev) => prev.filter((f) => f.status !== "completed"));
    }, 3000);

    fetchFiles();
  };

  // Clear all uploads
  const clearUploads = () => {
    setUploadQueue([]);
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  // Handle delete (soft delete to trash)
  const handleDelete = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (res.ok) {
        fetchFiles();
        if (trashMode) fetchTrashFiles();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
    setContextMenu(null);
  };

  // Handle permanent delete
  const handlePermanentDelete = async (fileId: string) => {
    if (!confirm("Permanently delete this file? This cannot be undone!")) return;
    try {
      const res = await fetch(`/api/files/${fileId}?permanent=true`, { method: "DELETE" });
      if (res.ok) {
        fetchTrashFiles();
      }
    } catch (error) {
      console.error("Permanent delete error:", error);
    }
    setContextMenu(null);
  };

  // Handle restore from trash
  const handleRestore = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      if (res.ok) {
        fetchTrashFiles();
      }
    } catch (error) {
      console.error("Restore error:", error);
    }
    setContextMenu(null);
  };

  // Fetch trash files
  const fetchTrashFiles = useCallback(async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      if (res.ok) {
        const data = await res.json();
        setTrashFiles(data.files || []);
      }
    } catch (error) {
      console.error("Fetch trash error:", error);
    } finally {
      setLoading(false);
    }
  }, [isLoaded]);

  // Empty trash
  const handleEmptyTrash = async () => {
    if (!confirm("Permanently delete ALL files in trash? This cannot be undone!")) return;
    try {
      const res = await fetch("/api/trash", { method: "DELETE" });
      if (res.ok) {
        fetchTrashFiles();
      }
    } catch (error) {
      console.error("Empty trash error:", error);
    }
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowNewFolderModal(false);
        fetchFiles();
      }
    } catch (error) {
      console.error("Create folder error:", error);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder and all its contents?")) return;
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      if (res.ok) {
        fetchFiles();
      }
    } catch (error) {
      console.error("Delete folder error:", error);
    }
    setFolderContextMenu(null);
  };

  // Rename folder
  const handleRenameFolder = async (folderId: string) => {
    if (!renameFolderName.trim()) return;
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameFolderName.trim() }),
      });
      if (res.ok) {
        setRenameFolderId(null);
        setRenameFolderName("");
        fetchFiles();
      }
    } catch (error) {
      console.error("Rename folder error:", error);
    }
  };

  // Delete folder API route - need to create it first
  // For now, use inline delete via folders endpoint

  // Handle share
  // Open share options modal (without creating share yet)
  const openShareOptions = (file: FileItem) => {
    setSelectedFile(file);
    setSharePassword("");
    setShareExpireHours(0);
    setShareAllowDownload(true);
    setShareToken(null);
    setShareOptions(null);
    setShowShareModal(true);
    setContextMenu(null);
  };

  // Handle share with options
  const handleShare = async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileId: selectedFile.id,
          password: sharePassword || undefined,
          expiresIn: shareExpireHours > 0 ? shareExpireHours : undefined,
          allowDownload: shareAllowDownload
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareToken(data.share.url);
        setShareOptions({
          passwordProtected: !!sharePassword,
          expiresAt: data.share.expiresAt,
          allowDownload: shareAllowDownload
        });
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "My Files" }]);
    } else {
      const currentIndex = breadcrumbs.findIndex(b => b.id === folderId);
      if (currentIndex >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, currentIndex + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
      }
    }
    setCurrentFolderId(folderId);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Apple-style file icon with gradient background
  const getFileIcon = (mimeType: string | null, size: "sm" | "lg" = "lg") => {
    const sm = size === "sm";
    const baseClass = sm ? "w-7 h-7" : "w-10 h-10";
    const iconClass = sm ? "w-4 h-4" : "w-6 h-6";
    
    if (!mimeType) return (
      <div className={`${baseClass} rounded-xl bg-gray-600 flex items-center justify-center`}>
        <File className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.startsWith("image/")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg`}>
        <Image className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.startsWith("video/")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg`}>
        <Video className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.startsWith("audio/")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg`}>
        <Music className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("pdf")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg`}>
        <FileText className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("gz") || mimeType.includes("7z")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg`}>
        <Archive className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("wordprocessingml") || mimeType.includes("msword") || mimeType.includes("doc") || mimeType.includes("docx")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg`}>
        <FileText className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("spreadsheetml") || mimeType.includes("excel") || mimeType.includes("xls") || mimeType.includes("xlsx")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg`}>
        <FileSpreadsheet className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("presentationml") || mimeType.includes("powerpoint") || mimeType.includes("ppt") || mimeType.includes("pptx")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg`}>
        <Presentation className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("json") || mimeType.includes("yaml") || mimeType.includes("yml") || mimeType.includes("toml")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg`}>
        <FileJson className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("xml")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center shadow-lg`}>
        <Layers className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("html") || mimeType.includes("css") || mimeType.includes("scss") || mimeType.includes("sass")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg`}>
        <FileCode className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("js") || mimeType.includes("ts")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg`}>
        <FileCode className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("python") || mimeType.includes("py")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-blue-400 to-yellow-500 flex items-center justify-center shadow-lg`}>
        <FileCode className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("illustrator") || mimeType.includes(".ai") || mimeType.includes("eps")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg`}>
        <FileType className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("photoshop") || mimeType.includes("psd") || mimeType.includes("xd")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg`}>
        <FileType className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("figma")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg`}>
        <FileType className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("svg")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center shadow-lg`}>
        <FileCode className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("text/plain") || mimeType.includes("text/")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-lg`}>
        <FileText className={iconClass + " text-white"} />
      </div>
    );
    
    if (mimeType.includes("epub") || mimeType.includes("mobi") || mimeType.includes("azw")) return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg`}>
        <Bookmark className={iconClass + " text-white"} />
      </div>
    );
    
    // Default file icon
    return (
      <div className={`${baseClass} rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-lg`}>
        <File className={iconClass + " text-white"} />
      </div>
    );
  };

  // Get status icon
  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-gray-400" />;
      case "uploading":
        return <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between gap-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || "root"} className="flex items-center gap-2 shrink-0">
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
                <button
                  onClick={() => navigateToFolder(crumb.id, crumb.name)}
                  className={`text-sm px-2 py-1 rounded ${
                    index === breadcrumbs.length - 1 
                      ? "bg-gray-800 text-white font-medium" 
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {index === 0 ? <Home className="w-4 h-4" /> : crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!trashMode && (
              <>
                <button 
                  onClick={() => setShowNewFolderModal(true)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </button>
                <button 
                  onClick={() => document.getElementById("file-input")?.click()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </>
            )}
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Files</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
          <div className="flex items-center border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setTrashMode(!trashMode);
              if (!trashMode) fetchTrashFiles();
              else fetchFiles();
            }}
            className={`p-2 rounded-lg transition-colors ${
              trashMode 
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
                : "hover:bg-gray-800 text-gray-400"
            }`}
            title={trashMode ? "Back to Files" : "Trash Bin"}
          >
            {trashMode ? <Home className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => fetchFiles()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Trash Info Banner */}
        {trashMode && (
          <div className="mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-sm font-medium text-amber-400">Trash Bin</span>
                <span className="text-sm text-gray-400 ml-2">
                  {trashFiles.length} file{trashFiles.length !== 1 ? "s" : ""} • Auto-delete after 30 days
                </span>
              </div>
            </div>
            <button
              onClick={handleEmptyTrash}
              disabled={trashFiles.length === 0}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash className="w-4 h-4" />
              Empty Trash
            </button>
          </div>
        )}
      </div>

      {/* Upload Queue Panel */}
      {uploadQueue.length > 0 && (
        <div className="border-b border-gray-800 bg-gray-900/50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium">Upload Queue</span>
              <span className="text-xs text-gray-500">({uploadQueue.length} files)</span>
            </div>
            <button
              onClick={clearUploads}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {uploadQueue.map((file) => (
              <div key={file.id} className="px-4 py-2 border-t border-gray-800/50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">{formatBytes(file.size)}</span>
                    </div>
                    {file.status === "uploading" && (
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div 
                          className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(file.progress, 100)}%` }}
                        />
                      </div>
                    )}
                    {file.status === "error" && (
                      <div className="text-xs text-red-400">{file.error || "Upload failed"}</div>
                    )}
                    {file.status === "completed" && (
                      <div className="text-xs text-emerald-400">Completed</div>
                    )}
                    {file.status === "pending" && (
                      <div className="text-xs text-gray-500">Waiting...</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div 
        className="flex-1 overflow-auto p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders.length > 0 && !trashMode && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Folders</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="group relative p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-violet-500/50 transition-colors text-left cursor-pointer"
                      onClick={() => navigateToFolder(folder.id, folder.name)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setFolderContextMenu({ x: e.clientX, y: e.clientY, folder });
                      }}
                    >
                      <Folder className="w-8 h-8 text-violet-400 mb-2" />
                      <div className="font-medium text-sm truncate">
                        {renameFolderId === folder.id ? (
                          <input
                            type="text"
                            value={renameFolderName}
                            onChange={(e) => setRenameFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameFolder(folder.id);
                              if (e.key === "Escape") {
                                setRenameFolderId(null);
                                setRenameFolderName("");
                              }
                            }}
                            onBlur={() => handleRenameFolder(folder.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 bg-gray-800 border border-violet-500 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          folder.name
                        )}
                      </div>
                      {/* Hover Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1.5 bg-gray-800/90 rounded-lg hover:bg-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderContextMenu({ x: e.clientX, y: e.clientY, folder });
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trash Files Grid View */}
            {trashMode && trashFiles.length > 0 && viewMode === "grid" && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Trash ({trashFiles.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {trashFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group relative p-3 bg-gray-900/50 border border-gray-800 rounded-xl opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowPreview(true);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, file });
                      }}
                    >
                      {/* Thumbnail (dimmed) */}
                      <div className="aspect-square bg-gray-800/50 rounded-lg mb-3 overflow-hidden">
                        {file.thumbnailUrl ? (
                          <img 
                            src={file.thumbnailUrl} 
                            alt={file.name} 
                            className="w-full h-full object-cover object-center opacity-50" 
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${file.thumbnailUrl ? 'hidden' : ''}`}>
                          {getFileIcon(file.mimeType)}
                        </div>
                        {/* Trash overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Trash2 className="w-8 h-8 text-amber-400" />
                        </div>
                      </div>
                      {/* Info */}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate text-gray-400">{file.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatBytes(Number(file.fileSize))} • {file.daysRemaining} days left
                        </div>
                      </div>
                      {/* Hover Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button 
                          className="p-1.5 bg-emerald-500/90 rounded-lg hover:bg-emerald-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(file.id);
                          }}
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4 text-white" />
                        </button>
                        <button 
                          className="p-1.5 bg-red-500/90 rounded-lg hover:bg-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermanentDelete(file.id);
                          }}
                          title="Delete permanently"
                        >
                          <XCircle className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trash Files List View */}
            {trashMode && trashFiles.length > 0 && viewMode === "list" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr className="text-left text-sm text-gray-400">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Deleted</th>
                      <th className="px-4 py-3 font-medium">Expires</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {trashFiles.map((file) => (
                      <tr 
                        key={file.id} 
                        className="hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => {
                          setSelectedFile(file);
                          setShowPreview(true);
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="opacity-50">
                              {getFileIcon(file.mimeType, "sm")}
                            </div>
                            <span className="font-medium text-gray-400 truncate max-w-xs">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatBytes(Number(file.fileSize))}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{new Date(file.deletedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-lg">
                            {file.daysRemaining} days
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleRestore(file.id)}
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg"
                              title="Restore"
                            >
                              <RotateCcw className="w-4 h-4 text-emerald-400" />
                            </button>
                            <button 
                              onClick={() => handlePermanentDelete(file.id)}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg"
                              title="Delete permanently"
                            >
                              <XCircle className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty Trash State */}
            {trashMode && trashFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                  <Trash2 className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">Trash is empty</h3>
                <p className="text-gray-500">Deleted files will appear here for 30 days</p>
              </div>
            )}

            {/* Files Grid View */}
            {files.length > 0 && viewMode === "grid" && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Files ({files.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="group relative p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-violet-500/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowPreview(true);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, file });
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square bg-gray-800 rounded-lg mb-3 overflow-hidden">
                        {file.thumbnailUrl ? (
                          <img 
                            src={file.thumbnailUrl} 
                            alt={file.name} 
                            className="w-full h-full object-cover object-center" 
                            onError={(e) => {
                              // Fallback to icon if thumbnail fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 ${file.thumbnailUrl ? 'hidden' : ''}`}>
                          {getFileIcon(file.mimeType)}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{file.name}</div>
                        <div className="text-xs text-gray-500">{formatBytes(Number(file.fileSize))}</div>
                        {file.expiresAt && (
                          <div className="text-xs text-amber-500 mt-1">
                            Expires: {new Date(file.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {/* Hover Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1.5 bg-gray-800/90 rounded-lg hover:bg-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, file });
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files List View */}
            {files.length > 0 && viewMode === "list" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr className="text-left text-sm text-gray-400">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {files.map((file) => (
                      <tr 
                        key={file.id} 
                        className="hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => {
                          setSelectedFile(file);
                          setShowPreview(true);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, file });
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {file.thumbnailUrl ? (
                              <img 
                                src={file.thumbnailUrl} 
                                alt={file.name} 
                                className="w-8 h-8 rounded object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                {getFileIcon(file.mimeType, "sm")}
                              </div>
                            )}
                            <span className="font-medium truncate">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatBytes(Number(file.fileSize))}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(file.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button 
                            className="p-1 hover:bg-gray-700 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenu({ x: e.clientX, y: e.clientY, file });
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {!trashMode && files.length === 0 && folders.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No files yet</h3>
                  <p className="text-gray-400 mb-4">Drag and drop files here or click Upload</p>
                  <button 
                    onClick={() => document.getElementById("file-input")?.click()}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
                  >
                    Upload Files
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div 
            className="fixed z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                setSelectedFile(contextMenu.file);
                setShowPreview(true);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Eye className="w-4 h-4" /> View
            </button>
            <button
              onClick={() => openShareOptions(contextMenu.file)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={() => {
                copyToClipboard(window.location.origin + "/api/files/" + contextMenu.file.id);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
            {contextMenu.file.url && (
              <a
                href={contextMenu.file.url}
                download={contextMenu.file.name}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            )}
            <hr className="my-2 border-gray-800" />
            {trashMode ? (
              <>
                <button
                  onClick={() => {
                    handleRestore(contextMenu.file.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-emerald-400"
                >
                  <RotateCcw className="w-4 h-4" /> Restore
                </button>
                <button
                  onClick={() => {
                    handlePermanentDelete(contextMenu.file.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-red-400"
                >
                  <XCircle className="w-4 h-4" /> Delete Permanently
                </button>
              </>
            ) : (
              <button
                onClick={() => handleDelete(contextMenu.file.id)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-red-400"
              >
                <Trash2 className="w-4 h-4" /> Move to Trash
              </button>
            )}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {showPreview && selectedFile && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div className="bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="shrink-0">
                  {getFileIcon(selectedFile.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-lg truncate">{selectedFile.name}</div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span>{formatBytes(Number(selectedFile.fileSize))}</span>
                    {selectedFile.mimeType && (
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">{selectedFile.mimeType}</span>
                    )}
                    <span>{new Date(selectedFile.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {/* Zoom controls for images */}
                {selectedFile.mimeType?.startsWith("image/") && (
                  <>
                    <button 
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-400 w-16 text-center">{Math.round(zoom * 100)}%</span>
                    <button 
                      onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setZoom(1)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-xs text-gray-400"
                      title="Reset zoom"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {/* Video controls */}
                {selectedFile.mimeType?.startsWith("video/") && (
                  <button 
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Theater mode"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className={`${isTheaterMode ? 'max-h-[80vh]' : 'max-h-[65vh]'} overflow-auto bg-gray-950/50 flex items-center justify-center`}>
              {/* IMAGE PREVIEW */}
              {selectedFile.mimeType?.startsWith("image/") && (
                selectedFile.url ? (
                  <div 
                    className="relative cursor-zoom-in overflow-hidden"
                    onClick={() => setZoom((z) => z === 1 ? 2 : z === 2 ? 1 : 1)}
                    onDoubleClick={() => setZoom((z) => z === 1 ? 2 : 1)}
                  >
                    <img 
                      src={selectedFile.url} 
                      alt={selectedFile.name} 
                      className="transition-transform duration-200"
                      style={{ 
                        maxWidth: `${zoom * 100}%`, 
                        maxHeight: isTheaterMode ? '75vh' : '60vh',
                        transform: `scale(${zoom})`,
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Zoom hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-xs text-gray-300 opacity-0 hover:opacity-100 transition-opacity">
                      Click to toggle zoom • Scroll to zoom
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <span className="text-gray-500">Preview not available</span>
                    </div>
                  </div>
                )
              )}
              
              {/* VIDEO PREVIEW */}
              {selectedFile.mimeType?.startsWith("video/") && (
                selectedFile.url ? (
                  <div className={`w-full ${isTheaterMode ? 'max-w-6xl' : 'max-w-4xl'} mx-auto`}>
                    <video 
                      key={selectedFile.id}
                      controls 
                      controlsList="nodownload"
                      className="w-full aspect-video bg-black rounded-lg shadow-2xl"
                      poster={selectedFile.thumbnailUrl || undefined}
                    >
                      <source src={selectedFile.url} type={selectedFile.mimeType || "video/mp4"} />
                      Your browser does not support the video tag.
                    </video>
                    {/* Video info bar */}
                    <div className="mt-3 flex items-center justify-center gap-6 text-sm text-gray-400">
                      <span>🎬 Video</span>
                      <span>⏱️ {selectedFile.mimeType}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <VideoIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <span className="text-gray-500">Video not available</span>
                    </div>
                  </div>
                )
              )}
              
              {/* AUDIO PREVIEW */}
              {selectedFile.mimeType?.startsWith("audio/") && (
                selectedFile.url ? (
                  <div className="w-full max-w-2xl mx-auto p-8">
                    <div className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 rounded-2xl p-8 border border-pink-500/20">
                      <div className="flex items-center gap-6 mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
                          <Music className="w-12 h-12 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{selectedFile.name}</div>
                          <div className="text-gray-400 text-sm mt-1">Audio File</div>
                          <div className="text-gray-500 text-xs mt-1">{selectedFile.mimeType}</div>
                        </div>
                      </div>
                      <audio 
                        controls 
                        controlsList="nodownload"
                        className="w-full h-12"
                        style={{ filter: 'hue-rotate(20deg)' }}
                      >
                        <source src={selectedFile.url} type={selectedFile.mimeType || "audio/mpeg"} />
                      </audio>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <MusicIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <span className="text-gray-500">Audio not available</span>
                    </div>
                  </div>
                )
              )}
              
              {/* PDF PREVIEW */}
              {selectedFile.mimeType?.includes("pdf") && (
                selectedFile.url ? (
                  <div className="w-full max-w-4xl mx-auto p-4">
                    <iframe 
                      src={selectedFile.url + '#toolbar=0'} 
                      className="w-full h-[60vh] rounded-lg border border-gray-800 bg-white"
                      title="PDF Preview"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <FileTextIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <span className="text-gray-500">PDF not available</span>
                    </div>
                  </div>
                )
              )}
              
              {/* TEXT PREVIEW */}
              {(selectedFile.mimeType?.includes("text/plain") || 
                selectedFile.mimeType?.includes("json") || 
                selectedFile.mimeType?.includes("javascript") ||
                selectedFile.mimeType?.includes("typescript") ||
                selectedFile.mimeType?.includes("html") ||
                selectedFile.mimeType?.includes("css") ||
                selectedFile.mimeType?.includes("xml") ||
                selectedFile.mimeType?.includes("yaml") ||
                selectedFile.mimeType?.includes("md")) && (
                selectedFile.url ? (
                  <div className="w-full max-w-4xl mx-auto p-4">
                    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border-b border-gray-800">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-xs text-gray-400 ml-2">{selectedFile.name}</span>
                      </div>
                      <iframe 
                        src={selectedFile.url} 
                        className="w-full h-[55vh] bg-gray-950"
                        title="Text Preview"
                        sandbox=""
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <FileCodeIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <span className="text-gray-500">File not available</span>
                    </div>
                  </div>
                )
              )}
              
              {/* UNSUPPORTED PREVIEW */}
              {!selectedFile.mimeType?.startsWith("image/") && 
               !selectedFile.mimeType?.startsWith("video/") && 
               !selectedFile.mimeType?.startsWith("audio/") && 
               !selectedFile.mimeType?.includes("pdf") &&
               !selectedFile.mimeType?.includes("text") &&
               !selectedFile.mimeType?.includes("json") &&
               !selectedFile.mimeType?.includes("javascript") &&
               !selectedFile.mimeType?.includes("html") &&
               !selectedFile.mimeType?.includes("xml") &&
               !selectedFile.mimeType?.includes("yaml") && (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-700 to-gray-800 rounded-3xl flex items-center justify-center">
                      {getFileIcon(selectedFile.mimeType)}
                    </div>
                    <div className="text-xl font-medium mb-2">{selectedFile.name}</div>
                    <div className="text-gray-500 mb-4">{selectedFile.mimeType || 'Unknown type'}</div>
                    <div className="text-gray-600 text-sm">Preview not available for this file type</div>
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <a
                        href={selectedFile.url || '#'}
                        download={selectedFile.name}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors flex items-center gap-2"
                        onClick={(e) => {
                          if (!selectedFile.url) e.preventDefault();
                        }}
                      >
                        <Download className="w-5 h-5" />
                        Download to View
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openShareOptions(selectedFile)}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  {selectedFile.url && (
                    <a
                      href={selectedFile.url}
                      download={selectedFile.name}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                </div>
                <button
                  onClick={() => {
                    handleDelete(selectedFile.id);
                    setShowPreview(false);
                  }}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Create New Folder</h3>
              <button 
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName("");
                }}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Folder name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") {
                    setShowNewFolderModal(false);
                    setNewFolderName("");
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName("");
                }}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {creatingFolder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderPlus className="w-4 h-4" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Context Menu */}
      {folderContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setFolderContextMenu(null)}
          />
          <div 
            className="fixed z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 min-w-[180px]"
            style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
          >
            <button
              onClick={() => {
                setRenameFolderId(folderContextMenu.folder.id);
                setRenameFolderName(folderContextMenu.folder.name);
                setFolderContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <FileText className="w-4 h-4" /> Rename
            </button>
            <button
              onClick={() => {
                navigateToFolder(folderContextMenu.folder.id, folderContextMenu.folder.name);
                setFolderContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Folder className="w-4 h-4" /> Open
            </button>
            <hr className="my-2 border-gray-800" />
            <button
              onClick={() => handleDeleteFolder(folderContextMenu.folder.id)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-red-400"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}

      {/* Share Options Modal */}
      {showShareModal && !shareToken && selectedFile && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Share Settings</h3>
                  <p className="text-xs text-gray-400">{selectedFile.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setSharePassword("");
                  setShareExpireHours(0);
                  setShareAllowDownload(true);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Password Protection */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sharePassword.length > 0}
                  onChange={(e) => setSharePassword(e.target.checked ? "" : "")}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-violet-500 focus:ring-violet-500"
                />
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Password protection</span>
              </label>
              {sharePassword !== undefined && (
                <input
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Enter password..."
                  className="mt-2 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                />
              )}
            </div>
            
            {/* Expiry */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Link expires</label>
              <select
                value={shareExpireHours}
                onChange={(e) => setShareExpireHours(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-violet-500"
              >
                <option value={0}>Never</option>
                <option value={1}>1 hour</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>
            
            {/* Allow Download */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareAllowDownload}
                  onChange={(e) => setShareAllowDownload(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-violet-500 focus:ring-violet-500"
                />
                <Download className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Allow downloads</span>
              </label>
            </div>
            
            <button
              onClick={() => openShareOptions(selectedFile)}
              className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Create Share Link
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareToken && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Share Link Created!</h3>
                  {shareOptions?.passwordProtected && (
                    <span className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                      <Lock className="w-3 h-3" /> Password protected
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setShareToken(null);
                  setSharePassword("");
                  setShareExpireHours(0);
                  setShareAllowDownload(true);
                  setShareOptions(null);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Share URL */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Share URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={window.location.origin + shareToken}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm"
                />
                <button
                  onClick={() => copyToClipboard(window.location.origin + shareToken)}
                  className="px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Share Options Info */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-xl space-y-2">
              {shareOptions?.passwordProtected ? (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span>This link is password protected</span>
                </div>
              ) : null}
              {shareOptions?.expiresAt ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Expires: {new Date(shareOptions.expiresAt).toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Never expires</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {shareOptions?.allowDownload ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Downloads allowed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Downloads disabled</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Password Protected Info */}
            {shareOptions?.passwordProtected && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 text-sm mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Password Required</span>
                </div>
                <p className="text-xs text-gray-400">
                  Recipients must enter the password to access this file. Make sure to share the password separately.
                </p>
              </div>
            )}
            
            <button
              onClick={() => {
                setShowShareModal(false);
                setShareToken(null);
                setSharePassword("");
                setShareExpireHours(0);
                setShareAllowDownload(true);
                setShareOptions(null);
              }}
              className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

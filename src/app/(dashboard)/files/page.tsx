"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { AudioPreview, PdfPreview, CodePreview, TextPreview, XlsxPreview } from "@/components/PreviewComponents";
import DocViewer from "@cyntler/react-doc-viewer";
import { useUser } from "@clerk/nextjs";
import { 
  FolderPlus,
  FolderInput, 
  Upload, 
  Grid, 
  List, 
  Search, 
  MoreVertical,
  CheckSquare,
  Image,
  Video,
  Music,
  File,
  Folder,
  ChevronRight,
  ChevronDown,
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
  Edit,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Info,
  Calendar,
  ExternalLink,
  Play,
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

interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderTreeNode[];
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
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "My Files" }]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit, setStorageLimit] = useState(5 * 1024 * 1024 * 1024); // 5GB default
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const wavesurferRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startDragX: 0,
    startDragY: 0,
  });
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [trashMode, setTrashMode] = useState(false);
  const [trashFiles, setTrashFiles] = useState<any[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: FolderTreeNode } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingFile, setMovingFile] = useState<FileItem | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingItem, setRenamingItem] = useState<{ type: "file" | "folder"; item: any } | null>(null);
  const [newName, setNewName] = useState("");
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  // NEW: Folder tree state
  const [allFolders, setAllFolders] = useState<FolderTreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  // Build tree from flat list

  // Sort files
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "date":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "size":
          cmp = Number(a.fileSize) - Number(b.fileSize);
          break;
        case "type":
          cmp = (a.mimeType || "").localeCompare(b.mimeType || "");
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [files, sortBy, sortOrder]);

  const buildTree = useCallback((folders: FolderItem[]): FolderTreeNode[] => {
    const map = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];
    
    // Create nodes
    folders.forEach(f => {
      map.set(f.id, { ...f, children: [] });
    });
    
    // Build hierarchy
    folders.forEach(f => {
      const node = map.get(f.id)!;
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    
    // Sort alphabetically
    const sortNodes = (nodes: FolderTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);
    
    return roots;
  }, []);

  // Fetch all folders for tree
  const fetchAllFolders = useCallback(async () => {
    if (!isLoaded || !user) return;
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = await res.json();
        setAllFolders(buildTree(data.folders || []));
      }
    } catch (error) {
      console.error("Fetch folders error:", error);
    }
  }, [isLoaded, user, buildTree]);

  // Fetch storage usage
  const fetchStorage = useCallback(async () => {
    if (!isLoaded || !user) return;
    try {
      const res = await fetch("/api/storage");
      if (res.ok) {
        const data = await res.json();
        setStorageUsed(data.usedBytes || 0);
        setStorageLimit(data.limitBytes || 5 * 1024 * 1024 * 1024);
      }
    } catch (error) {
      console.error("Fetch storage error:", error);
    }
  }, [isLoaded, user]);

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
    fetchAllFolders();
    fetchStorage();
  }, [fetchFiles, fetchAllFolders, fetchStorage]);

  // Professional Pan & Zoom Handler
  useEffect(() => {
    const container = document.getElementById("pan-container");
    const image = document.getElementById("pan-image");
    if (!container || !image) return;

    let isDragging = false;
    let currentX = dragPos.x;
    let currentY = dragPos.y;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (zoom <= 1) return;
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      currentX = dragPos.x;
      currentY = dragPos.y;
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      currentX += dx;
      currentY += dy;
      lastX = e.clientX;
      lastY = e.clientY;
      image.style.transform = `scale(${zoom}) translate(${currentX}px, ${currentY}px)`;
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        setDragPos({ x: currentX, y: currentY });
      }
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [zoom, dragPos, setDragPos]);

  // Keyboard Shortcuts - Preview mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      
      // Escape - Close preview
      if (key === "escape") {
        setShowPreview(false);
        if (showDetails) setShowDetails(false);
        if (contextMenu) setContextMenu(null);
        if (folderContextMenu) setFolderContextMenu(null);
      }
      
      // Arrow keys - Navigate files in preview mode
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) && showPreview && files.length > 0) {
        e.preventDefault();
        const currentIndex = selectedFile ? files.findIndex(f => f.id === selectedFile.id) : -1;
        if (key === "arrowdown" || key === "arrowright") {
          const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
          setSelectedFile(files[nextIndex]);
        } else {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
          setSelectedFile(files[prevIndex]);
        }
      }
      
      // + / = - Zoom in
      if ((key === "+" || key === "=") && showPreview) {
        e.preventDefault();
        setZoom(z => Math.min(3, z + 0.25));
      }
      
      // - - Zoom out
      if (key === "-" && showPreview) {
        e.preventDefault();
        setZoom(z => Math.max(0.5, z - 0.25));
      }
      
      // 0 - Reset zoom
      if (key === "0" && showPreview) {
        e.preventDefault();
        setZoom(1);
        setDragPos({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, showPreview, showDetails, contextMenu, folderContextMenu, files]);

  // Toggle folder expand
  const toggleExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  // Navigate to folder
  const navigateToFolder = useCallback((folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "My Files" }]);
    } else {
      // Build path to root
      const path: { id: string | null; name: string }[] = [{ id: null, name: "My Files" }];
      
      const findPath = (nodes: FolderTreeNode[], targetId: string): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            path.push({ id: node.id, name: node.name });
            return true;
          }
          if (findPath(node.children, targetId)) {
            path.push({ id: node.id, name: node.name });
            return true;
          }
        }
        return false;
      };
      
      findPath(allFolders, folderId);
      setBreadcrumbs(path.reverse());
    }
  }, [allFolders]);

  // Handle file upload
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

    for (let i = 0; i < newFiles.length; i++) {
      const uploadFile = newFiles[i];
      const actualFile = Array.from(fileList).find((f) => f.name === uploadFile.name);
      if (!actualFile) continue;

      setUploadQueue((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading" } : f))
      );

      try {
        const params = new URLSearchParams({
          fileName: actualFile.name,
          contentType: actualFile.type,
          fileSize: String(actualFile.size),
        });
        if (currentFolderId) params.set("folderId", currentFolderId);
        
        const urlRes = await fetch(`/api/upload-url?${params.toString()}`);
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, fileKey } = await urlRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: actualFile,
          headers: { "Content-Type": actualFile.type },
        });
        if (!uploadRes.ok) throw new Error("Failed to upload");

        const confirmRes = await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileKey,
            fileName: actualFile.name,
            mimeType: actualFile.type,
            fileSize: actualFile.size,
            folderId: currentFolderId,
          }),
        });
        if (!confirmRes.ok) throw new Error("Failed to confirm");

        setUploadQueue((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "completed", progress: 100 } : f))
        );
      } catch (error: any) {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error", error: error.message } : f
          )
        );
      }
    }

    setTimeout(() => setUploadQueue((prev) => prev.filter((f) => f.status !== "completed")), 3000);
    fetchFiles();
  };

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, file: FileItem) => {
    setDraggingFileId(file.id);
    
    // If select mode is on and multiple files selected, drag all
    if (selectMode && selectedFiles.size > 0) {
      const allFileIds = JSON.stringify(Array.from(selectedFiles));
      e.dataTransfer.setData("fileIds", allFileIds);
    } else {
      e.dataTransfer.setData("fileId", file.id);
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingFileId(null);
    setDropTargetFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetFolderId(folderId);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData("fileId");
    if (!fileId) return;

    // Can't drop into the same folder
    const file = files.find(f => f.id === fileId);
    if (file && file.folderId === targetFolderId) {
      setDraggingFileId(null);
      setDropTargetFolderId(null);
      return;
    }

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      if (res.ok) {
        fetchFiles();
        if (targetFolderId) {
          showToastMessage("File moved");
        }
      }
    } catch (error) {
      console.error("Drop error:", error);
    }
    setDraggingFileId(null);
    setDropTargetFolderId(null);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  // Delete
    // Bulk operations
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const selectAllFiles = () => {
    setSelectedFiles(new Set(files.map(f => f.id)));
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
    setSelectMode(false);
  };

  const handleBulkDelete = async () => {
    const fileIds = Array.from(selectedFiles);
    if (fileIds.length === 0) return;
    if (!confirm(`Delete ${fileIds.length} file(s)?`)) return;
    
    try {
      for (const fileId of fileIds) {
        await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      }
      clearSelection();
      fetchFiles();
      showToastMessage(`Deleted ${fileIds.length} file(s)`);
    } catch (error) {
      console.error("Bulk delete error:", error);
      showToastMessage("Failed to delete files");
    }
  };

  const handleBulkDeletePermanent = async () => {
    const fileIds = Array.from(selectedFiles);
    if (fileIds.length === 0) return;
    if (!confirm(`Permanently delete ${fileIds.length} file(s)?`)) return;
    
    try {
      for (const fileId of fileIds) {
        await fetch(`/api/files/${fileId}?permanent=true`, { method: "DELETE" });
      }
      clearSelection();
      fetchFiles();
      showToastMessage(`Permanently deleted ${fileIds.length} file(s)`);
    } catch (error) {
      console.error("Bulk permanent delete error:", error);
      showToastMessage("Failed to delete files");
    }
  };

    const handleBulkRestore = async () => {
    const fileIds = Array.from(selectedFiles);
    if (fileIds.length === 0) return;
    
    try {
      for (const fileId of fileIds) {
        await fetch(`/api/files/${fileId}/restore`, { method: "POST" });
      }
      clearSelection();
      fetchTrashFiles();
      showToastMessage(`Restored ${fileIds.length} file(s)`);
    } catch (error) {
      console.error("Bulk restore error:", error);
      showToastMessage("Failed to restore files");
    }
  };

    // Helper functions for file type detection
  const isCodeFile = (filename: string) => {
    const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'env', 'gitignore', 'dockerfile', 'makefile'];
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return codeExtensions.includes(ext);
  };
  
    const isSpreadsheetFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['xlsx', 'xls', 'csv', 'ods'].includes(ext);
  };
  
const isTextFile = (filename: string) => {
    const textExtensions = ['txt', 'md', 'markdown', 'log', 'cfg', 'conf', 'ini', 'env', 'gitignore', 'gitattributes', 'editorconfig', 'license', 'readme', 'changelog'];
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return textExtensions.includes(ext);
  };

const handleBulkMove = async (targetFolderId: string | null) => {
    const fileIds = Array.from(selectedFiles);
    if (fileIds.length === 0) return;
    
    try {
      for (const fileId of fileIds) {
        await fetch(`/api/files/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: targetFolderId }),
        });
      }
      clearSelection();
      fetchFiles();
      showToastMessage(`Moved ${fileIds.length} file(s)`);
    } catch (error) {
      console.error("Bulk move error:", error);
      showToastMessage("Failed to move files");
    }
  };

const handleDelete = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (res.ok) {
        fetchFiles();
        if (trashMode) fetchTrashFiles();
        showToastMessage("File moved to trash");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
    setContextMenu(null);
  };

  const handlePermanentDelete = async (fileId: string) => {
    if (!confirm("Permanently delete this file?")) return;
    try {
      const res = await fetch(`/api/files/${fileId}?permanent=true`, { method: "DELETE" });
      if (res.ok) fetchTrashFiles();
    } catch (error) {
      console.error("Permanent delete error:", error);
    }
    setContextMenu(null);
  };

  const handleRestore = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      if (res.ok) {
        fetchTrashFiles();
        showToastMessage("File restored");
      }
    } catch (error) {
      console.error("Restore error:", error);
    }
    setContextMenu(null);
  };

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

  const handleEmptyTrash = async () => {
    if (!confirm("Delete ALL files in trash?")) return;
    try {
      const res = await fetch("/api/trash", { method: "DELETE" });
      if (res.ok) {
        fetchTrashFiles();
        showToastMessage("Trash emptied");
      }
    } catch (error) {
      console.error("Empty trash error:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newFolderName.trim(), 
          parentId: newFolderParentId || null 
        }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowNewFolderModal(false);
        fetchAllFolders();
        showToastMessage("Folder created successfully");
        if (currentFolderId) {
          const folder = allFolders.find(f => f.id === currentFolderId);
          if (folder) toggleExpand(currentFolderId);
        }
      } else {
        const err = await res.json();
        showToastMessage("Error: " + (err.error || "Failed to create folder"));
      }
    } catch (error) {
      console.error("Create folder error:", error);
      showToastMessage("Error: Something went wrong");
    } finally {
      setCreatingFolder(false);
    }
  };

  // Move file to folder
  const handleMoveFile = async (targetFolderId: string | null) => {
    if (!movingFile) return;
    try {
      const res = await fetch(`/api/files/${movingFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      if (res.ok) {
        setShowMoveModal(false);
        setMovingFile(null);
        fetchFiles();
        showToastMessage("File moved successfully");
      } else {
        const err = await res.json();
        showToastMessage("Error: " + (err.error || "Failed to move"));
      }
    } catch (error) {
      console.error("Move file error:", error);
      showToastMessage("Error: Failed to move file");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder?")) return;
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      if (res.ok) {
        fetchAllFolders();
        fetchFiles();
        showToastMessage("Folder deleted");
      }
    } catch (error) {
      console.error("Delete folder error:", error);
    }
  };

  // Handle rename
  const handleRename = async () => {
    if (!renamingItem || !newName.trim()) return;
    try {
      if (renamingItem.type === "file") {
        const res = await fetch(`/api/files/${renamingItem.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        if (res.ok) {
          setShowRenameModal(false);
          setRenamingItem(null);
          setNewName("");
          fetchFiles();
          showToastMessage("File renamed");
        }
      } else {
        const res = await fetch(`/api/folders/${renamingItem.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        if (res.ok) {
          setShowRenameModal(false);
          setRenamingItem(null);
          setNewName("");
          fetchAllFolders();
          showToastMessage("Folder renamed");
        }
      }
    } catch (error) {
      console.error("Rename error:", error);
      showToastMessage("Error: Failed to rename");
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Folder Tree Node Component
  const FolderTreeNode = ({ folder, level = 0 }: { folder: FolderTreeNode; level: number }) => {
    const hasChildren = folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = currentFolderId === folder.id;

    return (
      <div className="group">
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
            isActive 
              ? "bg-violet-500/20 text-violet-400" 
              : dropTargetFolderId === folder.id
                ? "bg-violet-500/30 border-2 border-violet-500"
                : "text-gray-300 hover:bg-gray-800/50"
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => navigateToFolder(folder.id, folder.name)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDrop={(e) => handleDrop(e, folder.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setFolderContextMenu({ x: e.clientX, y: e.clientY, folder });
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
              className="p-0.5 hover:bg-gray-700 rounded shrink-0"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <Folder className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="truncate text-sm flex-1">
            {folder.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="overflow-hidden transition-all duration-200">
            {folder.children.map(child => (
              <FolderTreeNode key={child.id} folder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // File icon helper
  const getFileIcon = (mimeType: string | null, size: "sm" | "md" | "lg" = "md") => {
    if (!mimeType) return <Folder className="w-5 h-5 text-amber-400" />;
    
    const base = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
    const iconBase = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-6 h-6" : "w-4 h-4";
    
    if (mimeType.startsWith("image/")) return <Image className={`${base} text-emerald-400`} />;
    if (mimeType.startsWith("video/")) return <Film className={`${base} text-blue-400`} />;
    if (mimeType.startsWith("audio/")) return <Headphones className={`${base} text-pink-400`} />;
    if (mimeType.includes("pdf")) return <FileText className={`${base} text-red-400`} />;
    if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) return <Archive className={`${base} text-amber-400`} />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return <FileSpreadsheet className={`${base} text-green-400`} />;
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return <Presentation className={`${base} text-orange-400`} />;
    
    return <File className={`${base} text-gray-400`} />;
  };

  // Mini Content Preview for grid view
  const MiniPreview = ({ file, onPreview }: { file: FileItem; onPreview: () => void }) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isPdf = file.mimeType?.includes('pdf') || ext === 'pdf';
    const isDocx = file.mimeType?.includes('wordprocessingml') || ['docx', 'doc'].includes(ext);
    const isXlsx = file.mimeType?.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(ext);
    const isCode = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'html', 'css', 'json', 'yaml', 'sql', 'sh', 'md', 'txt'].includes(ext);
    const isText = ['log', 'cfg', 'conf', 'ini', 'env'].includes(ext);
    
    // For files with thumbnails (images/videos), show the thumbnail
    if (file.thumbnailUrl) {
      return (
        <div className="aspect-square rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={onPreview}>
          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>
      );
    }
    
    // PDF Mini Preview
    if (isPdf) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity" onClick={onPreview}>
          <FileText className="w-10 h-10 text-white/90 mb-2" />
          <span className="text-[10px] text-white/70 font-medium">PDF</span>
        </div>
      );
    }
    
    // DOCX Mini Preview  
    if (isDocx) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity" onClick={onPreview}>
          <FileText className="w-10 h-10 text-white/90 mb-2" />
          <span className="text-[10px] text-white/70 font-medium">DOCX</span>
        </div>
      );
    }
    
    // XLSX Mini Preview
    if (isXlsx) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity" onClick={onPreview}>
          <FileSpreadsheet className="w-10 h-10 text-white/90 mb-2" />
          <span className="text-[10px] text-white/70 font-medium">{ext.toUpperCase()}</span>
        </div>
      );
    }
    
    // Code Mini Preview with syntax colors
    if (isCode) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-2 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden" onClick={onPreview}>
          <div className="grid grid-cols-3 gap-1 mb-1">
            <div className="w-3 h-3 rounded-sm bg-violet-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <div className="w-3 h-3 rounded-sm bg-pink-500" />
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <div className="w-3 h-3 rounded-sm bg-red-500" />
          </div>
          <span className="text-[9px] text-gray-400 font-mono">{ext.toUpperCase()}</span>
        </div>
      );
    }
    
    // Text Mini Preview
    if (isText) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden" onClick={onPreview}>
          <div className="space-y-1 mb-2">
            <div className="w-12 h-1.5 bg-gray-500 rounded" />
            <div className="w-10 h-1.5 bg-gray-600 rounded" />
            <div className="w-8 h-1.5 bg-gray-500 rounded" />
          </div>
          <span className="text-[9px] text-gray-400">TEXT</span>
        </div>
      );
    }
    
    // Audio Mini Preview
    if (file.mimeType?.startsWith('audio/')) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity" onClick={onPreview}>
          <Headphones className="w-10 h-10 text-white/90 mb-2" />
          <div className="flex gap-0.5">
            <div className="w-1 h-4 bg-white/50 rounded-t" />
            <div className="w-1 h-6 bg-white/50 rounded-t" />
            <div className="w-1 h-3 bg-white/50 rounded-t" />
            <div className="w-1 h-5 bg-white/50 rounded-t" />
          </div>
        </div>
      );
    }
    
    // Video Mini Preview (without thumbnail)
    if (file.mimeType?.startsWith('video/')) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity" onClick={onPreview}>
          <Film className="w-10 h-10 text-white/90 mb-2" />
          <Play className="w-6 h-6 text-white/70" />
        </div>
      );
    }
    
    // Default file icon
    return (
      <div className="aspect-square rounded-lg bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors" onClick={onPreview}>
        <File className="w-10 h-10 text-gray-500" />
      </div>
    );
  };

  // Status icon
  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-gray-400" />;
      case "uploading": return <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />;
      case "completed": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "error": return <XCircle className="w-4 h-4 text-red-400" />;
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
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-white rounded-lg shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* LEFT SIDEBAR - Folder Tree */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-200 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Folders</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-800 rounded"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* My Files root */}
          <div
            className={`flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-all duration-150 ${
              currentFolderId === null ? "bg-violet-500/20 text-violet-400" : dropTargetFolderId === null
                ? "bg-violet-500/30 border-2 border-violet-500"
                : "text-gray-300 hover:bg-gray-800/50"
            }`}
            onClick={() => navigateToFolder(null, "My Files")}
            onDragOver={(e) => handleDragOver(e, null)}
            onDrop={(e) => handleDrop(e, null)}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate">My Files</span>
          </div>

          {/* Folder tree */}
          {allFolders.map(folder => (
            <FolderTreeNode key={folder.id} folder={folder} level={0} />
          ))}

          {allFolders.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No folders yet
            </div>
          )}
        </div>

        {/* Storage Quota */}
        <div className="px-3 py-2 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Storage</span>
            <span>{Math.round(storageUsed / 1024 / 1024)} MB / {Math.round(storageLimit / 1024 / 1024 / 1024)} GB</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${storageUsed / storageLimit > 0.9 ? "bg-red-500" : storageUsed / storageLimit > 0.7 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${Math.min((storageUsed / storageLimit) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* New Folder Button */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
        </div>
      </div>

      {/* Toggle Sidebar Button (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-r-lg border border-l-0 border-gray-700"
        >
          <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
        </button>
      )}

      {/* RIGHT CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
                    className={`text-sm px-2 py-1 rounded flex items-center gap-1.5 ${
                      index === breadcrumbs.length - 1 
                        ? "bg-gray-800 text-white font-medium" 
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    {index === 0 ? <Home className="w-4 h-4" /> : null}
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Actions - Normal mode */}
            {selectedFiles.size === 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    selectMode 
                      ? "bg-violet-600 hover:bg-violet-500 text-white" 
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectMode ? "Cancel" : "Select"}
                </button>
                <button 
                  onClick={() => document.getElementById("file-input")?.click()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
                <button
                  onClick={() => {
                    setTrashMode(!trashMode);
                    if (!trashMode) fetchTrashFiles();
                    else fetchFiles();
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    trashMode 
                      ? "bg-amber-500/20 text-amber-400" 
                      : "hover:bg-gray-800 text-gray-400"
                  }`}
                  title={trashMode ? "Back to Files" : "Trash"}
                >
                  {trashMode ? <Home className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { fetchFiles(); fetchAllFolders(); }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            )}
            
            {/* Bulk Action Bar - When files selected */}
            {selectedFiles.size > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-violet-300 font-medium">
                  {selectedFiles.size} file{selectedFiles.size > 1 ? "s" : ""} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllFiles}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                  {trashMode ? (
                    <>
                      <button
                        onClick={handleBulkRestore}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={handleBulkDeletePermanent}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                      >
                        Delete Forever
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowMoveModal(true)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors"
                      >
                        Move
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 hover:bg-gray-800 text-sm rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
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

            {/* Sort Controls */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </button>
          </div>
          {/* Trash Banner */}
          {trashMode && trashFiles.length > 0 && (
            <div className="mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-gray-400">{trashFiles.length} files in trash</span>
              </div>
              <button
                onClick={handleEmptyTrash}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
              >
                Empty Trash
              </button>
            </div>
          )}
        </div>

        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div className="border-b border-gray-800 bg-gray-900">
            <div className="px-4 py-3 flex items-center justify-between bg-gray-900/80">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-violet-400 animate-bounce" />
                <span className="text-sm font-medium">Uploading {uploadQueue.length} files</span>
              </div>
              <button
                onClick={() => setUploadQueue([])}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800"
              >
                Clear All
              </button>
            </div>
            <div className="px-4 pb-3 space-y-2">
              {uploadQueue.map((file, index) => (
                <div key={file.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2 shrink-0">{formatBytes(file.size)}</span>
                    </div>
                    {file.status === "uploading" && (
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full animate-pulse"
                          style={{ width: `${file.progress || 50}%` }}
                        />
                      </div>
                    )}
                    {file.status === "error" && (
                      <p className="text-xs text-red-400">{file.error || "Upload failed"}</p>
                    )}
                    {file.status === "completed" && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Done
                      </p>
                    )}
                    {file.status === "pending" && (
                      <p className="text-xs text-gray-500">Waiting...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div 
          className="flex-1 overflow-auto p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {/* Empty State */}
          {!trashMode && files.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <FolderOpen className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">No files here</h3>
              <p className="text-gray-400 mb-4">Drag and drop files or click Upload</p>
              <button 
                onClick={() => document.getElementById("file-input")?.click()}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
              >
                Upload Files
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          )}

          {/* Trash Empty State */}
          {trashMode && trashFiles.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Trash2 className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium mb-2">Trash is empty</h3>
              <p className="text-gray-400">Deleted files appear here</p>
            </div>
          )}

          {/* Files Grid */}
          {!loading && files.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group bg-gray-900 border rounded-xl p-4 hover:border-gray-700 transition-all cursor-pointer ${
                    draggingFileId === file.id ? "opacity-50" : ""
                  } ${
                    selectedFiles.has(file.id) 
                      ? "border-violet-500 bg-violet-500/10" 
                      : "border-gray-800"
                  }`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, file)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (selectMode) {
                      toggleFileSelection(file.id);
                    } else {
                      setSelectedFile(file);
                      setShowPreview(true);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, file });
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {selectMode && (
                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.id); }}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                          selectedFiles.has(file.id) 
                            ? "bg-violet-500 border-violet-500" 
                            : "border-gray-600 hover:border-violet-400"
                        }`}
                      >
                        {selectedFiles.has(file.id) && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                    )}
                    <div className="flex-1" />
                  </div>
                  <MiniPreview 
                    file={file} 
                    onPreview={() => { setSelectedFile(file); setShowPreview(true); }}
                  />
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatBytes(Number(file.fileSize))}</p>
                    </div>
                    <button
                      className="p-1 hover:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Files List */}
          {!loading && files.length > 0 && viewMode === "list" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 w-12">
                      {selectMode && (
                        <div 
                          onClick={selectAllFiles}
                          className="w-6 h-6 rounded border-2 border-gray-600 hover:border-violet-400 cursor-pointer flex items-center justify-center"
                        >
                        </div>
                      )}
                    </th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedFiles.map((file) => (
                    <tr 
                      key={file.id}
                      className={`hover:bg-gray-800/50 cursor-pointer ${draggingFileId === file.id ? "opacity-50" : ""} ${
                        selectedFiles.has(file.id) ? "bg-violet-500/10" : ""
                      }`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, file)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (selectMode) {
                          toggleFileSelection(file.id);
                        } else {
                          setSelectedFile(file);
                          setShowPreview(true);
                        }
                      }}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
                    >
                      <td className="px-4 py-3">
                        {selectMode && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.id); }}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                              selectedFiles.has(file.id) 
                                ? "bg-violet-500 border-violet-500" 
                                : "border-gray-600 hover:border-violet-400"
                            }`}
                          >
                            {selectedFiles.has(file.id) && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {file.thumbnailUrl ? (
                            <img src={file.thumbnailUrl} alt={file.name} className="w-8 h-8 rounded object-cover" />
                          ) : getFileIcon(file.mimeType, "sm")}
                          <span className="font-medium truncate">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{formatBytes(Number(file.fileSize))}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(file.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button 
                          className="p-1 hover:bg-gray-700 rounded"
                          onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
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
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div 
            className="fixed z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { setSelectedFile(contextMenu.file); setShowPreview(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Eye className="w-4 h-4" /> View
            </button>
            <button
              onClick={() => { setSelectedFile(contextMenu.file); setShowDetails(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Info className="w-4 h-4" /> Details
            </button>
            <button
              onClick={() => { setSelectedFile(contextMenu.file); setShowShareModal(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={() => { setMovingFile(contextMenu.file); setShowMoveModal(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <FolderInput className="w-4 h-4" /> Move to...
            </button>
            <button
              onClick={() => { setRenamingItem({ type: "file", item: contextMenu.file }); setNewName(contextMenu.file.name); setShowRenameModal(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Edit className="w-4 h-4" /> Rename
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + "/api/files/" + contextMenu.file.id);
                showToastMessage("Link copied!");
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
                  onClick={() => handleRestore(contextMenu.file.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-emerald-400"
                >
                  <RotateCcw className="w-4 h-4" /> Restore
                </button>
                <button
                  onClick={() => handlePermanentDelete(contextMenu.file.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-red-400"
                >
                  <XCircle className="w-4 h-4" /> Delete Forever
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

      {/* Folder Context Menu */}
      {folderContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFolderContextMenu(null)} />
          <div 
            className="fixed z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 min-w-[180px]"
            style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
          >
            <button
              onClick={() => {
                setNewFolderParentId(folderContextMenu.folder.id);
                setNewFolderName("");
                setShowNewFolderModal(true);
                setFolderContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <FolderPlus className="w-4 h-4" /> New Subfolder
            </button>
            <button
              onClick={() => {
                navigateToFolder(folderContextMenu.folder.id, folderContextMenu.folder.name);
                setFolderContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <FolderOpen className="w-4 h-4" /> Open
            </button>
            <button
              onClick={() => {
                setRenamingItem({ type: "folder", item: folderContextMenu.folder }); setNewName(folderContextMenu.folder.name); setShowRenameModal(true); setFolderContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Edit className="w-4 h-4" /> Rename
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(folderContextMenu.folder.id);
                showToastMessage("Folder ID copied!");
                setFolderContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3"
            >
              <Copy className="w-4 h-4" /> Copy ID
            </button>
            <hr className="my-2 border-gray-800" />
            <button
              onClick={() => { handleDeleteFolder(folderContextMenu.folder.id); setFolderContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-red-400"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}

      {/* Preview Modal - Mobile Optimized */}
      {showPreview && selectedFile && (
        <div 
          className="fixed inset-0 z-50 flex flex-col md:flex-row"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
        >
          {/* Top bar - Close and Info buttons */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            {/* Info button for mobile */}
            <button 
              onClick={() => setMobileDetailsOpen(true)} 
              className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm md:hidden"
            >
              <Info className="w-6 h-6 text-white" />
            </button>
            {/* Close button */}
            <button 
              onClick={() => setShowPreview(false)} 
              className="p-3 bg-black/30 hover:bg-black/50 border border-white/50 hover:border-white rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* Main Content - Comprehensive File Preview */}
          <div className="flex-1 flex items-center justify-center p-4 pb-24 md:pb-4 overflow-hidden">
            <div 
              id="pan-container"
              className="relative select-none w-full h-full flex items-center justify-center"
              style={{ touchAction: 'none' }}
            >
              {/* IMAGE PREVIEW */}
              {selectedFile.mimeType?.startsWith("image/") && selectedFile.url && (
                <div className="cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center">
                  <img 
                    id="pan-image"
                    src={selectedFile.url} 
                    alt={selectedFile.name} 
                    draggable={false}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    style={{
                      transform: `scale(${zoom}) translate(${dragPos.x}px, ${dragPos.y}px)`,
                      willChange: 'transform',
                    }}
                  />
                </div>
              )}
              
              {/* VIDEO PREVIEW */}
              {selectedFile.mimeType?.startsWith("video/") && selectedFile.url && (
                <video 
                  src={selectedFile.url} 
                  controls 
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl" 
                  autoPlay
                />
              )}
              
              {/* AUDIO PREVIEW - Waveform Player */}
              {selectedFile.mimeType?.startsWith("audio/") && selectedFile.url && (
                <AudioPreview url={selectedFile.url} />
              )}
              
              {/* PDF PREVIEW */}
              {(selectedFile.mimeType === "application/pdf" || selectedFile.mimeType?.includes("pdf")) && selectedFile.url && (
                <PdfPreview proxyUrl={`/api/files/${selectedFile.id}/proxy`} filename={selectedFile.name} />
              )}
              
              {/* DOCX/PPTX via DocViewer */}
              {(selectedFile.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || selectedFile.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") && selectedFile.url && (
                <div className="bg-gray-900 rounded-2xl shadow-2xl w-[90vw] max-w-5xl overflow-hidden">
                  <DocViewer documents={[{ uri: `/api/files/${selectedFile.id}/proxy`, fileName: selectedFile.name }]} />
                </div>
              )}
              
              {/* CODE FILE PREVIEW */}
              {isCodeFile(selectedFile.name) && selectedFile.url && (
                <CodePreview url={selectedFile.url} filename={selectedFile.name} />
              )}
              
              {/* TEXT FILE PREVIEW */}
              {isTextFile(selectedFile.name) && selectedFile.url && (
                <TextPreview url={selectedFile.url} />
              )}
              
              {/* XLSX/SPREADSHEET PREVIEW */}
              {isSpreadsheetFile(selectedFile.name) && selectedFile.url && (
                <XlsxPreview url={selectedFile.url} />
              )}
              
              {/* NO URL AVAILABLE */}
              {!selectedFile.url && (
                <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl text-center">
                  <File className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Preview not available</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Zoom controls - Fixed position */}
          {selectedFile.mimeType?.startsWith("image/") && selectedFile.url && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900/95 backdrop-blur px-4 py-2 rounded-full shadow-xl border border-gray-800">
              <button onClick={() => { setZoom((z) => Math.max(0.5, z - 0.25)); setDragPos({ x: 0, y: 0 }); }} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-300 w-16 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={() => { setZoom(1); setDragPos({ x: 0, y: 0 }); }} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* Desktop sidebar - Right Panel (hidden on mobile) */}
          <div className="hidden md:flex w-80 bg-gray-900 border-l border-gray-800 flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">File Details</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <div className="aspect-square rounded-xl bg-gray-800 flex items-center justify-center mb-4 overflow-hidden">
                  {selectedFile.thumbnailUrl ? (
                    <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-full h-full object-cover" />
                  ) : (
                    getFileIcon(selectedFile.mimeType, "lg")
                  )}
                </div>
                <div className="text-center font-medium truncate">{selectedFile.name}</div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">Type</div>
                    <div className="text-sm truncate">{selectedFile.mimeType || "Unknown"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">Size</div>
                    <div className="text-sm">{formatBytes(Number(selectedFile.fileSize))}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">Created</div>
                    <div className="text-sm">{new Date(selectedFile.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-gray-400">Modified</div>
                    <div className="text-sm">{new Date(selectedFile.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                {selectedFile.url && (
                  <div className="flex items-start gap-3">
                    <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-400">URL</div>
                      <a href={selectedFile.url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 truncate block">
                        Open
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-800 space-y-2">
                <button
                  onClick={() => { setShowPreview(false); setShowShareModal(true); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                {selectedFile.url && (
                  <a
                    href={selectedFile.url}
                    download={selectedFile.name}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Details Panel - Fullscreen Bottom Sheet */}
      {showPreview && selectedFile && mobileDetailsOpen && (
        <div 
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.98)' }}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-lg">File Details</h3>
            <button onClick={() => setMobileDetailsOpen(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Preview */}
            <div className="mb-8">
              <div className="aspect-square rounded-2xl bg-gray-800 flex items-center justify-center mb-4 overflow-hidden">
                {selectedFile.thumbnailUrl ? (
                  <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-full h-full object-cover" />
                ) : (
                  getFileIcon(selectedFile.mimeType, "lg")
                )}
              </div>
              <div className="text-center font-semibold text-lg truncate">{selectedFile.name}</div>
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <FileText className="w-6 h-6 text-gray-400 shrink-0" />
                <div>
                  <div className="text-sm text-gray-400">Type</div>
                  <div className="text-base">{selectedFile.mimeType || "Unknown"}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Download className="w-6 h-6 text-gray-400 shrink-0" />
                <div>
                  <div className="text-sm text-gray-400">Size</div>
                  <div className="text-base">{formatBytes(Number(selectedFile.fileSize))}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-gray-400 shrink-0" />
                <div>
                  <div className="text-sm text-gray-400">Created</div>
                  <div className="text-base">{new Date(selectedFile.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <RefreshCw className="w-6 h-6 text-gray-400 shrink-0" />
                <div>
                  <div className="text-sm text-gray-400">Modified</div>
                  <div className="text-base">{new Date(selectedFile.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedFile.url && (
                <div className="flex items-center gap-4">
                  <ExternalLink className="w-6 h-6 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-400">URL</div>
                    <a href={selectedFile.url} target="_blank" rel="noopener noreferrer" className="text-base text-violet-400 hover:text-violet-300">
                      Open in browser
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-800 space-y-3">
              <button
                onClick={() => { setMobileDetailsOpen(false); setShowShareModal(true); }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-violet-600 hover:bg-violet-500 rounded-2xl text-base font-medium transition-colors"
              >
                <Share2 className="w-6 h-6" /> Share
              </button>
              {selectedFile.url && (
                <a
                  href={selectedFile.url}
                  download={selectedFile.name}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl text-base font-medium transition-colors"
                >
                  <Download className="w-6 h-6" /> Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Details Panel */}
      {showDetails && selectedFile && (
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold">File Details</h3>
            <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-gray-800 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Preview */}
            <div className="mb-6">
              <div className="aspect-square rounded-xl bg-gray-800 flex items-center justify-center mb-4 overflow-hidden">
                {selectedFile.thumbnailUrl ? (
                  <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-full h-full object-cover" />
                ) : (
                  getFileIcon(selectedFile.mimeType, "lg")
                )}
              </div>
              <div className="text-center font-medium truncate">{selectedFile.name}</div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">Type</div>
                  <div className="text-sm truncate">{selectedFile.mimeType || "Unknown"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Download className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Size</div>
                  <div className="text-sm">{formatBytes(Number(selectedFile.fileSize))}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Created</div>
                  <div className="text-sm">{new Date(selectedFile.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Modified</div>
                  <div className="text-sm">{new Date(selectedFile.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedFile.url && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-400">URL</div>
                    <a href={selectedFile.url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 truncate block">
                      Open
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-gray-800 space-y-2">
              <button
                onClick={() => { setShowDetails(false); setShowShareModal(true); }}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              {selectedFile.url && (
                <a
                  href={selectedFile.url}
                  download={selectedFile.name}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
              <button
                onClick={() => { setShowDetails(false); setSelectedFile(selectedFile); setShowPreview(true); }}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedFile && (
        <ShareModal />
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowNewFolderModal(false); setNewFolderParentId(null); }}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create New Folder</h2>
            
            {/* Folder name input */}
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl mb-4 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            
            {/* Parent folder selector */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Create in</label>
              <select
                value={newFolderParentId ?? (currentFolderId || "")}
                onChange={(e) => setNewFolderParentId(e.target.value || null)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">Root (My Files)</option>
                {allFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewFolderModal(false); setNewFolderParentId(null); }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors"
              >
                {creatingFolder ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move File Modal */}
      {showMoveModal && movingFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowMoveModal(false); setMovingFile(null); }}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Move File</h2>
            <p className="text-sm text-gray-400 mb-4">Moving: <span className="text-white">{movingFile.name}</span></p>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Destination folder</label>
              <select
                id="move-folder-select"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">Root (My Files)</option>
                {allFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowMoveModal(false); setMovingFile(null); }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const select = document.getElementById("move-folder-select") as HTMLSelectElement;
                  handleMoveFile(select.value || null);
                }}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Rename Modal */}
      {showRenameModal && renamingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowRenameModal(false); setRenamingItem(null); setNewName(""); }}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Rename {renamingItem?.type === "file" ? "File" : "Folder"}</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl mb-4 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRenameModal(false); setRenamingItem(null); setNewName(""); }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!newName.trim() || newName === renamingItem?.item?.name}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );


  // Share Modal Component
  function ShareModal() {
    const [shareToken, setShareTokenLocal] = useState<string | null>(null);
    const [sharePassword, setSharePasswordLocal] = useState("");
    const [shareExpireHours, setShareExpireHoursLocal] = useState<number>(0);
    const [shareAllowDownload, setShareAllowDownloadLocal] = useState(true);

    const handleShare = async () => {
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: selectedFile?.id,
            password: sharePassword || undefined,
            expiresIn: shareExpireHours > 0 ? shareExpireHours : undefined,
            allowDownload: shareAllowDownload
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setShareTokenLocal(data.share?.url);
        }
      } catch (error) {
        console.error("Share error:", error);
      }
    };

    const shareUrl = shareToken ? `${window.location.origin}${shareToken}` : "";

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
        <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Share File</h2>
            <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>

          {!shareToken ? (
            <>
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Password (optional)</label>
                <input
                  type="password"
                  placeholder="Leave empty for no password"
                  value={sharePassword}
                  onChange={(e) => setSharePasswordLocal(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Expires in</label>
                <select
                  value={shareExpireHours}
                  onChange={(e) => setShareExpireHoursLocal(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-violet-500"
                >
                  <option value={0}>Never</option>
                  <option value={24}>24 hours</option>
                  <option value={168}>7 days</option>
                  <option value={720}>30 days</option>
                </select>
              </div>
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareAllowDownload}
                  onChange={(e) => setShareAllowDownloadLocal(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm">Allow downloads</span>
              </label>
              <button
                onClick={handleShare}
                className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors"
              >
                Create Share Link
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Share URL</label>
                <div className="flex gap-2">
                  <input type="text" value={shareUrl} readOnly className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm" />
                  <button
                    onClick={() => { navigator.clipboard.writeText(shareUrl); showToastMessage("Copied!"); }}
                    className="px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setShowShareModal(false); setSelectedFile(null); }}
                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
}

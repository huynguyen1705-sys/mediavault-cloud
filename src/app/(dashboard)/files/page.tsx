"use client";

import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  SlidersHorizontal,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

interface FileMetadata {
  hash?: string;
  md5?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  dpi?: number;
  bitDepth?: number;
  colorSpace?: string;
  colorProfile?: string;
  compression?: string;
  orientation?: string;
  hdr?: boolean;
  camera?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  focalLength35mm?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  exposureMode?: string;
  meteringMode?: string;
  whiteBalance?: string;
  flash?: string;
  focusMode?: string;
  dateTaken?: string;
  software?: string;
  artist?: string;
  copyright?: string;
  gps?: { lat: number; lng: number; altitude?: number };
  duration?: number;
  fps?: number;
  videoBitrate?: number;
  videoCodec?: string;
  videoProfile?: string;
  audioCodec?: string;
  audioBitrate?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  audioLanguage?: string;
  containerFormat?: string;
  rotation?: number;
  hdrFormat?: string;
  subtitleTracks?: number;
  chapterCount?: number;
  creationTool?: string;
  title?: string;
  albumArtist?: string;
  album?: string;
  year?: number;
  genre?: string;
  trackNumber?: string;
  discNumber?: string;
  composer?: string;
  bpm?: number;
  encoder?: string;
  hasAlbumArt?: boolean;
  pageCount?: number;
  author?: string;
  documentTitle?: string;
  subject?: string;
  keywords?: string[];
  creatorApp?: string;
  pdfVersion?: string;
  encrypted?: boolean;
}

interface FileItem {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  url: string | null;
  thumbnailUrl: string | null;
  metadata: FileMetadata | null;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  isPublic: boolean;
  downloadEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  shareUrl?: string | null;
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

// ============================================================
// METADATA DISPLAY HELPERS
// ============================================================

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBitrate(bps: number): string {
  if (bps >= 1000000) return `${(bps / 1000000).toFixed(1)} Mbps`;
  if (bps >= 1000) return `${Math.round(bps / 1000)} kbps`;
  return `${bps} bps`;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  );
}

function MetadataSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-800 pt-3">
      <div className="text-xs font-medium text-gray-300 mb-2">{title}</div>
      <div className="space-y-1.5 pl-1">{children}</div>
    </div>
  );
}

function MetaItem({ label, value, copyValue, onCopy }: { label: string; value: string; copyValue?: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 text-right max-w-[60%] truncate flex items-center gap-1">
        {value}
        {copyValue && (
          <button onClick={() => { navigator.clipboard.writeText(copyValue); onCopy?.(); }} className="text-gray-500 hover:text-white p-0.5">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </span>
    </div>
  );
}

// ============================================================
// GRID FILE CARD - Fully memoized, manages its own dropdown menu
// ============================================================
const GridFileCard = memo(function GridFileCard({
  file, isSelected, isHighlighted, selectMode, isDragging,
  onSelect, onClick, onDragStart, onDragEnd, onMobileSheet,
  onShare, onView, onDetails, onMove, onRename, onCopyLink, onDelete,
  trashMode, onRestore, onPermanentDelete
}: {
  file: FileItem;
  isSelected: boolean;
  isHighlighted: boolean;
  selectMode: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onMobileSheet: () => void;
  onShare: () => void;
  onView: () => void;
  onDetails: () => void;
  onMove: () => void;
  onRename: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
  trashMode: boolean;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchHandledRef = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [menuOpen]);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = file.mimeType?.startsWith('image/');
  const isVideo = file.mimeType?.startsWith('video/');
  const isAudio = file.mimeType?.startsWith('audio/');

  // Thumbnail / icon
  const renderPreview = () => {
    if (file.thumbnailUrl) {
      return (
        <div className="aspect-square rounded-lg bg-gray-800 overflow-hidden relative">
          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = `/api/files/${file.id}/proxy?download=1`; a.download = file.name || 'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }} className="p-1.5 bg-white/90 hover:bg-white rounded-md text-gray-700 shadow-sm" title="Download"><Download className="w-3.5 h-3.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); onCopyLink(); }} className="p-1.5 bg-white/90 hover:bg-white rounded-md text-gray-700 shadow-sm" title="Copy Link"><Copy className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      );
    }
    if (isVideo) return (
      <div className="aspect-square rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 flex flex-col items-center justify-center relative">
        <Film className="w-10 h-10 text-white/90 mb-2" />
        <Play className="w-6 h-6 text-white/70" />
        {/* Thumbnail generating indicator */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/60 backdrop-blur-sm rounded-b-lg flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-violet-300 animate-spin" />
          <span className="text-[10px] text-white/80">Creating thumbnail...</span>
        </div>
      </div>
    );
    if (isAudio) return <div className="aspect-square rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 flex flex-col items-center justify-center"><Headphones className="w-10 h-10 text-white/90" /></div>;
    if (file.mimeType?.includes('pdf')) return <div className="aspect-square rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex flex-col items-center justify-center"><FileText className="w-10 h-10 text-white/90" /><span className="text-[10px] text-white/70 mt-1">PDF</span></div>;
    return <div className="aspect-square rounded-lg bg-gray-800 flex items-center justify-center"><File className="w-10 h-10 text-gray-500" /></div>;
  };

  const [isLight, setIsLight] = useState(false);

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      setIsLight(document.documentElement.classList.contains('light'));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const itemCls = isLight
    ? "w-full px-3 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-200 hover:text-gray-900 flex items-center gap-2.5 transition-colors duration-100"
    : "w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2.5 transition-colors duration-100";

  return (
    <div
      className={`group bg-[#111111] border rounded-xl p-4 hover:border-gray-700 transition-all cursor-pointer relative ${
        menuOpen ? "z-50" : "z-0"
      } ${
        isDragging ? "opacity-50" : ""
      } ${
        isSelected ? "border-violet-500 bg-violet-500/10" :
        isHighlighted ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/30 animate-pulse" :
        "border-gray-800"
      }`}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // Skip if touch already handled (mobile)
        if (touchHandledRef.current) {
          touchHandledRef.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick();
      }}
      onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}
      onTouchStart={(e) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchHandledRef.current = false;
      }}
      onTouchEnd={(e) => {
        if (touchStartRef.current) {
          const diffX = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);
          const diffY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
          // Only open mobile sheet if it's a tap (minimal movement)
          if (diffX < 10 && diffY < 10) {
            e.preventDefault();
            touchHandledRef.current = true;
            onMobileSheet();
          }
          touchStartRef.current = null;
        }
      }}
    >
      {selectMode && (
        <div className="flex items-center gap-2 mb-3">
          <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
              isSelected ? "bg-violet-500 border-violet-500" : "border-gray-600 hover:border-violet-400"
            }`}
          >
            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1" />
        </div>
      )}

      {renderPreview()}

      <div className="flex items-start gap-2 mt-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{formatBytes(Number(file.fileSize))}</p>
        </div>
        <div className="relative">
          <button
            ref={btnRef}
            className="p-1 hover:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Inline dropdown menu - local state only */}
          {menuOpen && (
            <div
              ref={menuRef}
              className={`absolute right-0 top-8 z-50 min-w-[180px] rounded-xl py-1 shadow-xl ${
                isLight
                  ? 'bg-white border border-gray-300'
                  : 'bg-[#0f1623] border border-white/10'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={itemCls} onClick={() => { setMenuOpen(false); onView(); }}><Eye className="w-3.5 h-3.5 text-gray-500" /> View</button>
              <button className={itemCls} onClick={() => { setMenuOpen(false); onDetails(); }}><Info className="w-3.5 h-3.5 text-gray-500" /> Details</button>
              <hr className="my-1 border-t border-white/5" />
              <button className={itemCls} onClick={() => { setMenuOpen(false); onShare(); }}><Share2 className="w-3.5 h-3.5 text-violet-400" /> Share</button>
              <button className={itemCls} onClick={() => { setMenuOpen(false); onMove(); }}><FolderInput className="w-3.5 h-3.5 text-gray-500" /> Move to...</button>
              <button className={itemCls} onClick={() => { setMenuOpen(false); onRename(); }}><Edit className="w-3.5 h-3.5 text-gray-500" /> Rename</button>
              <button className={itemCls} onClick={() => { setMenuOpen(false); onCopyLink(); }}><Copy className="w-3.5 h-3.5 text-gray-500" /> Copy Link</button>
              {file.url && (
                <a href={`/api/files/${file.id}/proxy?download=1`} download={file.name} className={itemCls} onClick={() => setMenuOpen(false)}><Download className="w-3.5 h-3.5 text-blue-400" /> Download</a>
              )}
              <hr className="my-1 border-t border-white/5" />
              {trashMode ? (
                <>
                  <button className={`${itemCls} text-emerald-400`} onClick={() => { setMenuOpen(false); onRestore(); }}><RotateCcw className="w-3.5 h-3.5" /> Restore</button>
                  <button className={`${itemCls} text-red-400`} onClick={() => { setMenuOpen(false); onPermanentDelete(); }}><XCircle className="w-3.5 h-3.5" /> Delete Forever</button>
                </>
              ) : (
                <button className={`${itemCls} text-red-400`} onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 className="w-3.5 h-3.5" /> Move to Trash</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparator - only re-render when these change
  return prev.file.id === next.file.id &&
    prev.file.thumbnailUrl === next.file.thumbnailUrl &&
    prev.file.url === next.file.url &&
    prev.file.name === next.file.name &&
    prev.isSelected === next.isSelected &&
    prev.isHighlighted === next.isHighlighted &&
    prev.selectMode === next.selectMode &&
    prev.isDragging === next.isDragging &&
    prev.trashMode === next.trashMode;
});

// ============================================================
// CONTEXT MENU - Separate component to prevent parent re-render
// ============================================================
const ContextMenuPortal = memo(function ContextMenuPortal({
  x, y, file, trashMode,
  onClose, onView, onDetails, onShare, onMove, onRename, onCopyLink,
  onDelete, onRestore, onPermanentDelete, getMenuPosition
}: {
  x: number; y: number; file: FileItem; trashMode: boolean;
  onClose: () => void;
  onView: () => void; onDetails: () => void; onShare: () => void;
  onMove: () => void; onRename: () => void; onCopyLink: () => void;
  onDelete: () => void; onRestore: () => void; onPermanentDelete: () => void;
  getMenuPosition: (x: number, y: number) => React.CSSProperties;
}) {
  const [isLight, setIsLight] = useState(false);

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      setIsLight(document.documentElement.classList.contains('light'));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Close on outside click without blocking the page
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const menu = document.getElementById('ctx-menu-portal');
      if (menu && !menu.contains(e.target as Node)) onClose();
    };
    // Small delay so the triggering click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  const menuStyle: React.CSSProperties = {
    ...getMenuPosition(x, y),
    position: 'fixed',
    zIndex: 9999,
    minWidth: '180px',
    backgroundColor: isLight ? '#ffffff' : '#0f1623',
    border: isLight ? '1px solid #d1d5db' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '4px 0',
    boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.15)' : '0 8px 24px rgba(0,0,0,0.5)',
  };

  const itemCls = isLight
    ? "w-full px-3 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-200 hover:text-gray-900 flex items-center gap-2.5 transition-colors duration-100"
    : "w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2.5 transition-colors duration-100";
  const dividerCls = isLight ? "my-1 border-t border-gray-200" : "my-1 border-t border-white/5";

  return (
    <div id="ctx-menu-portal" style={menuStyle}>
      <button className={itemCls} onClick={onView}><Eye className="w-3.5 h-3.5 text-gray-500" /> View</button>
      <button className={itemCls} onClick={onDetails}><Info className="w-3.5 h-3.5 text-gray-500" /> Details</button>
      <hr className={dividerCls} />
      <button className={itemCls} onClick={onShare}><Share2 className="w-3.5 h-3.5 text-violet-400" /> Share</button>
      <button className={itemCls} onClick={onMove}><FolderInput className="w-3.5 h-3.5 text-gray-500" /> Move to...</button>
      <button className={itemCls} onClick={onRename}><Edit className="w-3.5 h-3.5 text-gray-500" /> Rename</button>
      <button className={itemCls} onClick={onCopyLink}><Copy className="w-3.5 h-3.5 text-gray-500" /> Copy Link</button>
      {file.url && (
        <a
          href={file.url}
          download={file.name}
          className={itemCls}
          onClick={onClose}
        >
          <Download className="w-3.5 h-3.5 text-blue-400" /> Download
        </a>
      )}
      <hr className={dividerCls} />
      {trashMode ? (
        <>
          <button className={`${itemCls} text-emerald-400 hover:text-emerald-300`} onClick={onRestore}><RotateCcw className="w-3.5 h-3.5" /> Restore</button>
          <button className={`${itemCls} text-red-400 hover:text-red-300`} onClick={onPermanentDelete}><XCircle className="w-3.5 h-3.5" /> Delete Forever</button>
        </>
      ) : (
        <button className={`${itemCls} text-red-400 hover:text-red-300`} onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /> Move to Trash</button>
      )}
    </div>
  );
});

export default function FilesPage() {
  const { user, isLoaded } = useUser();
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mv-view-mode') as 'grid' | 'list') || 'grid';
    }
    return 'grid';
  });

  // Save view mode to localStorage
  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('mv-view-mode', mode);
  };
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all"); // all, today, week, month
  const [filterSize, setFilterSize] = useState<string>("all"); // all, small, medium, large
  const [showFilters, setShowFilters] = useState(false); // Toggle filters on mobile
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  // Cache presigned URLs to avoid image reload on re-fetch
  const urlCacheRef = useRef<Record<string, { url: string | null; thumbnailUrl: string | null; cachedAt: number }>>({}); 
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
  const [closingModal, setClosingModal] = useState<string | null>(null); // track which modal is animating out
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
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpireHours, setShareExpireHours] = useState<number>(0);
  const [shareAllowDownload, setShareAllowDownload] = useState(true);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const [recentActions, setRecentActions] = useState<{ action: string; fileId: string; fileName: string; timestamp: number }[]>([]);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const listTouchHandledRef = useRef(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [trashMode, setTrashMode] = useState(false);
  const [trashFiles, setTrashFiles] = useState<any[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: FolderTreeNode } | null>(null);
  // Refs for keyboard handler - avoids re-creating listener on every state change
  const contextMenuRef = useRef<{ x: number; y: number; file: FileItem } | null>(null);
  const folderContextMenuRef = useRef<{ x: number; y: number; folder: FolderTreeNode } | null>(null);
  useEffect(() => { contextMenuRef.current = contextMenu; }, [contextMenu]);
  useEffect(() => { folderContextMenuRef.current = folderContextMenu; }, [folderContextMenu]);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const update = () => setIsLight(document.documentElement.classList.contains('light'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  // Build tree from flat list

  // Sort files
  // Track URL fetch version to trigger single re-render after all batches complete
  const [urlVersion, setUrlVersion] = useState(0);
  const urlFetchInProgress = useRef(false);

  // Highlighted files (recently uploaded) - reads from sessionStorage, auto-clears
  const [highlightedFiles, setHighlightedFiles] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('mv-highlight-files');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setHighlightedFiles(new Set(ids));
        sessionStorage.removeItem('mv-highlight-files');
        const t = setTimeout(() => setHighlightedFiles(new Set()), 5000);
        return () => clearTimeout(t);
      }
    } catch { /* Safari Private mode blocks sessionStorage */ }
  }, []);

  // Resolve URLs from cache into files (only recomputes when urlVersion or files change)
  const filesWithUrls = useMemo(() => {
    return files.map(f => {
      const cached = urlCacheRef.current[f.id];
      if (cached) {
        return { ...f, url: cached.url || f.url, thumbnailUrl: cached.thumbnailUrl || f.thumbnailUrl };
      }
      return f;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, urlVersion]);

  const sortedFiles = useMemo(() => {
    return [...filesWithUrls].sort((a, b) => {
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
  }, [filesWithUrls, sortBy, sortOrder]);

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

  // Animated close helper — sets closingModal, waits for animation, then actually hides
  const animatedClose = useCallback((modalName: string, closeFn: () => void, duration = 250) => {
    setClosingModal(modalName);
    setTimeout(() => {
      closeFn();
      setClosingModal(null);
    }, duration);
  }, []);

  // Fetch files
  // Batch fetch presigned URLs for visible files (updates cache only, single re-render at end)
  const fetchUrlsForFiles = useCallback(async (fileList: FileItem[]) => {
    if (urlFetchInProgress.current) return; // Prevent duplicate fetches
    
    const now = Date.now();
    const cacheMaxAge = 50 * 60 * 1000; // 50 minutes

    // Filter files that need URL generation
    const needUrls = fileList.filter(f => {
      const cached = urlCacheRef.current[f.id];
      return !cached || (now - cached.cachedAt) > cacheMaxAge;
    });

    if (needUrls.length === 0) return;

    urlFetchInProgress.current = true;

    try {
      // Batch in groups of 30
      for (let i = 0; i < needUrls.length; i += 30) {
        const batch = needUrls.slice(i, i + 30);
        try {
          const res = await fetch("/api/files/urls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileIds: batch.map(f => f.id) }),
          });
          if (res.ok) {
            const { urls } = await res.json();
            const updateNow = Date.now();
            // Update cache ONLY (no state update per batch)
            for (const [id, data] of Object.entries(urls)) {
              urlCacheRef.current[id] = { ...(data as any), cachedAt: updateNow };
            }
          }
        } catch (e) {
          console.error("Batch URL fetch error:", e);
        }
      }

      // Single re-render after ALL batches complete
      setUrlVersion(v => v + 1);
    } finally {
      urlFetchInProgress.current = false;
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("folderId", currentFolderId || "root");
      if (searchQuery) params.set("search", searchQuery);
      if (filterType !== "all") params.set("type", filterType);
      if (filterDate !== "all") params.set("date", filterDate);
      if (filterSize !== "all") params.set("size", filterSize);

      const res = await fetch(`/api/files?${params}`);
      if (res.ok) {
        const data = await res.json();
        const now = Date.now();
        const cacheMaxAge = 50 * 60 * 1000;

        // Apply cached URLs where available
        const filesWithCache = (data.files || []).map((file: FileItem) => {
          const cached = urlCacheRef.current[file.id];
          if (cached && (now - cached.cachedAt) < cacheMaxAge) {
            return { ...file, url: cached.url, thumbnailUrl: cached.thumbnailUrl };
          }
          return file;
        });

        setFiles(filesWithCache);
        setFolders(data.folders || []);

        // Lazy-load presigned URLs for visible files (non-blocking)
        fetchUrlsForFiles(filesWithCache);
      }
    } catch (error) {
      console.error("Fetch files error:", error);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, currentFolderId, searchQuery, filterType, fetchUrlsForFiles]);

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
        if (showPreview) animatedClose('preview', () => setShowPreview(false));
        if (showDetails) setShowDetails(false);
        if (contextMenuRef.current) setContextMenu(null);
        if (folderContextMenuRef.current) setFolderContextMenu(null);
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

      // Keyboard shortcuts for file actions (when a file is selected)
      if (selectedFile && !showPreview) {
        if (key === "d") {
          e.preventDefault();
          // Download
          if (selectedFile) {
            const a = document.createElement('a'); a.href = `/api/files/${selectedFile.id}/proxy?download=1`; a.download = selectedFile.name || 'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showToastMessage('Downloading...');
          }
        }
        if (key === "s") {
          e.preventDefault();
          setShowShareModal(true);
        }
        if (key === "delete" || key === "backspace") {
          e.preventDefault();
          handleDelete(selectedFile.id);
        }
        if (key === "enter") {
          e.preventDefault();
          setShowPreview(true);
        }
        if (key === "i") {
          e.preventDefault();
          setShowDetails(true);
        }
      }

      // Ctrl+A - Select all
      if (key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectMode(true);
        setSelectedFiles(new Set(files.map(f => f.id)));
      }

      // Escape - Exit select mode
      if (key === "escape" && selectMode) {
        setSelectMode(false);
        setSelectedFiles(new Set());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, showPreview, showDetails, selectMode, files]); // removed contextMenu/folderContextMenu to prevent image reload

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

    // Store File objects immediately (before FileList gets invalidated)
    const files = Array.from(fileList);

    const newFiles: UploadFile[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      status: "pending" as const,
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newFiles]);

    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 200));

    const MULTIPART_THRESHOLD = 200 * 1024 * 1024; // 200MB - single PUT for most files
    const PART_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const CONCURRENT_PARTS = 4;
    const CONCURRENT_FILES = 10;

    const uploadOne = async (uploadFile: UploadFile & { _file: File }) => {
      const actualFile = uploadFile._file;
      if (!actualFile) return;

      setUploadQueue((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading" } : f)));
      const updateProgress = (p: number) => setUploadQueue((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: p } : f)));

      try {
        let fileKey: string;

        if (actualFile.size >= MULTIPART_THRESHOLD) {
          // Multipart upload with XHR progress
          const totalParts = Math.ceil(actualFile.size / PART_SIZE);
          const initRes = await fetch("/api/upload/multipart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "init", fileName: actualFile.name, contentType: actualFile.type || "application/octet-stream", fileSize: actualFile.size }) });
          if (!initRes.ok) throw new Error("Failed to init multipart");
          const { uploadId, fileKey: fk } = await initRes.json();
          fileKey = fk;

          // Get all part URLs upfront
          const allPartUrls: Record<number, string> = {};
          for (let i = 0; i < totalParts; i += 10) {
            const nums = Array.from({ length: Math.min(10, totalParts - i) }, (_, j) => i + j + 1);
            const urlRes = await fetch("/api/upload/multipart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-part-urls", fileKey, uploadId, partNumbers: nums }) });
            if (!urlRes.ok) throw new Error("Part URLs failed");
            Object.assign(allPartUrls, (await urlRes.json()).urls);
          }

          const completedParts: { PartNumber: number; ETag: string }[] = [];
          let uploadedBytes = 0;

          const uploadPart = (partNum: number) => new Promise<void>((resolve, reject) => {
            const start = (partNum - 1) * PART_SIZE;
            const end = Math.min(start + PART_SIZE, actualFile.size);
            const chunk = actualFile.slice(start, end);
            const partSize = end - start;
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const totalProgress = (uploadedBytes + partSize * (e.loaded / e.total)) / actualFile.size;
                updateProgress(Math.round(totalProgress * 90));
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                uploadedBytes += partSize;
                completedParts.push({ PartNumber: partNum, ETag: xhr.getResponseHeader("etag") || `"${partNum}"` });
                updateProgress(Math.round((uploadedBytes / actualFile.size) * 90));
                resolve();
              } else reject(new Error(`Part ${partNum} failed`));
            };
            xhr.onerror = () => reject(new Error(`Part ${partNum} error`));
            xhr.open("PUT", allPartUrls[partNum]);
            xhr.send(chunk);
          });

          for (let i = 0; i < totalParts; i += CONCURRENT_PARTS) {
            const batch = Array.from({ length: Math.min(CONCURRENT_PARTS, totalParts - i) }, (_, j) => i + j + 1);
            await Promise.all(batch.map(uploadPart));
          }

          completedParts.sort((a, b) => a.PartNumber - b.PartNumber);
          const compRes = await fetch("/api/upload/multipart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", fileKey, uploadId, parts: completedParts }) });
          if (!compRes.ok) throw new Error("Complete multipart failed");
        } else {
          // Single upload for small files
          const params = new URLSearchParams({ fileName: actualFile.name, contentType: actualFile.type || "application/octet-stream", fileSize: String(actualFile.size) });
          const urlRes = await fetch(`/api/upload-url?${params}`);
          if (!urlRes.ok) throw new Error("Failed to get upload URL");
          const { uploadUrl, fileKey: fk } = await urlRes.json();
          fileKey = fk;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => { if (e.lengthComputable) updateProgress(Math.round((e.loaded / e.total) * 90)); };
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", actualFile.type || "application/octet-stream");
            xhr.send(actualFile);
          });
        }

        updateProgress(95);
        const confirmRes = await fetch("/api/upload/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileKey, fileName: actualFile.name, mimeType: actualFile.type || "application/octet-stream", fileSize: actualFile.size, folderId: currentFolderId }) });
        if (!confirmRes.ok) throw new Error("Upload confirmation failed");

        updateProgress(100);
        setUploadQueue((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "completed", progress: 100 } : f)));
      } catch (error: any) {
        setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, status: "error", error: error.message } : f));
      }
    };

    // Sort: largest files first → start heavy uploads early
    const withFiles = newFiles.map((f, i) => ({ ...f, _file: files[i] }));
    const sorted = [...withFiles].sort((a, b) => b.size - a.size);

    // Upload 10 files concurrently
    for (let i = 0; i < sorted.length; i += CONCURRENT_FILES) {
      await Promise.all(sorted.slice(i, i + CONCURRENT_FILES).map(uploadOne));
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
    e.stopPropagation();

    // Get file IDs from drag data
    let fileIds: string[] = [];

    const fileIdsData = e.dataTransfer.getData("fileIds");
    if (fileIdsData) {
      fileIds = JSON.parse(fileIdsData);
    } else {
      const fileId = e.dataTransfer.getData("fileId");
      if (fileId) fileIds = [fileId];
    }

    // Fallback: if no fileIds from drag but selectMode is on, use selected files
    if (fileIds.length === 0 && selectMode && selectedFiles.size > 0) {
      fileIds = Array.from(selectedFiles);
    }

    if (fileIds.length === 0) {
      setDraggingFileId(null);
      setDropTargetFolderId(null);
      return;
    }

    try {
      let movedCount = 0;
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (file && file.folderId === targetFolderId) continue;

        const res = await fetch(`/api/files/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: targetFolderId }),
        });
        if (res.ok) movedCount++;
      }

      if (movedCount > 0) {
        showToastMessage(`${movedCount} file${movedCount > 1 ? 's' : ''} moved`);
        if (selectMode) clearSelection();
        fetchFiles();
        fetchAllFolders();
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
    const file = files.find(f => f.id === fileId);
    // Optimistic update - remove immediately from state, no reload
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setContextMenu(null);
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (res.ok) {
        showToastMessage("File moved to trash");
        if (file) {
          setRecentActions(prev => [{
            action: "Deleted",
            fileId: file.id,
            fileName: file.name,
            timestamp: Date.now()
          }, ...prev.slice(0, 2)]);
        }
        if (trashMode) fetchTrashFiles();
        // Update storage count silently
        fetchStorage();
      } else {
        // Rollback on failure
        if (file) setFiles(prev => [...prev, file]);
        showToastMessage("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      if (file) setFiles(prev => [...prev, file]);
    }
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

  // Smart menu position - prevents menu from going off-screen
  const getSmartMenuPosition = (x: number, y: number) => {
    const menuWidth = 200;
    const menuHeight = 400;
    const padding = 10;
    let left = x;
    let top = y;

    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Prefer left side - flip to left if too close to right edge
      if (x + menuWidth + padding > vw) {
        left = x - menuWidth - 10;
        // If still off screen, clamp to left
        if (left < padding) left = padding;
      }

      // For bottom edge - flip menu ABOVE the click point
      if (y + menuHeight + padding > vh) {
        top = y - menuHeight - 10;
        if (top < padding) top = padding;
      }

      // Ensure minimum positions
      left = Math.max(padding, left);
      top = Math.max(padding, top);
    }

    return { left, top };
  };

  const downloadFolderAsZip = async (folderId: string, folderName: string) => {
    showToastMessage(`Preparing ${folderName}.zip...`);
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });

      if (!res.ok) {
        const error = await res.json();
        showToastMessage(error.error || "Failed to download folder");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName.replace(/[^a-zA-Z0-9-_]/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToastMessage(`Downloaded ${folderName}.zip`);
    } catch (err) {
      showToastMessage("Failed to download folder");
    }
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
  // Memoized MiniPreview to prevent thumbnail reload on parent re-render
  const MiniPreview = memo(function MiniPreview({ file, onPreview }: { file: FileItem; onPreview: () => void }) {
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
          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          {/* No overlay - removed to avoid darkening in light mode */}
          {/* Quick actions on hover */}
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = `/api/files/${file.id}/proxy?download=1`; a.download = file.name || 'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (file.shareUrl) { navigator.clipboard.writeText(`${window.location.origin}${file.shareUrl}`); showToastMessage("Link copied!"); } }}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white"
              title="Copy Link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // Get file type badge info
    const getFileTypeBadge = () => {
      if (isPdf) return { text: "PDF", color: "bg-red-500" };
      if (isDocx) return { text: "DOCX", color: "bg-blue-500" };
      if (isXlsx) return { text: "XLSX", color: "bg-green-500" };
      if (isCode) return { text: ext.toUpperCase(), color: "bg-violet-500" };
      if (file.mimeType?.startsWith("video/")) return { text: "VIDEO", color: "bg-blue-600" };
      if (file.mimeType?.startsWith("audio/")) return { text: "AUDIO", color: "bg-pink-500" };
      if (isText) return { text: "TEXT", color: "bg-gray-500" };
      return null;
    };
    const badge = getFileTypeBadge();

    // PDF Mini Preview
    if (isPdf) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity relative" onClick={onPreview}>
          <FileText className="w-10 h-10 text-white/90 mb-2" />
          <span className="text-[10px] text-white/70 font-medium">PDF</span>
          <span className="absolute top-2 right-2 text-[8px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">{ext.toUpperCase()}</span>
        </div>
      );
    }

    // DOCX Mini Preview
    if (isDocx) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity relative" onClick={onPreview}>
          <FileText className="w-10 h-10 text-white/90 mb-2" />
          <span className="text-[10px] text-white/70 font-medium">DOCX</span>
          <span className="absolute top-2 right-2 text-[8px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">DOC</span>
        </div>
      );
    }

    // XLSX Mini Preview
    if (isXlsx) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity relative" onClick={onPreview}>
          <FileSpreadsheet className="w-10 h-10 text-white/90 mb-2" />
          <span className="text-[10px] text-white/70 font-medium">XLSX</span>
          <span className="absolute top-2 right-2 text-[8px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">{ext.toUpperCase()}</span>
        </div>
      );
    }

    // Code Mini Preview with syntax colors
    if (isCode) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-2 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden relative" onClick={onPreview}>
          <div className="grid grid-cols-3 gap-1 mb-1">
            <div className="w-3 h-3 rounded-sm bg-violet-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <div className="w-3 h-3 rounded-sm bg-pink-500" />
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <div className="w-3 h-3 rounded-sm bg-red-500" />
          </div>
          <span className="text-[9px] text-gray-400 font-mono">{ext.toUpperCase()}</span>
          <span className="absolute top-2 right-2 text-[8px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">CODE</span>
        </div>
      );
    }

    // Text Mini Preview
    if (isText) {
      return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden relative" onClick={onPreview}>
          <div className="space-y-1 mb-2">
            <div className="w-12 h-1.5 bg-gray-500 rounded" />
            <div className="w-10 h-1.5 bg-gray-600 rounded" />
            <div className="w-8 h-1.5 bg-gray-500 rounded" />
          </div>
          <span className="text-[9px] text-gray-400">TEXT</span>
          <span className="absolute top-2 right-2 text-[8px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">TXT</span>
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
        <div className="aspect-square rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 flex flex-col items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity relative" onClick={onPreview}>
          <Film className="w-10 h-10 text-white/90 mb-2" />
          <Play className="w-6 h-6 text-white/70" />
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/60 backdrop-blur-sm rounded-b-lg flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-violet-300 animate-spin" />
            <span className="text-[10px] text-white/80">Creating thumbnail...</span>
          </div>
        </div>
      );
    }

    // Default file icon
    return (
      <div className="aspect-square rounded-lg bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors" onClick={onPreview}>
        <File className="w-10 h-10 text-gray-500" />
      </div>
    );
  }, (prev, next) => prev.file.id === next.file.id && prev.file.thumbnailUrl === next.file.thumbnailUrl && prev.file.url === next.file.url);

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
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-20 left-1/2 z-50 px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 backdrop-blur-sm font-medium text-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR - Folder Tree */}
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-64 bg-[#0f0f0f] border-r border-gray-800 flex-col">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">Folders</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2">
          <div
            className={`flex items-center gap-2 px-3 py-3 rounded-lg cursor-pointer transition-all duration-150 ${
              currentFolderId === null ? "bg-violet-500/20 text-violet-400" : dropTargetFolderId === null
                ? "bg-violet-500/30 border-2 border-violet-500"
                : "text-gray-300 hover:bg-gray-800/50"
            }`}
            onClick={() => navigateToFolder(null, "My Files")}
            onDragOver={(e) => handleDragOver(e, null)}
            onDrop={(e) => handleDrop(e, null)}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium truncate">My Files</span>
          </div>
          {allFolders.map(folder => (
            <FolderTreeNode key={folder.id} folder={folder} level={0} />
          ))}
          {allFolders.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No folders yet</div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>Storage</span>
            <span>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${storageUsed / storageLimit > 0.9 ? "bg-red-500" : storageUsed / storageLimit > 0.7 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${Math.min((storageUsed / storageLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET */}
      <div className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${sidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setSidebarOpen(false)} />
        <div className={`absolute bottom-0 left-0 right-0 bg-[#0f0f0f] rounded-t-2xl border-t border-gray-700 transition-transform duration-300 ease-out max-h-[75vh] flex flex-col ${sidebarOpen ? "translate-y-0" : "translate-y-full"}`}>
          <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-gray-600 rounded-full" /></div>
          <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-800">
            <h3 className="text-base font-semibold text-white">Folders</h3>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-3 px-3">
            <div
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all ${currentFolderId === null ? "bg-violet-500/20 text-violet-400" : "text-gray-300 hover:bg-gray-800"}`}
              onClick={() => { navigateToFolder(null, "My Files"); setSidebarOpen(false); }}
            >
              <Home className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">My Files</span>
            </div>
            {allFolders.map(folder => (
              <FolderTreeNode key={folder.id} folder={folder} level={0} />
            ))}
            {allFolders.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">No folders yet</div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Storage</span>
              <span>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${storageUsed / storageLimit > 0.9 ? "bg-red-500" : "bg-violet-500"}`} style={{ width: `${Math.min((storageUsed / storageLimit) * 100, 100)}%` }} />
            </div>
            <button onClick={() => { setShowNewFolderModal(true); setSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm text-white font-medium transition-colors">
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* Mobile floating buttons */}
      {!sidebarOpen && (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-30 flex justify-between pointer-events-none">
          <button onClick={() => setSidebarOpen(true)} className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-full border border-gray-700 shadow-lg shadow-black/30">
            <Folder className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-gray-300 font-medium">Folders</span>
          </button>
          <button
            onClick={() => document.getElementById('file-input')?.click()}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-full shadow-lg shadow-violet-500/40 animate-glow-pulse"
          >
            <Upload className="w-4 h-4 text-white" />
            <span className="text-sm text-white font-medium">Upload</span>
          </button>
        </div>
      )}

      {/* RIGHT CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="p-4 border-b border-gray-800 bg-[#141414] sticky top-0 z-10">
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
                {/* Trash & Refresh - hidden on mobile */}
                <div className="hidden md:flex items-center gap-1">
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
              </div>
            )}

            {/* Bulk Action Bar - Sticky when files selected */}
            {selectedFiles.size > 0 && (
              <div className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-[#141414]/95 backdrop-blur px-4 py-3 border-b border-gray-800 shadow-lg">
                <div className="flex items-center gap-3">
                  <button onClick={clearSelection} className="p-1.5 hover:bg-gray-800 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-violet-300 font-medium">
                    {selectedFiles.size} file{selectedFiles.size > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Select all files in current view
                      sortedFiles.forEach(f => setSelectedFiles(prev => new Set([...prev, f.id])));
                    }}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Select All
                  </button>
                  {trashMode ? (
                    <>
                      <button
                        onClick={handleBulkRestore}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
                      </button>
                      <button
                        onClick={handleBulkDeletePermanent}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
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
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              multiple
              accept="*/*"
              className="absolute opacity-0 w-0 h-0"
              onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }}
            />
          </div>

          {/* Search & Filters - 1 row on all devices */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {/* Search Input with History */}
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Debounced search
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  searchDebounceRef.current = setTimeout(() => {
                    if (e.target.value.trim()) {
                      // Add to history (max 5 items)
                      setSearchHistory(prev => {
                        const filtered = prev.filter(h => h !== e.target.value.trim());
                        return [e.target.value.trim(), ...filtered].slice(0, 5);
                      });
                    }
                  }, 500);
                }}
                onFocus={() => setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setSearchHistory(prev => {
                      const filtered = prev.filter(h => h !== searchQuery.trim());
                      return [searchQuery.trim(), ...filtered].slice(0, 5);
                    });
                    fetchFiles();
                  }
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    fetchFiles();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              {/* Search History Dropdown */}
              {showSearchHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-800">Recent searches</div>
                  {searchHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onMouseDown={() => {
                        setSearchQuery(item);
                        setShowSearchHistory(false);
                        fetchFiles();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Clock className="w-3 h-3" />
                      {item}
                      <X className="w-3 h-3 ml-auto opacity-50" onClick={(e) => {
                        e.stopPropagation();
                        setSearchHistory(prev => prev.filter(h => h !== item));
                      }} />
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); fetchFiles(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter button - toggle on mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`md:hidden p-2 bg-[#111111] border border-gray-800 rounded-lg transition-colors ${
                showFilters || filterType !== "all" || filterDate !== "all" || filterSize !== "all"
                  ? "text-violet-400 border-violet-500/50"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Toggle filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Filters row - collapsible on mobile */}
            <div className={`flex flex-wrap md:flex-nowrap items-center gap-2 ${showFilters ? 'flex' : 'hidden md:flex'}`}>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); fetchFiles(); }}
                className="px-3 py-2 bg-[#111111] border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="all">All</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
              </select>
              {/* Date Filter */}
              <select
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); fetchFiles(); }}
                className="px-3 py-2 bg-[#111111] border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                title="Filter by date"
              >
                <option value="all">Any Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              {/* Size Filter */}
              <select
                value={filterSize}
                onChange={(e) => { setFilterSize(e.target.value); fetchFiles(); }}
                className="px-3 py-2 bg-[#111111] border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                title="Filter by size"
              >
                <option value="all">Any Size</option>
                <option value="small">&lt;1MB</option>
                <option value="medium">1-10MB</option>
                <option value="large">&gt;10MB</option>
              </select>
              <div className="flex items-center border border-gray-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleSetViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSetViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {/* Sort Controls */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-[#111111] border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-2 bg-[#111111] border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </button>
            </div>
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
          <div className="border-b border-gray-800 bg-[#111111]/80 backdrop-blur-sm">
            {/* Summary Header */}
            <div className="px-5 py-3 bg-[#1a1a1a]/80 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    {uploadQueue.filter(f => f.status === "uploading").length > 0
                      ? `Uploading ${uploadQueue.filter(f => f.status === "uploading").length} of ${uploadQueue.length}`
                      : uploadQueue.every(f => f.status === "completed")
                        ? "All uploads complete"
                        : `${uploadQueue.length} file${uploadQueue.length > 1 ? "s" : ""} queued`
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round(uploadQueue.reduce((sum, f) => sum + f.progress, 0) / uploadQueue.length)}% • {uploadQueue.filter(f => f.status === "completed").length}/{uploadQueue.length} done
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploadQueue.some(f => f.status === "error") && (
                  <span className="text-xs text-red-400 font-medium">
                    {uploadQueue.filter(f => f.status === "error").length} failed
                  </span>
                )}
                <button
                  onClick={() => setUploadQueue([])}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800"
                >
                  Clear
                </button>
              </div>
            </div>
            {/* Overall Progress Bar */}
            <div className="px-5 py-2 bg-[#111111]/50">
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-violet-500 to-violet-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(uploadQueue.reduce((sum, f) => sum + f.progress, 0) / uploadQueue.length)}%` }}
                />
              </div>
            </div>
            {/* File List */}
            <div className={`divide-y divide-gray-800/50 ${uploadQueue.length > 5 ? "max-h-48 overflow-y-auto" : ""}`}>
              {uploadQueue.map((file) => (
                <div key={file.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-800/30 transition-colors">
                  <div className="w-5 flex-shrink-0">
                    {file.status === "uploading" && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                    {file.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {file.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                    {file.status === "pending" && <div className="w-3 h-3 rounded-full bg-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{file.name}</p>
                    {file.status === "uploading" && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${file.progress}%` }} />
                        </div>
                      </div>
                    )}
                    {file.status === "error" && <p className="text-xs text-red-400 truncate">{file.error}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {file.status === "uploading" && (
                      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{file.progress}%</span>
                    )}
                    <span className="text-xs text-gray-500">{formatBytes(file.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div
          className={`flex-1 overflow-auto p-4 transition-colors relative ${
            isDragging
              ? "bg-violet-500/10 ring-2 ring-violet-500 ring-dashed rounded-2xl"
              : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isDragging) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            // Only set false if leaving the container
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={handleFileDrop}
        >
          {/* Drag & Drop Overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-white dark:bg-[#111111] rounded-2xl p-8 text-center border-2 border-dashed border-violet-500 dark:border-violet-500 shadow-xl">
                <CloudUpload className="w-16 h-16 text-violet-400 mx-auto mb-4 animate-bounce" />
                <p className="text-lg font-medium text-gray-900 dark:text-violet-300">Drop files to upload</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Files will be uploaded to current folder</p>
              </div>
            </div>
          )}
          {/* Empty State - Beautiful illustration */}
          {!trashMode && files.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center justify-center h-full"
            >
              {/* Cloud illustration */}
              <motion.div
                className="relative mb-6"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <Cloud className="w-24 h-24 text-gray-700" />
                <Upload className="w-10 h-10 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2 text-gray-200">Your files are empty</h3>
              <p className="text-gray-500 mb-6 text-center max-w-sm">
                Drag and drop files here or click the button below to upload your first files
              </p>
              <button
                onClick={() => document.getElementById("file-input")?.click()}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Files
              </button>
            </motion.div>
          )}

          {/* Loading Skeletons - Grid View */}
          {loading && viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-[#111111] border border-gray-800 rounded-xl p-4">
                  <div className="aspect-square bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg mb-3 animate-shimmer bg-[length:200%_100%]" />
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="h-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded w-3/4 mb-2 animate-shimmer bg-[length:200%_100%]" style={{ animationDelay: `${i * 50}ms` }} />
                      <div className="h-3 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded w-1/2 animate-shimmer bg-[length:200%_100%]" style={{ animationDelay: `${i * 50 + 25}ms` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading Skeletons - List View */}
          {loading && viewMode === "list" && (
            <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
                <div className="flex gap-4">
                  <div className="w-12" />
                  <div className="flex-1 h-4 bg-gray-700 rounded" />
                  <div className="w-32 h-4 bg-gray-700 rounded" />
                  <div className="w-40 h-4 bg-gray-700 rounded" />
                </div>
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-800 flex gap-4 items-center animate-pulse">
                  <div className="w-6 h-6 bg-gray-800 rounded" />
                  <div className="flex-1 flex gap-3 items-center">
                    <div className="w-10 h-10 bg-gray-800 rounded" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-800 rounded w-1/3 mb-1" />
                      <div className="h-3 bg-gray-800 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="w-32 h-3 bg-gray-800 rounded" />
                  <div className="w-40 h-3 bg-gray-800 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Trash Empty State - Beautiful illustration */}
          {trashMode && trashFiles.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative mb-6">
                <Trash2 className="w-20 h-20 text-gray-700" />
                <CheckCircle className="w-8 h-8 text-emerald-500 absolute bottom-0 right-0" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-200">Trash is clean</h3>
              <p className="text-gray-500 text-center max-w-sm">
                Deleted files will appear here. Nothing to clean up!
              </p>
            </div>
          )}

          {/* Files Grid - Each card manages its own menu (no shared state re-render) */}
          {!loading && files.length > 0 && viewMode === "grid" && (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }}
            >
              {sortedFiles.map((file) => (
                <motion.div key={file.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
                  <GridFileCard
                    file={file}
                    isSelected={selectedFiles.has(file.id)}
                    isHighlighted={highlightedFiles.has(file.id)}
                    selectMode={selectMode}
                    isDragging={draggingFileId === file.id}
                    onSelect={() => toggleFileSelection(file.id)}
                    onClick={() => { if (selectMode) { toggleFileSelection(file.id); } else { setSelectedFile(file); setShowPreview(true); } }}
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={handleDragEnd}
                    onMobileSheet={() => { setSelectedFile(file); setShowMobileSheet(true); }}
                    onShare={() => { setSelectedFile(file); setShowShareModal(true); }}
                    onView={() => { setSelectedFile(file); setShowPreview(true); }}
                    onDetails={() => { setSelectedFile(file); setShowDetails(true); }}
                    onMove={() => { setMovingFile(file); setShowMoveModal(true); }}
                    onRename={() => { setRenamingItem({ type: "file", item: file }); setNewName(file.name); setShowRenameModal(true); }}
                    onCopyLink={() => { navigator.clipboard.writeText(file.shareUrl ? `${window.location.origin}${file.shareUrl}` : `${window.location.origin}/api/files/${file.id}`); showToastMessage("Link copied!"); }}
                    onDelete={() => handleDelete(file.id)}
                    trashMode={trashMode}
                    onRestore={() => handleRestore(file.id)}
                    onPermanentDelete={() => handlePermanentDelete(file.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Files List - Professional Table Style */}
          {!loading && files.length > 0 && viewMode === "list" && (
            <div className="bg-[#111111]/50 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
              {/* Table Header */}
              <div className="grid grid-cols-[36px_1fr_60px_40px] md:grid-cols-[40px_1fr_80px_110px_130px_80px] gap-0 bg-[#1a1a1a] px-3 md:px-4 h-10 border-b border-gray-700/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {/* Checkbox/icon col */}
                <div className="flex items-center">
                  {selectMode ? (
                    <div
                      onClick={selectAllFiles}
                      className="w-4 h-4 rounded border border-gray-600 hover:border-violet-400 cursor-pointer flex items-center justify-center transition-colors"
                    />
                  ) : null}
                </div>
                {/* Name col */}
                <button
                  onClick={() => { if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("name"); setSortOrder("asc"); } }}
                  className="flex items-center gap-1 text-left hover:text-gray-200 transition-colors"
                >
                  Name
                  {sortBy === "name" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-violet-400" /> : <ArrowDown className="w-3 h-3 text-violet-400" />
                  ) : <ArrowUp className="w-3 h-3 opacity-20" />}
                </button>
                {/* Type col - hidden on mobile */}
                <div className="hidden md:flex items-center">Type</div>
                {/* Size col */}
                <button
                  onClick={() => { if (sortBy === "size") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("size"); setSortOrder("desc"); } }}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors text-[10px] md:text-xs"
                >
                  Size
                  {sortBy === "size" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-violet-400" /> : <ArrowDown className="w-3 h-3 text-violet-400" />
                  ) : <ArrowUp className="w-3 h-3 opacity-20" />}
                </button>
                {/* Modified col - hidden on mobile */}
                <button
                  onClick={() => { if (sortBy === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("date"); setSortOrder("desc"); } }}
                  className="hidden md:flex items-center gap-1.5 hover:text-gray-200 transition-colors"
                >
                  Modified
                  {sortBy === "date" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-violet-400" /> : <ArrowDown className="w-3 h-3 text-violet-400" />
                  ) : <ArrowUp className="w-3 h-3 opacity-20" />}
                </button>
                {/* Actions col */}
                <div className="flex items-center justify-end">  </div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-800/40">
                {sortedFiles.map((file) => {
                  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
                  const getTypeInfo = () => {
                    const mt = file.mimeType || '';
                    if (mt.startsWith('image/')) return { label: fileExt.toUpperCase() || 'IMG', color: 'text-emerald-400 bg-emerald-400/10' };
                    if (mt.startsWith('video/')) return { label: fileExt.toUpperCase() || 'VID', color: 'text-blue-400 bg-blue-400/10' };
                    if (mt.startsWith('audio/')) return { label: fileExt.toUpperCase() || 'AUD', color: 'text-pink-400 bg-pink-400/10' };
                    if (mt.includes('pdf')) return { label: 'PDF', color: 'text-red-400 bg-red-400/10' };
                    if (mt.includes('zip') || mt.includes('archive') || mt.includes('compressed')) return { label: 'ZIP', color: 'text-amber-400 bg-amber-400/10' };
                    if (mt.includes('spreadsheet') || mt.includes('excel') || mt.includes('csv')) return { label: fileExt.toUpperCase() || 'XLS', color: 'text-green-400 bg-green-400/10' };
                    if (mt.includes('presentation') || mt.includes('powerpoint')) return { label: 'PPT', color: 'text-orange-400 bg-orange-400/10' };
                    if (mt.includes('word') || mt.includes('document')) return { label: 'DOC', color: 'text-blue-300 bg-blue-300/10' };
                    if (['js','ts','jsx','tsx','py','java','go','rs','php','html','css','json','sh','md'].includes(fileExt)) return { label: fileExt.toUpperCase(), color: 'text-violet-400 bg-violet-400/10' };
                    return { label: fileExt.toUpperCase() || 'FILE', color: 'text-gray-400 bg-gray-700/50' };
                  };
                  const typeInfo = getTypeInfo();

                  return (
                  <div
                    key={file.id}
                    className={`grid grid-cols-[36px_1fr_60px_40px] md:grid-cols-[40px_1fr_80px_110px_130px_80px] gap-0 px-3 md:px-4 h-14 cursor-pointer group transition-all duration-150 ${
                      selectedFiles.has(file.id)
                        ? "bg-violet-500/10 border-l-2 border-l-violet-500"
                        : "hover:bg-gray-800/50 border-l-2 border-l-transparent"
                    } ${
                      draggingFileId === file.id ? "opacity-50" : ""
                    }`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (listTouchHandledRef.current) {
                        listTouchHandledRef.current = false;
                        return;
                      }
                      if (selectMode) {
                        toggleFileSelection(file.id);
                      } else {
                        setSelectedFile(file);
                        setShowPreview(true);
                      }
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
                    onTouchStart={(e) => {
                      setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                      listTouchHandledRef.current = false;
                    }}
                    onTouchEnd={(e) => {
                      if (touchStartPos) {
                        const diffX = Math.abs(e.changedTouches[0].clientX - touchStartPos.x);
                        const diffY = Math.abs(e.changedTouches[0].clientY - touchStartPos.y);
                        if (diffX < 10 && diffY < 10) {
                          e.preventDefault();
                          listTouchHandledRef.current = true;
                          setSelectedFile(file);
                          setShowMobileSheet(true);
                        }
                        setTouchStartPos(null);
                      }
                    }}
                  >
                    {/* Checkbox column */}
                    <div className="flex items-center">
                      {selectMode ? (
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.id); }}
                          className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all duration-150 ${
                            selectedFiles.has(file.id)
                              ? "bg-violet-500 border-violet-500"
                              : "border-gray-600 hover:border-violet-400"
                          }`}
                        >
                          {selectedFiles.has(file.id) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-gray-800/60">
                          {file.thumbnailUrl ? (
                            <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              {getFileIcon(file.mimeType, "sm")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* File name column */}
                    <div className="flex items-center gap-3 min-w-0 pr-3 pl-2">
                      {selectMode && (
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-gray-800/60">
                          {file.thumbnailUrl ? (
                            <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              {getFileIcon(file.mimeType, "sm")}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-100 truncate group-hover:text-violet-300 transition-colors leading-tight">{file.name}</p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          <span className="md:hidden">{formatDate(file.updatedAt || file.createdAt)}</span>
                          <span className="hidden md:inline">
                            {file.mimeType?.split('/')[0] === 'image' ? 'Image' :
                             file.mimeType?.split('/')[0] === 'video' ? 'Video' :
                             file.mimeType?.split('/')[0] === 'audio' ? 'Audio' :
                             file.mimeType?.includes('pdf') ? 'Document' :
                             file.mimeType?.includes('zip') ? 'Archive' : 'File'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Type badge column - hidden on mobile */}
                    <div className="hidden md:flex items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${typeInfo.color}`}>
                        {typeInfo.label.slice(0, 4)}
                      </span>
                    </div>

                    {/* Size column */}
                    <div className="flex items-center text-[11px] md:text-sm text-gray-400 tabular-nums">
                      {formatBytes(Number(file.fileSize))}
                    </div>

                    {/* Modified column - hidden on mobile */}
                    <div className="hidden md:flex items-center text-sm text-gray-500 tabular-nums">
                      {formatDate(file.updatedAt || file.createdAt)}
                    </div>

                    {/* Actions column */}
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        title="Download"
                        className="hidden md:block p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 opacity-0 group-hover:opacity-100 transition-all duration-150"
                        onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = `/api/files/${file.id}/proxy?download=1`; a.download = file.name || 'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Copy Link"
                        className="hidden md:block p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 opacity-0 group-hover:opacity-100 transition-all duration-150"
                        onClick={(e) => { e.stopPropagation(); if (file.shareUrl) { navigator.clipboard.writeText(`${window.location.origin}${file.shareUrl}`); showToastMessage("Link copied!"); } }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="More"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 md:opacity-0 md:group-hover:opacity-100 transition-all duration-150"
                        onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, file }); }}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu - Lightweight, no overlay, close on outside click via useEffect */}
      {contextMenu && (
        <ContextMenuPortal
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          trashMode={trashMode}
          onClose={() => setContextMenu(null)}
          onView={() => { setSelectedFile(contextMenu.file); setShowPreview(true); setContextMenu(null); }}
          onDetails={() => { setSelectedFile(contextMenu.file); setShowDetails(true); setContextMenu(null); }}
          onShare={() => { setSelectedFile(contextMenu.file); setShowShareModal(true); setContextMenu(null); }}
          onMove={() => { setMovingFile(contextMenu.file); setShowMoveModal(true); setContextMenu(null); }}
          onRename={() => { setRenamingItem({ type: "file", item: contextMenu.file }); setNewName(contextMenu.file.name); setShowRenameModal(true); setContextMenu(null); }}
          onCopyLink={() => { navigator.clipboard.writeText(contextMenu.file.shareUrl ? `${window.location.origin}${contextMenu.file.shareUrl}` : `${window.location.origin}/api/files/${contextMenu.file.id}`); showToastMessage("Link copied!"); setContextMenu(null); }}
          onDelete={() => handleDelete(contextMenu.file.id)}
          onRestore={() => handleRestore(contextMenu.file.id)}
          onPermanentDelete={() => handlePermanentDelete(contextMenu.file.id)}
          getMenuPosition={getSmartMenuPosition}
        />
      )}

      {/* Mobile Bottom Sheet Menu */}
      {showMobileSheet && selectedFile && (
        <>
          <div className={`fixed inset-0 bg-black/60 z-40 ${closingModal === 'sheet' ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={() => animatedClose('sheet', () => setShowMobileSheet(false))} />
          <div className={`fixed inset-x-0 bottom-0 z-50 bg-[#0f0f0f] rounded-t-2xl shadow-2xl border-t border-gray-800 md:hidden ${closingModal === 'sheet' ? 'animate-sheet-out' : 'animate-sheet-in'}`}>
            {/* Handle bar */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            {/* File info */}
            <div className="px-4 pb-4 border-b border-gray-800 flex items-center gap-3">
              {selectedFile.thumbnailUrl ? (
                <img src={selectedFile.thumbnailUrl} alt={selectedFile.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                  {getFileIcon(selectedFile.mimeType, "sm")}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatBytes(Number(selectedFile.fileSize))}</p>
              </div>
              <button onClick={() => animatedClose('sheet', () => setShowMobileSheet(false))} className="p-2 hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Share link quick copy */}
            {selectedFile.shareUrl && (
              <div className="px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}${selectedFile.shareUrl}`}
                    className="flex-1 min-w-0 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${selectedFile.shareUrl}`); showToastMessage("Link copied!"); }}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors shrink-0"
                  >
                    <Copy className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
            {/* Actions grid */}
            <div className="p-4 grid grid-cols-4 gap-4">
              <button onClick={() => { setShowPreview(true); setShowMobileSheet(false); }} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors">
                <div className="w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-xs text-gray-400">View</span>
              </button>
              <button onClick={() => { setShowDetails(true); setShowMobileSheet(false); }} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Info className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">Details</span>
              </button>
              <button onClick={() => { setShowShareModal(true); setShowMobileSheet(false); }} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xs text-gray-400">Share</span>
              </button>
              {selectedFile.url && (
                <a href={`/api/files/${selectedFile.id}/proxy?download=1`} download={selectedFile.name} onClick={() => setShowMobileSheet(false)} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-xs text-gray-400">Download</span>
                </a>
              )}
              <button onClick={() => { setRenamingItem({ type: "file", item: selectedFile }); setNewName(selectedFile.name); setShowRenameModal(true); setShowMobileSheet(false); }} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Edit className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">Rename</span>
              </button>
              <button onClick={() => { setMovingFile(selectedFile); setShowMoveModal(true); setShowMobileSheet(false); }} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <FolderInput className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-xs text-gray-400">Move</span>
              </button>
              <button onClick={() => { handleDelete(selectedFile.id); setShowMobileSheet(false); }} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-800 rounded-xl transition-colors">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-xs text-gray-400">Delete</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Folder Context Menu */}
      {folderContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFolderContextMenu(null)} />
          <div
            className="fixed z-50 bg-[#111111] border border-gray-800 rounded-xl shadow-xl py-2 min-w-[180px]"
            style={getSmartMenuPosition(folderContextMenu.x, folderContextMenu.y)}
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
            <button
              onClick={() => {
                downloadFolderAsZip(folderContextMenu.folder.id, folderContextMenu.folder.name);
                setFolderContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-3 text-violet-400"
            >
              <Archive className="w-4 h-4" /> Download as ZIP
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
          className={`fixed inset-0 z-50 flex flex-col md:flex-row ${closingModal === 'preview' ? 'animate-preview-out' : 'animate-preview-in'}`}
          style={{ backgroundColor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.95)' }}
        >
          {/* Top bar - Close button */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            {/* Close button */}
            <button
              onClick={() => animatedClose('preview', () => setShowPreview(false))}
              className={`p-3 rounded-full transition-colors border ${
                isLight
                  ? 'bg-white hover:bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800'
                  : 'bg-black/30 hover:bg-black/50 border-white/50 hover:border-white text-white'
              }`}
            >
              <X className="w-6 h-6" />
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
                <div className="bg-[#111111] rounded-2xl shadow-2xl w-[90vw] max-w-5xl overflow-hidden">
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
                <div className="bg-[#111111] rounded-2xl p-8 shadow-2xl text-center">
                  <File className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">Preview not available</p>
                </div>
              )}
            </div>
          </div>

          {selectedFile.mimeType?.startsWith("image/") && selectedFile.url && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#141414]/95 backdrop-blur px-4 py-2 rounded-full shadow-xl border border-gray-800">
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
          <div className="hidden md:flex w-80 bg-[#0f0f0f] border-l border-gray-800 flex-col overflow-hidden">
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
                {/* Share Link with copy */}
                {selectedFile.shareUrl && (
                  <div className="flex items-start gap-3">
                    <Share2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-400 mb-1">Share Link</div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          readOnly
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}${selectedFile.shareUrl}`}
                          className="flex-1 min-w-0 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300"
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${selectedFile.shareUrl}`); showToastMessage("Link copied!"); }}
                          className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors shrink-0"
                          title="Copy link"
                        >
                          <Copy className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
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
                    href={`/api/files/${selectedFile.id}/proxy?download=1`}
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
          className={`fixed inset-0 z-[60] flex flex-col ${closingModal === 'mobileDetails' ? 'animate-slideup-out' : 'animate-slideup-in'}`}
          style={{ backgroundColor: 'rgba(0,0,0,0.98)' }}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-lg">File Details</h3>
            <button onClick={() => animatedClose('mobileDetails', () => setMobileDetailsOpen(false))} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
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

              {/* Share Link - quick copy (mobile) */}
              {selectedFile.shareUrl && (
                <div className="flex items-center gap-4">
                  <Share2 className="w-6 h-6 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-400">Share Link</div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${selectedFile.shareUrl}`); showToastMessage("Link copied!"); }}
                      className="flex items-center gap-2 text-base text-violet-400 hover:text-violet-300"
                    >
                      <span className="truncate">{`${window.location.origin}${selectedFile.shareUrl}`}</span>
                      <Copy className="w-4 h-4 shrink-0" />
                    </button>
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
                  href={`/api/files/${selectedFile.id}/proxy?download=1`}
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
        <div className="w-80 bg-[#0f0f0f] border-l border-gray-800 flex flex-col overflow-hidden">
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

            {/* Basic Info */}
            <div className="space-y-3">
              <DetailRow icon={<FileText className="w-4 h-4" />} label="Type" value={selectedFile.mimeType || "Unknown"} />
              <DetailRow icon={<Download className="w-4 h-4" />} label="Size" value={formatBytes(Number(selectedFile.fileSize))} />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Created" value={new Date(selectedFile.createdAt).toLocaleString()} />
              <DetailRow icon={<RefreshCw className="w-4 h-4" />} label="Modified" value={new Date(selectedFile.updatedAt).toLocaleString()} />
              {selectedFile.shareUrl && (
                <div className="flex items-start gap-3">
                  <Share2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-400">Share Link</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-violet-400 truncate">{`${typeof window !== 'undefined' ? window.location.origin : ''}${selectedFile.shareUrl}`}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${selectedFile.shareUrl}`); showToastMessage("Link copied!"); }}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Sections */}
            {selectedFile.metadata && (() => {
              const m = selectedFile.metadata;
              return (
                <div className="mt-4 space-y-4">
                  {/* Image/Video Dimensions */}
                  {(m.width || m.height) && (
                    <MetadataSection title="📐 Dimensions">
                      <MetaItem label="Resolution" value={`${m.width} × ${m.height} px`} />
                      {m.aspectRatio && <MetaItem label="Aspect Ratio" value={m.aspectRatio} />}
                      {m.dpi && <MetaItem label="DPI" value={String(m.dpi)} />}
                      {m.bitDepth && <MetaItem label="Bit Depth" value={`${m.bitDepth}-bit`} />}
                      {m.colorSpace && <MetaItem label="Color Space" value={m.colorSpace} />}
                      {m.colorProfile && <MetaItem label="Color Profile" value={m.colorProfile} />}
                      {m.orientation && <MetaItem label="Orientation" value={m.orientation} />}
                      {m.hdr && <MetaItem label="HDR" value={m.hdrFormat || "Yes"} />}
                    </MetadataSection>
                  )}

                  {/* Camera Info */}
                  {(m.camera || m.lens || m.iso) && (
                    <MetadataSection title="📷 Camera">
                      {m.camera && <MetaItem label="Device" value={m.camera} />}
                      {m.lens && <MetaItem label="Lens" value={m.lens} />}
                      {m.focalLength && <MetaItem label="Focal Length" value={m.focalLength35mm ? `${m.focalLength} (${m.focalLength35mm} eq.)` : m.focalLength} />}
                      {m.iso && <MetaItem label="ISO" value={String(m.iso)} />}
                      {m.shutterSpeed && <MetaItem label="Shutter" value={m.shutterSpeed} />}
                      {m.aperture && <MetaItem label="Aperture" value={m.aperture} />}
                      {m.exposureMode && <MetaItem label="Exposure" value={m.exposureMode} />}
                      {m.meteringMode && <MetaItem label="Metering" value={m.meteringMode} />}
                      {m.whiteBalance && <MetaItem label="White Balance" value={m.whiteBalance} />}
                      {m.flash && <MetaItem label="Flash" value={m.flash} />}
                      {m.focusMode && <MetaItem label="Focus" value={m.focusMode} />}
                      {m.dateTaken && <MetaItem label="Date Taken" value={new Date(m.dateTaken).toLocaleString()} />}
                    </MetadataSection>
                  )}

                  {/* GPS */}
                  {m.gps && (
                    <MetadataSection title="📍 Location">
                      <MetaItem label="Coordinates" value={`${m.gps.lat.toFixed(6)}°, ${m.gps.lng.toFixed(6)}°`} />
                      {m.gps.altitude && <MetaItem label="Altitude" value={`${m.gps.altitude.toFixed(1)}m`} />}
                      <a href={`https://maps.google.com/?q=${m.gps.lat},${m.gps.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300 mt-1 block">Open in Maps →</a>
                    </MetadataSection>
                  )}

                  {/* Video Info */}
                  {(m.duration && (selectedFile.mimeType?.startsWith("video/") || m.videoCodec)) && (
                    <MetadataSection title="🎬 Video">
                      <MetaItem label="Duration" value={formatDuration(m.duration)} />
                      {m.fps && <MetaItem label="Frame Rate" value={`${m.fps} fps`} />}
                      {m.videoCodec && <MetaItem label="Codec" value={`${m.videoCodec}${m.videoProfile ? ` (${m.videoProfile})` : ""}`} />}
                      {m.videoBitrate && <MetaItem label="Bitrate" value={formatBitrate(m.videoBitrate)} />}
                      {m.containerFormat && <MetaItem label="Container" value={m.containerFormat} />}
                      {m.rotation && <MetaItem label="Rotation" value={`${m.rotation}°`} />}
                      {m.audioCodec && <MetaItem label="Audio" value={`${m.audioCodec.toUpperCase()}${m.audioChannels ? ` ${m.audioChannels === 2 ? "Stereo" : m.audioChannels === 1 ? "Mono" : `${m.audioChannels}ch`}` : ""}${m.audioSampleRate ? ` ${m.audioSampleRate / 1000}kHz` : ""}`} />}
                      {m.audioBitrate && <MetaItem label="Audio Bitrate" value={formatBitrate(m.audioBitrate)} />}
                      {m.subtitleTracks && <MetaItem label="Subtitles" value={`${m.subtitleTracks} track${m.subtitleTracks > 1 ? "s" : ""}`} />}
                      {m.chapterCount && <MetaItem label="Chapters" value={String(m.chapterCount)} />}
                    </MetadataSection>
                  )}

                  {/* Audio/Music Info */}
                  {(m.duration && selectedFile.mimeType?.startsWith("audio/")) && (
                    <MetadataSection title="🎵 Audio">
                      <MetaItem label="Duration" value={formatDuration(m.duration)} />
                      {m.title && <MetaItem label="Title" value={m.title} />}
                      {m.albumArtist && <MetaItem label="Artist" value={m.albumArtist} />}
                      {m.album && <MetaItem label="Album" value={m.album} />}
                      {m.year && <MetaItem label="Year" value={String(m.year)} />}
                      {m.genre && <MetaItem label="Genre" value={m.genre} />}
                      {m.trackNumber && <MetaItem label="Track" value={m.trackNumber} />}
                      {m.discNumber && <MetaItem label="Disc" value={m.discNumber} />}
                      {m.composer && <MetaItem label="Composer" value={m.composer} />}
                      {m.bpm && <MetaItem label="BPM" value={String(m.bpm)} />}
                      {m.audioCodec && <MetaItem label="Codec" value={m.audioCodec.toUpperCase()} />}
                      {m.audioBitrate && <MetaItem label="Bitrate" value={formatBitrate(m.audioBitrate)} />}
                      {m.audioSampleRate && <MetaItem label="Sample Rate" value={`${m.audioSampleRate / 1000} kHz`} />}
                      {m.audioChannels && <MetaItem label="Channels" value={m.audioChannels === 2 ? "Stereo" : m.audioChannels === 1 ? "Mono" : `${m.audioChannels} channels`} />}
                      {m.encoder && <MetaItem label="Encoder" value={m.encoder} />}
                      {m.hasAlbumArt && <MetaItem label="Album Art" value="Embedded" />}
                    </MetadataSection>
                  )}

                  {/* Document Info */}
                  {(m.pageCount || m.pdfVersion) && (
                    <MetadataSection title="📄 Document">
                      {m.pageCount && <MetaItem label="Pages" value={String(m.pageCount)} />}
                      {m.author && <MetaItem label="Author" value={m.author} />}
                      {m.documentTitle && <MetaItem label="Title" value={m.documentTitle} />}
                      {m.subject && <MetaItem label="Subject" value={m.subject} />}
                      {m.keywords && <MetaItem label="Keywords" value={m.keywords.join(", ")} />}
                      {m.creatorApp && <MetaItem label="Created By" value={m.creatorApp} />}
                      {m.pdfVersion && <MetaItem label="PDF Version" value={m.pdfVersion} />}
                      {m.encrypted && <MetaItem label="Encrypted" value="Yes" />}
                    </MetadataSection>
                  )}

                  {/* Software/Creator */}
                  {(m.software || m.artist || m.copyright || m.creationTool) && (
                    <MetadataSection title="ℹ️ Creator">
                      {m.artist && <MetaItem label="Artist" value={m.artist} />}
                      {m.copyright && <MetaItem label="Copyright" value={m.copyright} />}
                      {m.software && <MetaItem label="Software" value={m.software} />}
                      {m.creationTool && <MetaItem label="Tool" value={m.creationTool} />}
                    </MetadataSection>
                  )}

                  {/* File Hash */}
                  {(m.hash || m.md5) && (
                    <MetadataSection title="🔒 Integrity">
                      {m.hash && <MetaItem label="SHA-256" value={m.hash.slice(0, 16) + "..."} copyValue={m.hash} onCopy={() => showToastMessage("Hash copied!")} />}
                      {m.md5 && <MetaItem label="MD5" value={m.md5.slice(0, 16) + "..."} copyValue={m.md5} onCopy={() => showToastMessage("Hash copied!")} />}
                    </MetadataSection>
                  )}
                </div>
              );
            })()}

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
                  href={`/api/files/${selectedFile.id}/proxy?download=1`}
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
        <div className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 ${closingModal === 'share' ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={() => animatedClose('share', () => { setShowShareModal(false); setShareToken(null); setShareError(null); setSharePassword(''); })}>
          <div className={`bg-[#111111] rounded-2xl p-6 w-full max-w-md border border-gray-800 ${closingModal === 'share' ? 'animate-modal-out' : 'animate-modal-in'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Share File</h2>
              <button onClick={() => animatedClose('share', () => { setShowShareModal(false); setShareToken(null); setShareError(null); })} className="p-2 hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {!shareToken ? (
              <>
                <div className="mb-4">
                  <label className="text-sm text-gray-400 mb-2 block">Password (optional)</label>
                  <input
                    type="password"
                    placeholder="Leave empty for no password"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-sm text-gray-400 mb-2 block">Expires in</label>
                  <select
                    value={shareExpireHours}
                    onChange={(e) => setShareExpireHours(Number(e.target.value))}
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
                    onChange={(e) => setShareAllowDownload(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500"
                  />
                  <span className="text-sm">Allow downloads</span>
                </label>
                <button
                  onClick={async () => {
                    if (!selectedFile) return;
                    setShareError(null);
                    setShareLoading(true);
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
                      const data = await res.json();
                      if (res.ok && data.share?.url) {
                        setShareToken(data.share.url);
                        setRecentActions(prev => [{ action: "Shared", fileId: selectedFile.id, fileName: selectedFile.name, timestamp: Date.now() }, ...prev.slice(0, 2)]);
                      } else {
                        setShareError(data.error || "Failed to create share link");
                      }
                    } catch (err) {
                      setShareError("Network error. Please try again.");
                    } finally {
                      setShareLoading(false);
                    }
                  }}
                  disabled={shareLoading}
                  className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {shareLoading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  ) : "Create Share Link"}
                </button>
                {shareError && (
                  <p className="text-red-400 text-sm text-center mt-2">{shareError}</p>
                )}
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-sm text-gray-400 mb-2 block">Share URL</label>
                  <div className="flex gap-2">
                    <input type="text" value={`${typeof window !== 'undefined' ? window.location.origin : ''}${shareToken}`} readOnly className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm" />
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${shareToken}`); showToastMessage("Copied!"); }}
                      className="px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setShowShareModal(false); setShareToken(null); setSelectedFile(null); }}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowNewFolderModal(false); setNewFolderParentId(null); }}>
          <div className="bg-[#111111] rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
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
          <div className="bg-[#111111] rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
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
          <div className="bg-[#111111] rounded-2xl p-6 w-full max-w-md border border-gray-800" onClick={(e) => e.stopPropagation()}>
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

}

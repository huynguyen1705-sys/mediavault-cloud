"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  FolderPlus, 
  Upload, 
  Grid, 
  List, 
  Search, 
  Filter,
  MoreVertical,
  Image,
  Video,
  Music,
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  X,
  Copy,
  Share2,
  Trash2,
  Download,
  Eye,
  Info,
  Check,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { formatBytes, formatDate } from "@/lib/utils";

export default function FilesPage() {
  const { user, isLoaded } = useUser();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Mock data - sẽ connect database sau
  const files = [
    {
      id: "1",
      name: "vacation-photo.jpg",
      type: "image/jpeg",
      size: 2456000,
      createdAt: "2024-01-15T10:30:00Z",
      thumbnail: null,
      folder: null,
    },
    {
      id: "2",
      name: "presentation.mp4",
      type: "video/mp4",
      size: 156000000,
      createdAt: "2024-01-14T15:45:00Z",
      thumbnail: null,
      folder: null,
    },
    {
      id: "3",
      name: "podcast-episode.mp3",
      type: "audio/mpeg",
      size: 45000000,
      createdAt: "2024-01-13T09:00:00Z",
      thumbnail: null,
      folder: null,
    },
  ];

  const folders = [
    { id: "f1", name: "Work Projects", count: 12 },
    { id: "f2", name: "Personal", count: 8 },
    { id: "f3", name: "Music", count: 25 },
  ];

  const breadcrumbs = [{ id: "root", name: "My Files" }];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file upload here
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      simulateUpload();
    }
  }, []);

  const simulateUpload = () => {
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-emerald-400" />;
    if (mimeType.startsWith("video/")) return <Video className="w-5 h-5 text-amber-400" />;
    if (mimeType.startsWith("audio/")) return <Music className="w-5 h-5 text-sky-400" />;
    return <File className="w-5 h-5 text-gray-400" />;
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
          <div className="flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
                <button className={`text-sm ${index === breadcrumbs.length - 1 ? "text-white font-medium" : "text-gray-400 hover:text-white"}`}>
                  {index === 0 ? <Home className="w-4 h-4" /> : crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            <button 
              onClick={() => simulateUpload()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
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
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="px-4 py-3 bg-violet-500/10 border-b border-violet-500/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-300">Uploading...</span>
                <span className="text-violet-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-violet-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone & Content */}
      <div 
        className={`flex-1 overflow-auto p-4 ${isDragging ? "bg-violet-500/5" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-violet-500/10 border-2 border-dashed border-violet-500 rounded-xl flex items-center justify-center z-10">
            <div className="text-center">
              <Upload className="w-12 h-12 text-violet-400 mx-auto mb-2" />
              <p className="text-lg font-medium text-violet-400">Drop files here</p>
            </div>
          </div>
        )}

        {/* Folders */}
        {folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-violet-500/50 transition-colors text-left group"
                >
                  <Folder className="w-8 h-8 text-violet-400 mb-2" />
                  <div className="font-medium text-sm truncate">{folder.name}</div>
                  <div className="text-xs text-gray-500">{folder.count} files</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Files Grid View */}
        {viewMode === "grid" && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Files</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group relative p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-violet-500/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedFile(file);
                    setShowPreview(true);
                  }}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {file.thumbnail ? (
                      <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-3 bg-gray-700/50 rounded-full">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">{formatBytes(file.size)}</div>
                  </div>
                  {/* Hover Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      className="p-1.5 bg-gray-800/90 rounded-lg hover:bg-gray-700"
                      onClick={(e) => e.stopPropagation()}
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
        {viewMode === "list" && (
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
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <span className="font-medium truncate">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatBytes(file.size)}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(file.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button 
                        className="p-1 hover:bg-gray-700 rounded"
                        onClick={(e) => e.stopPropagation()}
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
        {files.length === 0 && folders.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">No files yet</h3>
              <p className="text-gray-400 mb-4">Drag and drop files here or click Upload</p>
              <button 
                onClick={() => simulateUpload()}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
              >
                Upload Files
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.type)}
                <div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-gray-400">{formatBytes(selectedFile.size)}</div>
                </div>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Content */}
            <div className="p-4 max-h-[60vh] overflow-auto">
              {selectedFile.type.startsWith("image/") ? (
                <div className="flex items-center justify-center bg-gray-800 rounded-xl p-8">
                  <div className="w-64 h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Image Preview</span>
                  </div>
                </div>
              ) : selectedFile.type.startsWith("video/") ? (
                <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                    <span className="text-gray-500">Video Player</span>
                  </div>
                </div>
              ) : selectedFile.type.startsWith("audio/") ? (
                <div className="bg-gray-800 rounded-xl p-8">
                  <div className="text-center">
                    <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <div className="text-lg font-medium mb-2">{selectedFile.name}</div>
                    <button className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg">
                      Play Audio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <span className="text-gray-500">Preview not available</span>
                </div>
              )}
            </div>
            {/* Modal Actions */}
            <div className="p-4 border-t border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <button className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

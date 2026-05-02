"use client";

import { useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Upload, Cloud, Loader2, X, CheckCircle } from "lucide-react";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

export default function HomeUpload() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleFiles = useCallback(async (files: FileList) => {
    if (!isSignedIn) {
      setShowRegisterModal(true);
      return;
    }

    const fileArray = Array.from(files);
    const newFiles: UploadFile[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: "pending" as const,
    }));

    setUploadQueue((prev) => [...prev, ...newFiles]);

    // Small delay for UI feedback before starting uploads
    await new Promise(resolve => setTimeout(resolve, 300));

    const MULTIPART_THRESHOLD = 200 * 1024 * 1024; // 200MB - single PUT for most files
    const PART_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const CONCURRENT_PARTS = 4;

    const uploadOne = async (uploadFile: UploadFile) => {
      try {
        setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, status: "uploading" } : f));
        const updateProgress = (p: number) => setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, progress: p } : f));

        let fileKey: string;

        if (uploadFile.file.size >= MULTIPART_THRESHOLD) {
          // Multipart upload with XHR for real-time progress
          const file = uploadFile.file;
          const totalParts = Math.ceil(file.size / PART_SIZE);

          const initRes = await fetch("/api/upload/multipart", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "init", fileName: file.name, contentType: file.type || "application/octet-stream", fileSize: file.size }),
          });
          if (!initRes.ok) throw new Error("Failed to init multipart");
          const { uploadId, fileKey: fk } = await initRes.json();
          fileKey = fk;

          // Get all part URLs upfront (batch 10)
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
            const end = Math.min(start + PART_SIZE, file.size);
            const chunk = file.slice(start, end);
            const partSize = end - start;
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const totalProgress = (uploadedBytes + partSize * (e.loaded / e.total)) / file.size;
                updateProgress(Math.round(totalProgress * 90));
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                uploadedBytes += partSize;
                completedParts.push({ PartNumber: partNum, ETag: xhr.getResponseHeader("etag") || `"${partNum}"` });
                updateProgress(Math.round((uploadedBytes / file.size) * 90));
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
          const urlRes = await fetch(`/api/upload-url?fileName=${encodeURIComponent(uploadFile.file.name)}&contentType=${encodeURIComponent(uploadFile.file.type || "application/octet-stream")}&fileSize=${uploadFile.file.size}`);
          if (!urlRes.ok) throw new Error("Failed to get upload URL");
          const data = await urlRes.json();
          fileKey = data.fileKey;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => { if (e.lengthComputable) updateProgress(Math.round((e.loaded / e.total) * 90)); };
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.open("PUT", data.uploadUrl);
            xhr.setRequestHeader("Content-Type", uploadFile.file.type || "application/octet-stream");
            xhr.send(uploadFile.file);
          });
        }

        updateProgress(95);
        const confirmRes = await fetch("/api/upload/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileKey, fileName: uploadFile.file.name, mimeType: uploadFile.file.type || "application/octet-stream", fileSize: uploadFile.file.size }) });
        if (!confirmRes.ok) throw new Error("Confirm failed");
        const confirmData = await confirmRes.json().catch(() => null);
        if (confirmData?.file?.id) {
          try {
            const existing = JSON.parse(sessionStorage.getItem('mv-highlight-files') || '[]');
            existing.push(confirmData.file.id);
            sessionStorage.setItem('mv-highlight-files', JSON.stringify(existing));
          } catch { /* Safari Private */ }
        }
        setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, status: "completed", progress: 100 } : f));
      } catch (error: any) {
        setUploadQueue((prev) => prev.map((f) => f.id === uploadFile.id ? { ...f, status: "error", error: error.message } : f));
      }
    };

    // Sort: largest files first → start heavy uploads early
    const sorted = [...newFiles].sort((a, b) => b.file.size - a.file.size);

    // Upload 10 files concurrently (largest first)
    for (let i = 0; i < sorted.length; i += 10) {
      await Promise.all(sorted.slice(i, i + 10).map(uploadOne));
    }

    // Redirect after all complete
    setTimeout(() => {
      setUploadQueue(prev => {
        const anyCompleted = prev.some(f => f.status === "completed");
        if (anyCompleted) router.push("/files");
        return prev;
      });
    }, 1500);
  }, [isSignedIn, router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (!isSignedIn) {
      setShowRegisterModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  if (!isLoaded) return null;

  return (
    <>
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          mt-10 p-10 border-2 border-dashed rounded-2xl cursor-pointer
          transition-all duration-300 text-center
          ${isDragOver
            ? "border-violet-500 bg-violet-500/10"
            : "border-gray-700 hover:border-violet-500/50 hover:bg-gray-900/50"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-4">
          {isDragOver ? (
            <Cloud className="w-16 h-16 text-violet-400 animate-bounce" />
          ) : (
            <Upload className="w-16 h-16 text-gray-500" />
          )}
          <div>
            <p className="text-lg font-medium text-gray-300">
              {isSignedIn ? "Drop files here or click to upload" : "Sign in to upload files"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports images, videos, and audio files
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadQueue.length > 0 && (
        <div className="mt-6 space-y-3 max-w-2xl mx-auto">
          {uploadQueue.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl"
            >
              {uploadFile.status === "uploading" && (
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              )}
              {uploadFile.status === "completed" && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {uploadFile.status === "error" && (
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-xs text-white">✗</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{uploadFile.file.name}</p>
                {uploadFile.status === "error" && (
                  <p className="text-xs text-red-400">{uploadFile.error}</p>
                )}
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-violet-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${uploadFile.progress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadQueue((prev) => prev.filter((f) => f.id !== uploadFile.id));
                }}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800">
            <div className="text-center mb-6">
              <Cloud className="w-16 h-16 text-violet-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Sign in to Upload
              </h2>
              <p className="text-gray-400">
                Create a free account to start uploading and sharing your files securely.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => router.push("/register")}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors"
              >
                Create Free Account
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-full py-2 text-gray-500 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
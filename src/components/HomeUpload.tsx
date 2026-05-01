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

    // Upload with concurrency limit of 3
    const uploadChunk = async (uploadFile: UploadFile) => {
      try {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "uploading" } : f
          )
        );

        const formData = new FormData();
        formData.append("file", uploadFile.file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || "Upload failed");
        }

        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "completed", progress: 100 } : f
          )
        );
      } catch (error: any) {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error", error: error.message }
              : f
          )
        );
      }
    };

    // Run uploads in parallel, max 3 at a time
    for (let i = 0; i < newFiles.length; i += 3) {
      const chunk = newFiles.slice(i, i + 3);
      await Promise.all(chunk.map(uploadChunk));
    }

    // Clear completed after delay
    setTimeout(() => setUploadQueue((prev) => prev.filter((f) => f.status !== "completed")), 5000);
  }, [isSignedIn]);

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
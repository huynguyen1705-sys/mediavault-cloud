"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  HardDrive,
  Trash2,
  Loader2,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Database,
  Server,
} from "lucide-react";
import Link from "next/link";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface StorageData {
  totalStorage: number;
  usedStorage: number;
  availableStorage: number;
  byFileType: Array<{ type: string; size: number; count: number }>;
  topUsers: Array<{ email: string; storage: number; percent: number }>;
  trashStats: {
    totalFiles: number;
    totalSize: number;
    oldestFile: string | null;
  };
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function AdminStoragePage() {
  const { user, isLoaded } = useUser();
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((res) => res.json())
        .then((data) => {
          if (!data.isAdmin) {
            window.location.href = "/dashboard";
            return;
          }
          fetchStorageData();
        });
    }
  }, [isLoaded, user]);

  const fetchStorageData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/storage");
      if (res.ok) {
        const data = await res.json();
        setStorageData(data);
      }
    } catch (error) {
      console.error("Failed to fetch storage:", error);
    }
    setLoading(false);
  };

  const handleCleanupTrash = async () => {
    if (!confirm("Are you sure you want to permanently delete all trashed files? This cannot be undone.")) {
      return;
    }

    setCleaning(true);
    try {
      const res = await fetch("/api/admin/storage/cleanup", {
        method: "POST",
      });
      const data = await res.json();
      setCleanResult({ success: res.ok, message: data.message || data.error });
      if (res.ok) {
        fetchStorageData();
      }
    } catch (error) {
      setCleanResult({ success: false, message: "Failed to cleanup" });
    }
    setCleaning(false);
    setTimeout(() => setCleanResult(null), 5000);
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-white">Storage Management</h1>
          <p className="text-gray-400">Monitor and manage storage usage</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            ← Back to Admin
          </Link>
          <button
            onClick={fetchStorageData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-8 h-8 text-violet-400" />
            <span className="text-gray-400">Total Used</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatBytes(storageData?.usedStorage || 0)}
          </div>
          <div className="text-sm text-gray-500">
            of {formatBytes(storageData?.totalStorage || 0)}
          </div>
          {/* Progress bar */}
          <div className="mt-4 w-full bg-gray-800 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-violet-500 transition-all"
              style={{
                width: `${storageData ? (storageData.usedStorage / storageData.totalStorage * 100) : 0}%`,
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {storageData ? (storageData.usedStorage / storageData.totalStorage * 100).toFixed(1) : 0}% used
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-8 h-8 text-green-400" />
            <span className="text-gray-400">Available</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatBytes(storageData?.availableStorage || 0)}
          </div>
          <div className="text-sm text-gray-500">Free space on disk</div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-8 h-8 text-amber-400" />
            <span className="text-gray-400">Trash</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {storageData?.trashStats?.totalFiles || 0} files
          </div>
          <div className="text-sm text-gray-500">
            {formatBytes(storageData?.trashStats?.totalSize || 0)}
          </div>
          <button
            onClick={handleCleanupTrash}
            disabled={cleaning || (storageData?.trashStats?.totalFiles || 0) === 0}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Clean Trash
          </button>
        </div>
      </div>

      {/* Cleanup Result */}
      {cleanResult && (
        <div className={`mb-6 p-4 rounded-xl ${cleanResult.success ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"}`}>
          <div className="flex items-center gap-2">
            {cleanResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <span className={cleanResult.success ? "text-green-400" : "text-red-400"}>
              {cleanResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Storage by File Type */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-violet-400" />
            Storage by File Type
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={storageData?.byFileType || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="size"
              >
                {(storageData?.byFileType || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                formatter={(value: any) => formatBytes(Number(value))}
              />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Top Users by Storage */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Top Users by Storage
          </h2>
          <div className="space-y-3">
            {(storageData?.topUsers || []).map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 text-center text-gray-500">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{u.email}</div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
                    <div
                      className="h-2 rounded-full bg-cyan-500"
                      style={{ width: `${Math.min(u.percent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-400 whitespace-nowrap">
                  {formatBytes(u.storage)}
                </div>
              </div>
            ))}
            {(storageData?.topUsers || []).length === 0 && (
              <div className="text-center text-gray-500 py-8">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* File Type Details Table */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Storage Details</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">File Type</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Files</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Size</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">%</th>
            </tr>
          </thead>
          <tbody>
            {(storageData?.byFileType || []).map((t, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-sm text-white">{t.type}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-400">{t.count}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-400">{formatBytes(t.size)}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-400">
                  {storageData?.usedStorage ? (t.size / storageData.usedStorage * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
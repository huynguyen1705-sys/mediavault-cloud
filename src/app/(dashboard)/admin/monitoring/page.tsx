"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Monitor,
  Users,
  Upload,
  Cpu,
  HardDrive,
  Activity,
  Wifi,
  Loader2,
  RefreshCw,
  Server,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

interface MonitoringData {
  onlineUsers: number;
  activeUploads: number;
  system: {
    cpu: { cores: number; usagePercent: number };
    memory: { total: number; used: number; free: number; usagePercent: number };
    platform: string;
    uptime: number;
  };
  stats: { totalUsers: number; totalFiles: number };
  timestamp: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

function getStatusColor(percent: number) {
  if (percent < 50) return "text-green-400";
  if (percent < 80) return "text-amber-400";
  return "text-red-400";
}

export default function AdminMonitoringPage() {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitoring");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Failed to fetch monitoring:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((res) => res.json())
        .then((data) => {
          if (!data.isAdmin) {
            window.location.href = "/dashboard";
            return;
          }
          fetchData();
        });
    }
  }, [isLoaded, user]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!loading) {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [loading, fetchData]);

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
          <h1 className="text-3xl font-bold mb-1 text-white">System Monitoring</h1>
          <p className="text-gray-400">
            Real-time system status and user activity
            {lastUpdate && <span className="ml-2 text-gray-500">(Last update: {lastUpdate})</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            ← Back to Admin
          </Link>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Activity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Online Users */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{data?.onlineUsers || 0}</div>
              <div className="text-sm text-gray-400">Online Now</div>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-xs ${data?.onlineUsers && data.onlineUsers > 0 ? "text-green-400" : "text-gray-500"}`}>
            <Wifi className="w-3 h-3" />
            <span>Active in last 5 min</span>
          </div>
        </div>

        {/* Active Uploads */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{data?.activeUploads || 0}</div>
              <div className="text-sm text-gray-400">Uploading</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Activity className="w-3 h-3" />
            <span>Currently in progress</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{data?.stats.totalUsers || 0}</div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <CheckCircle className="w-3 h-3" />
            <span>Registered accounts</span>
          </div>
        </div>

        {/* Total Files */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{data?.stats.totalFiles?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-400">Total Files</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <BarChart3 className="w-3 h-3" />
            <span>Active files stored</span>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* CPU */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">CPU</h2>
          </div>
          <div className="text-4xl font-bold mb-2">
            <span className={getStatusColor(data?.system.cpu.usagePercent || 0)}>
              {data?.system.cpu.usagePercent?.toFixed(1) || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all ${
                (data?.system.cpu.usagePercent || 0) < 50 ? "bg-green-500" :
                (data?.system.cpu.usagePercent || 0) < 80 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(data?.system.cpu.usagePercent || 0, 100)}%` }}
            />
          </div>
          <div className="text-sm text-gray-500">{data?.system.cpu.cores || 0} cores</div>
        </div>

        {/* Memory */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Memory</h2>
          </div>
          <div className="text-4xl font-bold mb-2">
            <span className={getStatusColor(data?.system.memory.usagePercent || 0)}>
              {data?.system.memory.usagePercent?.toFixed(1) || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all ${
                (data?.system.memory.usagePercent || 0) < 50 ? "bg-green-500" :
                (data?.system.memory.usagePercent || 0) < 80 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(data?.system.memory.usagePercent || 0, 100)}%` }}
            />
          </div>
          <div className="text-sm text-gray-500">
            {formatBytes(data?.system.memory.used || 0)} / {formatBytes(data?.system.memory.total || 0)}
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Uptime</h2>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {formatUptime(data?.system.uptime || 0)}
          </div>
          <div className="text-sm text-gray-500">
            Platform: {data?.system.platform || "Unknown"}
          </div>
        </div>
      </div>

      {/* Capacity Status */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          System Capacity Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">CPU Load</div>
            <div className="flex items-center gap-2">
              {(data?.system.cpu.usagePercent || 0) < 50 && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {(data?.system.cpu.usagePercent || 0) >= 50 && (data?.system.cpu.usagePercent || 0) < 80 && (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              {(data?.system.cpu.usagePercent || 0) >= 80 && (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className={
                (data?.system.cpu.usagePercent || 0) < 50 ? "text-green-400" :
                (data?.system.cpu.usagePercent || 0) < 80 ? "text-amber-400" : "text-red-400"
              }>
                {(data?.system.cpu.usagePercent || 0) < 50 ? "Healthy" :
                (data?.system.cpu.usagePercent || 0) < 80 ? "Moderate Load" : "High Load"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Memory</div>
            <div className="flex items-center gap-2">
              {(data?.system.memory.usagePercent || 0) < 50 && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {(data?.system.memory.usagePercent || 0) >= 50 && (data?.system.memory.usagePercent || 0) < 80 && (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              {(data?.system.memory.usagePercent || 0) >= 80 && (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className={
                (data?.system.memory.usagePercent || 0) < 50 ? "text-green-400" :
                (data?.system.memory.usagePercent || 0) < 80 ? "text-amber-400" : "text-red-400"
              }>
                {(data?.system.memory.usagePercent || 0) < 50 ? "Healthy" :
                (data?.system.memory.usagePercent || 0) < 80 ? "Moderate Load" : "High Load"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Active Uploads</div>
            <div className="flex items-center gap-2">
              {(data?.activeUploads || 0) === 0 && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {(data?.activeUploads || 0) > 0 && (data?.activeUploads || 0) < 10 && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {(data?.activeUploads || 0) >= 10 && (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <span className={
                (data?.activeUploads || 0) < 10 ? "text-green-400" : "text-amber-400"
              }>
                {(data?.activeUploads || 0) === 0 ? "Idle" :
                (data?.activeUploads || 0) < 10 ? "Normal" : "Heavy Traffic"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-cyan-400" />
            User Activity
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Online Now</span>
              <span className="text-white font-medium">{data?.onlineUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Registered</span>
              <span className="text-white font-medium">{data?.stats.totalUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Online %</span>
              <span className="text-white font-medium">
                {data?.stats.totalUsers && data.stats.totalUsers > 0
                  ? ((data.onlineUsers / data.stats.totalUsers) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            System Health
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Last Updated</span>
              <span className="text-white font-medium">{lastUpdate || "Never"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Auto-refresh</span>
              <span className="text-green-400 font-medium">Every 10s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status</span>
              <span className="text-green-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

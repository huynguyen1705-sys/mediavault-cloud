"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  FileText,
  Download,
  Users,
  HardDrive,
  Calendar,
  Filter,
  Download as ExportIcon,
  Loader2,
  BarChart3,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ReportData {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  totalBandwidth: number;
  storageByType: Array<{ type: string; size: number; count: number }>;
  storageTrend: Array<{ date: string; size: number }>;
  bandwidthByDay: Array<{ date: string; bandwidth: number }>;
  userGrowth: Array<{ date: string; count: number }>;
  topUsers: Array<{
    email: string;
    storage: number;
    files: number;
    bandwidth: number;
  }>;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function AdminReportsPage() {
  const { user, isLoaded } = useUser();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((res) => res.json())
        .then((data) => {
          if (!data.isAdmin) {
            window.location.href = "/dashboard";
            return;
          }
          
          fetch(`/api/admin/reports?range=${dateRange}&plan=${selectedPlan}&refresh=${refreshKey}`)
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (data) {
                setReportData(data);
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        });
    }
  }, [isLoaded, user, dateRange, selectedPlan]);

  const handleExportCSV = () => {
    if (!reportData) return;

    // Generate CSV
    const headers = ["Email", "Storage", "Files", "Bandwidth"];
    const rows = reportData.topUsers.map((u) => [
      u.email,
      formatBytes(u.storage),
      u.files.toString(),
      formatBytes(u.bandwidth),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fii-one-report-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-3xl font-bold mb-1 text-white">Reports & Analytics</h1>
          <p className="text-gray-400">Usage reports and data export</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            ← Back to Admin
          </Link>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ExportIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 text-sm">Date Range:</span>
          <div className="flex gap-2">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRange === range
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {range === "all" ? "All Time" : range.replace("d", " days")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-violet-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {reportData.totalUsers}
            </div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {reportData.totalFiles.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Files</div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatBytes(reportData.totalStorage)}
            </div>
            <div className="text-sm text-gray-400">Storage Used</div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatBytes(reportData.totalBandwidth)}
            </div>
            <div className="text-sm text-gray-400">Bandwidth Used</div>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Storage Growth */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Storage Growth Trend
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={reportData?.storageTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => formatBytes(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
                formatter={(value: any) => formatBytes(Number(value))}
              />
              <Line type="monotone" dataKey="size" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bandwidth Usage */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Bandwidth by Day
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={reportData?.bandwidthByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => formatBytes(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
                formatter={(value: any) => formatBytes(Number(value))}
              />
              <Bar dataKey="bandwidth" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Storage by File Type */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Storage by File Type</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={reportData?.storageByType || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="size"
              >
                {(reportData?.storageByType || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                formatter={(value: any) => formatBytes(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">User Growth</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={reportData?.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Users Table */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Top Users by Storage</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Storage</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Files</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Bandwidth</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.topUsers.map((u, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-white">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-400">{formatBytes(u.storage)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-400">{u.files}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-400">{formatBytes(u.bandwidth)}</td>
                </tr>
              ))}
              {(!reportData?.topUsers || reportData.topUsers.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
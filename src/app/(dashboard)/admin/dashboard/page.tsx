"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Users,
  HardDrive,
  Activity,
  TrendingUp,
  FileText,
  Download,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Stats {
  totalUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalBandwidthBytes: number;
  totalStorageBytes: number;
  recentSignups: number;
}

interface ChartData {
  dailySignups: Array<{ date: string; count: number }>;
  dailyStorage: Array<{ date: string; total: number }>;
  dailyBandwidth: Array<{ date: string; total: number }>;
  activeUsers: number;
  planDistribution: Array<{ name: string; count: number }>;
  fileTypes: Array<{ type: string; count: number; size: number }>;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/charts"),
      ]).then(async ([statsRes, chartsRes]) => {
        if (!statsRes.ok || !chartsRes.ok) {
          window.location.href = "/dashboard";
          return;
        }
        const [statsData, chartsData] = await Promise.all([
          statsRes.json(),
          chartsRes.json(),
        ]);
        setStats(statsData);
        setChartData(chartsData);
        setLoading(false);
      });
    }
  }, [isLoaded, user]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1 text-white">Admin Dashboard</h1>
        <p className="text-gray-400">System overview and analytics</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-violet-400" />
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stats?.totalUsers || 0}
          </div>
          <div className="text-sm text-gray-400">Total Users</div>
          <div className="text-xs text-green-400 mt-2">
            +{stats?.recentSignups || 0} this week
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-cyan-400" />
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stats?.totalFiles || 0}
          </div>
          <div className="text-sm text-gray-400">Total Files</div>
          <div className="text-xs text-gray-500 mt-2">
            {stats?.totalFolders || 0} folders
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <HardDrive className="w-8 h-8 text-green-400" />
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatBytes(stats?.totalStorageBytes || 0)}
          </div>
          <div className="text-sm text-gray-400">Storage Used</div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Download className="w-8 h-8 text-amber-400" />
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatBytes(stats?.totalBandwidthBytes || 0)}
          </div>
          <div className="text-sm text-gray-400">Bandwidth Used</div>
          <div className="text-xs text-gray-500 mt-2">
            {chartData?.activeUsers || 0} active users (7d)
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Signups Chart */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">User Signups (30 days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData?.dailySignups || []}>
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

        {/* Storage Growth Chart */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Storage Growth (30 days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData?.dailyStorage || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => formatBytes(value)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
                formatter={(value: any) => formatBytes(Number(value))}
              />
              <Bar dataKey="total" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Plan Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData?.planDistribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(chartData?.planDistribution || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* File Types */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">File Types</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData?.fileTypes || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="type" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="count" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  FileText,
  Filter,
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Upload,
  Download as DownloadIcon,
  Settings,
  Trash2,
  Eye,
  Share2,
} from "lucide-react";
import Link from "next/link";

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    email: string | null;
    displayName: string | null;
  };
}

const ACTION_ICONS: Record<string, any> = {
  FILE_UPLOAD: Upload,
  FILE_DOWNLOAD: DownloadIcon,
  FILE_DELETE: Trash2,
  FILE_SHARE: Share2,
  FILE_VIEW: Eye,
  USER_LOGIN: User,
  USER_SIGNUP: User,
  USER_SUSPEND: Shield,
  USER_MAKE_ADMIN: Shield,
  USER_REMOVE_ADMIN: Shield,
  USER_SETTINGS: Settings,
  SYSTEM_SETTINGS_UPDATE: Settings,
};

const ACTION_COLORS: Record<string, string> = {
  FILE_UPLOAD: "text-green-400",
  FILE_DOWNLOAD: "text-cyan-400",
  FILE_DELETE: "text-red-400",
  FILE_SHARE: "text-violet-400",
  FILE_VIEW: "text-gray-400",
  USER_LOGIN: "text-blue-400",
  USER_SIGNUP: "text-amber-400",
  USER_SUSPEND: "text-red-400",
  USER_MAKE_ADMIN: "text-violet-400",
  USER_REMOVE_ADMIN: "text-amber-400",
  USER_SETTINGS: "text-gray-400",
  SYSTEM_SETTINGS_UPDATE: "text-green-400",
};

export default function AdminLogsPage() {
  const { user, isLoaded } = useUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const perPage = 20;

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((res) => res.json())
        .then((data) => {
          if (!data.isAdmin) {
            window.location.href = "/dashboard";
            return;
          }
          fetchLogs();
        });
    }
  }, [isLoaded, user, page, actionFilter, dateFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (dateFilter !== "all") params.append("date", dateFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(Math.ceil((data.total || 0) / perPage));
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
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
          <h1 className="text-3xl font-bold mb-1 text-white">Audit Logs</h1>
          <p className="text-gray-400">System events and user activity</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
        >
          <option value="all">All Actions</option>
          <option value="FILE_UPLOAD">File Upload</option>
          <option value="FILE_DOWNLOAD">File Download</option>
          <option value="FILE_DELETE">File Delete</option>
          <option value="USER_LOGIN">User Login</option>
          <option value="USER_SIGNUP">User Signup</option>
          <option value="USER_MAKE_ADMIN">Make Admin</option>
          <option value="USER_SUSPEND">Suspend User</option>
          <option value="SYSTEM_SETTINGS_UPDATE">Settings Change</option>
        </select>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Time</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Details</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const Icon = ACTION_ICONS[log.action] || FileText;
              const iconColor = ACTION_COLORS[log.action] || "text-gray-400";

              return (
                <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    {log.user?.email || "System"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                      <span className={`text-sm ${iconColor}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details).substring(0, 50) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.ipAddress || "-"}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
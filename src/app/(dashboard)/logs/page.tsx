"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Download, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  login: "bg-blue-500/20 text-blue-400",
  logout: "bg-gray-500/20 text-gray-400",
  upload: "bg-green-500/20 text-green-400",
  download: "bg-purple-500/20 text-purple-400",
  delete: "bg-red-500/20 text-red-400",
  share: "bg-yellow-500/20 text-yellow-400",
  create: "bg-emerald-500/20 text-emerald-400",
  update: "bg-cyan-500/20 text-cyan-400",
  view: "bg-indigo-500/20 text-indigo-400",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getActionColor(action: string) {
  const lower = action.toLowerCase();
  for (const key of Object.keys(ACTION_COLORS)) {
    if (lower.includes(key)) return ACTION_COLORS[key];
  }
  return "bg-gray-700/50 text-gray-400";
}

function exportToCSV(logs: AuditLogEntry[]) {
  const headers = ["Timestamp", "Action", "Resource Type", "Resource ID", "Details", "IP Address"];
  const rows = logs.map((l) => [
    l.createdAt,
    l.action,
    l.resourceType || "",
    l.resourceId || "",
    l.details ? JSON.stringify(l.details) : "",
    l.ipAddress || "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LogsPage() {
  const { user, isLoaded } = useUser();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 25;

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [page, user]);

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (actionFilter) params.set("action", actionFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search) params.set("search", search);

      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      setLogs(json.logs || []);
      setTotalCount(json.total || 0);
      setTotalPages(Math.ceil((json.total || 0) / pageSize));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Audit Logs</h1>
          <p className="text-gray-400 mt-1">{totalCount.toLocaleString()} events recorded</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showFilters ? "bg-purple-600 border-purple-600 text-white" : "bg-gray-900 border-gray-700 text-gray-300 hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => exportToCSV(logs)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actions..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">All actions</option>
              <option value="login">Login</option>
              <option value="upload">Upload</option>
              <option value="download">Download</option>
              <option value="delete">Delete</option>
              <option value="share">Share</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <button
              onClick={handleFilter}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-xs uppercase">Timestamp</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-xs uppercase">Action</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-xs uppercase">Resource</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-xs uppercase">Details</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-xs uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-gray-300 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <div>
                        <span className="text-gray-300">{log.resourceType || "—"}</span>
                        {log.resourceId && (
                          <span className="text-gray-500 ml-2 text-xs">#{log.resourceId.slice(0, 8)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.ipAddress || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm text-gray-300 bg-gray-800 rounded-lg">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
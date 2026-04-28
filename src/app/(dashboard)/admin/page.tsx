"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Users,
  HardDrive,
  Activity,
  Shield,
  Ban,
  CheckCircle,
  Trash2,
  Plus,
  X,
  Loader2,
  Crown,
  Eye,
  ChevronDown,
  ChevronUp,
  Edit,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalBandwidthBytes: number;
  totalStorageBytes: number;
  recentSignups: number;
}

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  planName: string;
  storageUsedBytes: number;
  storageUsedGb: number;
  filesCount: number;
  isSuspended: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  priceMonthly: number;
  storageGb: number;
  maxFileSizeMb: number;
  bandwidthGb: number;
  fileRetentionDays: number;
  allowDownload: boolean;
  allowShare: boolean;
  allowEmbed: boolean;
  isActive: boolean;
  userCount: number;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "plans">("users");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      // Check admin + fetch data in parallel
      Promise.all([
        fetch("/api/admin/stats").then(r => r.json()),
        fetch("/api/admin/users").then(r => r.json()),
        fetch("/api/admin/plans").then(r => r.json()),
      ]).then(([statsData, usersData, plansData]) => {
        // If not admin (401 or 403), redirect
        if (statsData.error || usersData.error) {
          window.location.href = "/dashboard";
          return;
        }
        setStats(statsData.stats || null);
        setUsers(usersData.users || []);
        setPlans(plansData.plans || []);
        setLoading(false);
      }).catch(() => {
        window.location.href = "/dashboard";
      });
    }
  }, [isLoaded, user]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserAction = async (targetUserId: string, action: string) => {
    setActionLoading(targetUserId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, action }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } finally {
      setActionLoading(null);
    }
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
          <h1 className="text-3xl font-bold mb-1">Admin Panel</h1>
          <p className="text-gray-400">Manage users and plans</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
              <span className="text-gray-400 text-sm">Total Users</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="text-xs text-gray-500 mt-1">+{stats.recentSignups} this week</div>
          </div>

          <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-gray-400 text-sm">Total Storage</span>
            </div>
            <div className="text-2xl font-bold">{formatBytes(Number(stats.totalStorageBytes))}</div>
          </div>

          <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-gray-400 text-sm">Bandwidth Used</span>
            </div>
            <div className="text-2xl font-bold">{formatBytes(Number(stats.totalBandwidthBytes))}</div>
          </div>

          <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-sky-400" />
              </div>
              <span className="text-gray-400 text-sm">Total Files</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "users"
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          User Management
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "plans"
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Plans
        </button>
      </div>

      {/* Users Table */}
      {activeTab === "users" && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Storage</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Files</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 font-medium">
                          {u.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-medium">{u.displayName || "No name"}</div>
                          <div className="text-xs text-gray-400">{u.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.isAdmin
                          ? "bg-violet-500/20 text-violet-400"
                          : "bg-gray-800 text-gray-400"
                      }`}>
                        {u.planName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {u.storageUsedGb.toFixed(2)} GB
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {u.filesCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {u.isSuspended ? (
                          <button
                            onClick={() => handleUserAction(u.id, "unsuspend")}
                            disabled={actionLoading === u.id}
                            className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                            title="Unban"
                          >
                            {actionLoading === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(u.id, "suspend")}
                            disabled={actionLoading === u.id}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                            title="Suspend"
                          >
                            {actionLoading === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {u.isAdmin ? (
                          <button
                            onClick={() => handleUserAction(u.id, "remove_admin")}
                            disabled={actionLoading === u.id}
                            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove Admin"
                          >
                            <Crown className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(u.id, "make_admin")}
                            disabled={actionLoading === u.id}
                            className="p-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg transition-colors disabled:opacity-50"
                            title="Make Admin"
                          >
                            <Crown className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans Table */}
      {activeTab === "plans" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditingPlan(null);
                setShowPlanModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Storage</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Max File</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Bandwidth</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Features</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Users</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {plans.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.displayName}</div>
                        <div className="text-xs text-gray-400">{p.name}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-violet-400">
                        ${Number(p.priceMonthly).toFixed(2)}/mo
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.storageGb} GB
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.maxFileSizeMb} MB
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.bandwidthGb} GB/mo
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {p.allowDownload && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">DL</span>
                          )}
                          {p.allowShare && (
                            <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-400 text-xs rounded">SH</span>
                          )}
                          {p.allowEmbed && (
                            <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded">EM</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {p.userCount}
                      </td>
                      <td className="px-4 py-3">
                        {p.isActive ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setEditingPlan(p);
                            setShowPlanModal(true);
                          }}
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <PlanModal
          plan={editingPlan}
          onClose={() => {
            setShowPlanModal(false);
            setEditingPlan(null);
          }}
          onSave={() => {
            setShowPlanModal(false);
            setEditingPlan(null);
            fetchPlans();
          }}
        />
      )}
    </div>
  );
}

function PlanModal({
  plan,
  onClose,
  onSave,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: plan?.name || "",
    displayName: plan?.displayName || "",
    description: plan?.description || "",
    priceMonthly: plan?.priceMonthly || 0,
    storageGb: plan?.storageGb || 5,
    maxFileSizeMb: plan?.maxFileSizeMb || 100,
    bandwidthGb: plan?.bandwidthGb || 10,
    fileRetentionDays: plan?.fileRetentionDays || 0,
    allowDownload: plan?.allowDownload ?? true,
    allowShare: plan?.allowShare ?? true,
    allowEmbed: plan?.allowEmbed ?? false,
    isActive: plan?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: plan ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan ? { planId: plan.id, ...form } : form),
      });
      if (res.ok) {
        onSave();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">{plan ? "Edit Plan" : "Create Plan"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plan Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Price ($/month)</label>
              <input
                type="number"
                step="0.01"
                value={form.priceMonthly}
                onChange={(e) => setForm({ ...form, priceMonthly: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Storage (GB)</label>
              <input
                type="number"
                value={form.storageGb}
                onChange={(e) => setForm({ ...form, storageGb: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={form.maxFileSizeMb}
                onChange={(e) => setForm({ ...form, maxFileSizeMb: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bandwidth (GB/mo)</label>
              <input
                type="number"
                value={form.bandwidthGb}
                onChange={(e) => setForm({ ...form, bandwidthGb: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">File Retention Days (0 = permanent)</label>
            <input
              type="number"
              value={form.fileRetentionDays}
              onChange={(e) => setForm({ ...form, fileRetentionDays: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "allowDownload", label: "Allow Download" },
              { key: "allowShare", label: "Allow Share" },
              { key: "allowEmbed", label: "Allow Embed" },
            ].map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[f.key as keyof typeof form] as boolean}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-300">{f.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-violet-500 focus:ring-violet-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-300">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : plan ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
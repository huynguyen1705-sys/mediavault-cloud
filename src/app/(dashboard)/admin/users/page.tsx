"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Users,
  Shield,
  Crown,
  Ban,
  CheckCircle,
  Trash2,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";

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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "plans">("users");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((res) => res.json())
        .then((data) => {
          if (!data.isAdmin) {
            window.location.href = "/dashboard";
            return;
          }
          Promise.all([
            fetch("/api/admin/stats"),
            fetch("/api/admin/users"),
            fetch("/api/admin/plans"),
          ]).then(async ([statsRes, usersRes, plansRes]) => {
            if (!statsRes.ok) {
              window.location.href = "/dashboard";
              return;
            }
            const [statsData, usersData, plansData] = await Promise.all([
              statsRes.json(),
              usersRes.json(),
              plansRes.json(),
            ]);
            setStats(statsData.stats || statsData);
            setUsers(usersData.users || []);
            setPlans(plansData.plans || []);
            setLoading(false);
          });
        });
    }
  }, [isLoaded, user]);

  const handleUserAction = async (targetUserId: string, action: string) => {
    setActionLoading(targetUserId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === targetUserId) {
              switch (action) {
                case "suspend":
                  return { ...u, isSuspended: true };
                case "unsuspend":
                  return { ...u, isSuspended: false };
                case "make_admin":
                  return { ...u, isAdmin: true };
                case "remove_admin":
                  return { ...u, isAdmin: false };
                default:
                  return u;
              }
            }
            return u;
          })
        );
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
          <h1 className="text-3xl font-bold mb-1 text-white">Admin Panel</h1>
          <p className="text-gray-400">Manage users and plans</p>
        </div>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          ← Dashboard
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
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-gray-400 text-sm">Total Files</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
          </div>

          <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-gray-400 text-sm">Storage Used</span>
            </div>
            <div className="text-2xl font-bold">{formatBytes(stats.totalStorageBytes)}</div>
          </div>

          <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-gray-400 text-sm">Bandwidth</span>
            </div>
            <div className="text-2xl font-bold">{formatBytes(stats.totalBandwidthBytes)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "users"
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Storage</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Files</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Joined</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 text-sm font-medium">
                        {u.email?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-medium text-white">{u.email || "No email"}</div>
                        <div className="text-xs text-gray-500">
                          {u.isAdmin ? "👑 Admin" : "User"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.planName}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.storageUsedGb.toFixed(2)} GB</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.filesCount}</td>
                  <td className="px-4 py-3">
                    {u.isSuspended ? (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Suspended</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.isSuspended ? (
                        <button
                          onClick={() => handleUserAction(u.id, "unsuspend")}
                          disabled={actionLoading === u.id}
                          className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Unsuspend"
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
      )}

      {/* Plans Table */}
      {activeTab === "plans" && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Storage</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Bandwidth</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Max File</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Retention</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Users</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{plan.displayName}</div>
                    <div className="text-xs text-gray-500">{plan.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">${plan.priceMonthly}/mo</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{plan.storageGb} GB</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{plan.bandwidthGb} GB</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{plan.maxFileSizeMb} MB</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{plan.fileRetentionDays} days</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{plan.userCount}</td>
                  <td className="px-4 py-3">
                    {plan.isActive ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No plans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
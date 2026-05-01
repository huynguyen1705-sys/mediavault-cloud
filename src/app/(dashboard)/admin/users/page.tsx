"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Users,
  CreditCard,
  Loader2,
  Search,
  Ban,
  Shield,
  UserCheck,
  UserX,
  ChevronDown,
  Edit,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  ArrowUpCircle,
} from "lucide-react";
import Link from "next/link";
import { formatBytes, formatDate } from "@/lib/utils";

interface UserData {
  id: string;
  email: string | null;
  displayName: string | null;
  planName: string;
  planId: string;
  storageGb: number;
  storageUsedBytes: number;
  filesCount: number;
  bandwidthUsedBytes: number;
  isAdmin: boolean;
  isSuspended: boolean;
  planExpiresAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  storageGb: number;
  bandwidthGb: number;
  maxFileSizeMb: number;
  fileRetentionDays: number;
  userCount: number;
  isActive: boolean;
}

interface EditPlanData {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  storageGb: number;
  bandwidthGb: number;
  maxFileSizeMb: number;
  fileRetentionDays: number;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "plans">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingPlan, setEditingPlan] = useState<EditPlanData | null>(null);
  const [saving, setSaving] = useState(false);
  const [upgradingUser, setUpgradingUser] = useState<UserData | null>(null);
  const [upgradeForm, setUpgradeForm] = useState({
    planId: "",
    expiresAt: "",
    notes: "",
  });

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, plansRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/plans"),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, suspended: !currentStatus }),
      });
      if (res.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, isSuspended: !currentStatus } : u
        ));
      }
    } catch (error) {
      console.error("Failed to toggle suspend:", error);
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/manage-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, admin: !currentStatus }),
      });
      if (res.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, isAdmin: !currentStatus } : u
        ));
      }
    } catch (error) {
      console.error("Failed to toggle admin:", error);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan),
      });
      if (res.ok) {
        setPlans(plans.map(p =>
          p.id === editingPlan.id ? { ...p, ...editingPlan } : p
        ));
        setEditingPlan(null);
      }
    } catch (error) {
      console.error("Failed to save plan:", error);
    }
    setSaving(false);
  };

  const handleTogglePlanActive = async (planId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/plans`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, active: !currentStatus }),
      });
      if (res.ok) {
        setPlans(plans.map(p =>
          p.id === planId ? { ...p, isActive: !currentStatus } : p
        ));
      }
    } catch (error) {
      console.error("Failed to toggle plan:", error);
    }
  };

  const handleUpgradeUser = async () => {
    if (!upgradingUser || !upgradeForm.planId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/change-plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: upgradingUser.id,
          planId: upgradeForm.planId,
          planExpiresAt: upgradeForm.expiresAt || null,
          adminNotes: upgradeForm.notes || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(users.map(u =>
          u.id === upgradingUser.id ? { ...u, planId: data.user.planId, planName: data.user.planName, planExpiresAt: data.user.planExpiresAt, adminNotes: data.user.adminNotes } : u
        ));
        setUpgradingUser(null);
        setUpgradeForm({ planId: "", expiresAt: "", notes: "" });
      }
    } catch (error) {
      console.error("Failed to upgrade user:", error);
    }
    setSaving(false);
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !searchQuery ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlan = planFilter === "all" || u.planName === planFilter;
    const matchStatus = statusFilter === "all" ||
      (statusFilter === "suspended" && u.isSuspended) ||
      (statusFilter === "active" && !u.isSuspended) ||
      (statusFilter === "admin" && u.isAdmin);
    return matchSearch && matchPlan && matchStatus;
  });

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
          <h1 className="text-3xl font-bold mb-1 text-white">Users & Plans</h1>
          <p className="text-gray-400">Manage users, plans, and subscriptions</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "users"
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "plans"
              ? "bg-cyan-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-2" />
          Plans ({plans.length})
        </button>
      </div>

      {/* Users Table */}
      {activeTab === "users" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
            >
              <option value="all">All Plans</option>
              {plans.filter(p => p.isActive).map(plan => (
                <option key={plan.id} value={plan.name}>{plan.displayName}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Plan</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Storage</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Files</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Joined</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{u.displayName || "No name"}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded">
                        {u.planName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {formatBytes(u.storageUsedBytes)} / {u.storageGb}GB
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">{u.filesCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {u.isAdmin && (
                          <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded">
                            Admin
                          </span>
                        )}
                        {u.isSuspended && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                            Suspended
                          </span>
                        )}
                        {!u.isAdmin && !u.isSuspended && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setUpgradingUser(u);
                            setUpgradeForm({ planId: u.planId, expiresAt: "", notes: u.adminNotes || "" });
                          }}
                          className="p-1.5 rounded-lg transition-colors bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
                          title="Change Plan"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isSuspended
                              ? "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                              : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                          }`}
                          title={u.isSuspended ? "Unsuspend" : "Suspend"}
                        >
                          {u.isSuspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isAdmin
                              ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                              : "bg-violet-500/20 hover:bg-violet-500/30 text-violet-400"
                          }`}
                          title={u.isAdmin ? "Remove Admin" : "Make Admin"}
                        >
                          {u.isAdmin ? <Shield className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
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
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
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
                    <button
                      onClick={() => handleTogglePlanActive(plan.id, plan.isActive)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        plan.isActive
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      }`}
                    >
                      {plan.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {plan.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingPlan({
                        id: plan.id,
                        name: plan.name,
                        displayName: plan.displayName,
                        priceMonthly: plan.priceMonthly,
                        storageGb: plan.storageGb,
                        bandwidthGb: plan.bandwidthGb,
                        maxFileSizeMb: plan.maxFileSizeMb,
                        fileRetentionDays: plan.fileRetentionDays,
                        isActive: plan.isActive,
                      })}
                      className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
                      title="Edit Plan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No plans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Edit Plan</h2>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingPlan.displayName}
                  onChange={(e) => setEditingPlan({ ...editingPlan, displayName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Price ($/mo)</label>
                  <input
                    type="number"
                    value={editingPlan.priceMonthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Storage (GB)</label>
                  <input
                    type="number"
                    value={editingPlan.storageGb}
                    onChange={(e) => setEditingPlan({ ...editingPlan, storageGb: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bandwidth (GB)</label>
                  <input
                    type="number"
                    value={editingPlan.bandwidthGb}
                    onChange={(e) => setEditingPlan({ ...editingPlan, bandwidthGb: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max File (MB)</label>
                  <input
                    type="number"
                    value={editingPlan.maxFileSizeMb}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxFileSizeMb: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Retention (days)</label>
                <input
                  type="number"
                  value={editingPlan.fileRetentionDays}
                  onChange={(e) => setEditingPlan({ ...editingPlan, fileRetentionDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <label className="text-sm text-gray-400">Active</label>
                <button
                  onClick={() => setEditingPlan({ ...editingPlan, isActive: !editingPlan.isActive })}
                  className={`p-2 rounded-lg transition-colors ${
                    editingPlan.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-700 text-gray-500"
                  }`}
                >
                  {editingPlan.isActive ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingPlan(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade User Modal */}
      {upgradingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Change Plan</h3>
              <button
                onClick={() => setUpgradingUser(null)}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">User</label>
                <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  {upgradingUser.displayName || upgradingUser.email}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Plan</label>
                <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400">
                  {upgradingUser.planName}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">New Plan</label>
                <select
                  value={upgradeForm.planId}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, planId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select plan...</option>
                  {plans.filter(p => p.isActive).map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.displayName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Expiration Date (optional)</label>
                <input
                  type="date"
                  value={upgradeForm.expiresAt}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, expiresAt: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Admin Notes (optional)</label>
                <textarea
                  value={upgradeForm.notes}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Reason for upgrade, special conditions, etc."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setUpgradingUser(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgradeUser}
                disabled={saving || !upgradeForm.planId}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                Change Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
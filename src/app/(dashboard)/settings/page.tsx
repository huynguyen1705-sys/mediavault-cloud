"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  User,
  HardDrive,
  Shield,
  Globe,
  Trash2,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";

interface UserData {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    plan: {
      id: string;
      name: string;
      displayName: string;
      storageGb: number;
      storageUsedGb: number;
      allowEmbed: boolean;
    };
    filesCount: number;
    isAdmin: boolean;
  };
}

interface EmbedDomain {
  id: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [embedDomains, setEmbedDomains] = useState<EmbedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "storage" | "security" | "domains">("profile");
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData();
      fetchEmbedDomains();
    }
  }, [isLoaded, user]);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmbedDomains = async () => {
    try {
      const res = await fetch("/api/settings/embed-domains");
      if (res.ok) {
        const data = await res.json();
        setEmbedDomains(data.domains);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetch("/api/settings/embed-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      if (res.ok) {
        setNewDomain("");
        fetchEmbedDomains();
      }
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    setDeletingDomain(domainId);
    try {
      const res = await fetch("/api/settings/embed-domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      if (res.ok) {
        setEmbedDomains(embedDomains.filter((d) => d.id !== domainId));
      }
    } finally {
      setDeletingDomain(null);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const storageUsedGb = userData?.user.plan.storageUsedGb || 0;
  const storageGb = userData?.user.plan.storageGb || 1;
  const storagePercent = Math.min(Math.round((storageUsedGb / storageGb) * 100), 100);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1 text-white">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      {/* Theme Toggle moved to header navbar — single source of truth */}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4 overflow-x-auto">
        {[
          { id: "profile", icon: User, label: "Profile" },
          { id: "storage", icon: HardDrive, label: "Storage" },
          { id: "security", icon: Shield, label: "Security" },
          { id: "domains", icon: Globe, label: "Embed Domains" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-violet-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Profile Information</h2>
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                {userData?.user.avatarUrl ? (
                  <img
                    src={userData.user.avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 text-2xl font-bold">
                    {userData?.user.displayName?.[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xl font-semibold text-white">{userData?.user.displayName || "No name set"}</div>
                <div className="text-gray-400 text-sm">{userData?.user.email}</div>
                {userData?.user.isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/20 text-violet-400 text-xs font-medium rounded-full mt-2">
                    <CheckCircle className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Profile information is managed through Clerk. Click the button below to update your profile.
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Danger Zone</h2>
            <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div>
                <div className="font-medium text-red-400">Delete Account</div>
                <div className="text-sm text-gray-400">Permanently delete your account and all data</div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === "storage" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Current Plan</h2>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">{userData?.user.plan.displayName || "Free"} Plan</div>
                  <div className="text-sm text-gray-400">{userData?.user.plan.storageGb} GB storage</div>
                </div>
              </div>
              {userData?.user.plan.name !== "pro" && (
                <Link
                  href="/pricing"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Upgrade Plan
                </Link>
              )}
            </div>

            {/* Storage Usage */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Storage Used</span>
                <span className="font-medium">{storageUsedGb.toFixed(2)} GB / {storageGb} GB</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    storagePercent > 90
                      ? "bg-red-500"
                      : storagePercent > 70
                      ? "bg-amber-500"
                      : "bg-violet-500"
                  }`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{storagePercent}% used</div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
              <div>
                <div className="text-2xl font-bold">{userData?.user.filesCount || 0}</div>
                <div className="text-sm text-gray-400">Total Files</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{storageUsedGb.toFixed(2)} GB</div>
                <div className="text-sm text-gray-400">Storage Used</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{(storageGb - storageUsedGb).toFixed(2)} GB</div>
                <div className="text-sm text-gray-400">Available</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Password</h2>
            <p className="text-sm text-gray-400 mb-4">
              Password management is handled by Clerk for security reasons.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
              <ExternalLink className="w-4 h-4" />
              Manage Password on Clerk
            </button>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Two-Factor Authentication (2FA)</h2>
            <p className="text-sm text-gray-400 mb-4">
              Add an extra layer of security to your account by requiring a verification code in addition to your password.
            </p>
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-gray-400" />
                <div>
                  <div className="font-medium">2FA Status</div>
                  <div className="text-sm text-gray-400">Not enabled</div>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Domains Tab */}
      {activeTab === "domains" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Allowed Embed Domains</h2>
            <p className="text-sm text-gray-400 mb-4">
              Add domains that are allowed to embed your media files. This is useful for your own websites.
              {!userData?.user.plan.allowEmbed && (
                <span className="block mt-2 text-amber-400">
                  ⚠️ Your current plan does not support embed domains. Upgrade to Pro to enable this feature.
                </span>
              )}
            </p>

            {/* Add Domain Form */}
            {userData?.user.plan.allowEmbed && (
              <form onSubmit={handleAddDomain} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={addingDomain}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {addingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Domain
                </button>
              </form>
            )}

            {/* Domain List */}
            <div className="space-y-2">
              {embedDomains.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No embed domains configured</p>
                </div>
              ) : (
                embedDomains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <span className="font-mono text-sm">{domain.domain}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          domain.isActive
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {domain.isActive ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => handleDeleteDomain(domain.id)}
                        disabled={deletingDomain === domain.id}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingDomain === domain.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
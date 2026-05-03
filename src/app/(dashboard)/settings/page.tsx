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
  Key,
  Eye,
  EyeOff,
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

interface ApiKeyData {
  id: string;
  name: string;
  key_preview: string;
  key_full: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [embedDomains, setEmbedDomains] = useState<EmbedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "storage" | "security" | "domains" | "api">("profile");
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showFullKey, setShowFullKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData();
      fetchEmbedDomains();
      fetchApiKeys();
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

  // API Keys functions
  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/v1/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedKey(data.key.key);
        setNewKeyName("");
        fetchApiKeys();
      }
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    setDeletingKey(keyId);
    try {
      const res = await fetch(`/api/v1/keys?id=${keyId}`, { method: "DELETE" });
      if (res.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== keyId));
      }
    } finally {
      setDeletingKey(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
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
          { id: "api", icon: Key, label: "API Keys" },
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

      {/* API Keys Tab */}
      {activeTab === "api" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">API Keys</h2>
                <p className="text-sm text-gray-400 mt-1">Create keys to access the fii.one API from your applications.</p>
              </div>
              <a href="/developers" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Docs
              </a>
            </div>

            {/* Newly created key alert */}
            {newlyCreatedKey && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">API Key Created!</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">Copy your key now — you won't be able to see it again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-sm font-mono text-white break-all">{newlyCreatedKey}</code>
                  <button
                    onClick={() => { copyToClipboard(newlyCreatedKey, "new"); }}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {copiedKey === "new" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
                  </button>
                </div>
                <button onClick={() => setNewlyCreatedKey(null)} className="text-xs text-gray-500 hover:text-gray-400 mt-2">Dismiss</button>
              </div>
            )}

            {/* Create Key Form */}
            <form onSubmit={handleCreateKey} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., My App, WordPress site)"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
              />
              <button
                type="submit"
                disabled={creatingKey || !newKeyName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {creatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Key
              </button>
            </form>

            {/* Keys List */}
            <div className="space-y-3">
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No API keys yet</p>
                  <p className="text-xs mt-1">Create a key to start using the API</p>
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="font-medium text-sm text-white truncate">{key.name}</span>
                        {!key.isActive && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Disabled</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-gray-400 font-mono">
                          {showFullKey === key.id ? key.key_full : key.key_preview}
                        </code>
                        <button onClick={() => setShowFullKey(showFullKey === key.id ? null : key.id)} className="p-0.5">
                          {showFullKey === key.id ? <EyeOff className="w-3 h-3 text-gray-500" /> : <Eye className="w-3 h-3 text-gray-500" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.key_full, key.id)}
                          className="p-0.5"
                        >
                          {copiedKey === key.id ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-gray-500" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                        {key.lastUsedAt && <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                        {key.expiresAt && <span className="text-amber-400">Expires {new Date(key.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      disabled={deletingKey === key.id}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 shrink-0 ml-3"
                    >
                      {deletingKey === key.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Permissions info */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Default Permissions</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-emerald-400 font-medium text-sm">Upload</div>
                <div className="text-xs text-gray-500 mt-1">Upload & edit files</div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-blue-400 font-medium text-sm">Read</div>
                <div className="text-xs text-gray-500 mt-1">List & view files</div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-red-400 font-medium text-sm">Delete</div>
                <div className="text-xs text-gray-500 mt-1">Remove files</div>
              </div>
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
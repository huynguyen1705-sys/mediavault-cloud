"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Settings,
  HardDrive,
  Upload,
  Shield,
  Bell,
  Globe,
  Database,
  Key,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface SystemSettings {
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  defaultRetentionDays: number;
  maxStoragePerUser: number;
  bandwidthLimitGb: number;
  requireEmailVerification: boolean;
  enableSharing: boolean;
  enableEmbed: boolean;
  maintenanceMode: boolean;
}

export default function AdminSettingsPage() {
  const { user, isLoaded } = useUser();
  const [settings, setSettings] = useState<SystemSettings>({
    maxFileSizeMb: 100,
    allowedFileTypes: ["image/*", "video/*", "audio/*", "application/pdf"],
    defaultRetentionDays: 30,
    maxStoragePerUser: 10,
    bandwidthLimitGb: 100,
    requireEmailVerification: true,
    enableSharing: true,
    enableEmbed: false,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [activeTab, setActiveTab] = useState<"general" | "storage" | "security" | "notifications">("general");

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((res) => res.json())
        .then((data) => {
          if (!data.isAdmin) {
            window.location.href = "/dashboard";
            return;
          }
          // Load settings from API
          fetch("/api/admin/settings")
            .then((res) => res.ok ? res.json() : Promise.resolve({ settings: null }))
            .then((data) => {
              if (data && data.settings) {
                setSettings((prev) => ({ ...prev, ...(data as any).settings }));
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        });
    }
  }, [isLoaded, user]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      
      if (res.ok) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-white">System Settings</h1>
          <p className="text-gray-400">Configure platform settings</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: "general", label: "General", icon: Settings },
          { id: "storage", label: "Storage & Files", icon: HardDrive },
          { id: "security", label: "Security", icon: Shield },
          { id: "notifications", label: "Notifications", icon: Bell },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
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

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" />
              General Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">Maintenance Mode</div>
                  <div className="text-sm text-gray-400">Block all user access except admins</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.maintenanceMode ? "bg-violet-600" : "bg-gray-600"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.maintenanceMode ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">Require Email Verification</div>
                  <div className="text-sm text-gray-400">New users must verify email before uploading</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, requireEmailVerification: !settings.requireEmailVerification })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.requireEmailVerification ? "bg-violet-600" : "bg-gray-600"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.requireEmailVerification ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Settings */}
      {activeTab === "storage" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-green-400" />
              Storage Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={settings.maxFileSizeMb}
                  onChange={(e) => setSettings({ ...settings, maxFileSizeMb: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Default Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.defaultRetentionDays}
                  onChange={(e) => setSettings({ ...settings, defaultRetentionDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Storage per User (GB)
                </label>
                <input
                  type="number"
                  value={settings.maxStoragePerUser}
                  onChange={(e) => setSettings({ ...settings, maxStoragePerUser: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Bandwidth Limit (GB/month)
                </label>
                <input
                  type="number"
                  value={settings.bandwidthLimitGb}
                  onChange={(e) => setSettings({ ...settings, bandwidthLimitGb: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Allowed File Types
              </label>
              <div className="flex flex-wrap gap-2">
                {["image/*", "video/*", "audio/*", "application/pdf", "application/zip", "text/*"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const types = settings.allowedFileTypes.includes(type)
                        ? settings.allowedFileTypes.filter((t) => t !== type)
                        : [...settings.allowedFileTypes, type];
                      setSettings({ ...settings, allowedFileTypes: types });
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      settings.allowedFileTypes.includes(type)
                        ? "bg-violet-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Security Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">Enable File Sharing</div>
                  <div className="text-sm text-gray-400">Allow users to share files via link</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, enableSharing: !settings.enableSharing })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.enableSharing ? "bg-violet-600" : "bg-gray-600"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.enableSharing ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">Enable Embed Support</div>
                  <div className="text-sm text-gray-400">Allow embedding media files</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, enableEmbed: !settings.enableEmbed })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.enableEmbed ? "bg-violet-600" : "bg-gray-600"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.enableEmbed ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              API Keys
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Cloudflare R2</span>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Connected</span>
                </div>
                <div className="text-sm text-gray-500 font-mono">r2_****_****</div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Database</span>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Connected</span>
                </div>
                <div className="text-sm text-gray-500">PostgreSQL on 45.128.220.83</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-violet-400" />
              Notification Settings
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">Admin Email</div>
                    <div className="text-sm text-gray-400">Receive system notifications</div>
                  </div>
                  <span className="text-sm text-violet-400">huy.omni@gmail.com</span>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">New User Signup</div>
                    <div className="text-sm text-gray-400">Alert when new users register</div>
                  </div>
                  <button className="relative w-12 h-6 rounded-full bg-violet-600">
                    <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">Storage Alerts</div>
                    <div className="text-sm text-gray-400">Alert when storage exceeds 80%</div>
                  </div>
                  <button className="relative w-12 h-6 rounded-full bg-violet-600">
                    <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveStatus === "success" && (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Settings saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              Failed to save
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}
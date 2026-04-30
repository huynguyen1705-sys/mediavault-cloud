"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Cloud, 
  HardDrive, 
  Image, 
  Video, 
  Music, 
  FolderOpen,
  ArrowUp,
  Clock,
  Loader2,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

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
      fileRetentionDays: number;
    };
    filesCount: number;
    isAdmin: boolean;
  };
  expiringFiles: number;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/user")
        .then((res) => res.json())
        .then((data) => {
          setUserData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isLoaded, user]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const storageUsedGb = userData?.user.plan.storageUsedGb || 0;
  const storageGb = userData?.user.plan.storageGb || 1;
  const storagePercent = Math.round((storageUsedGb / storageGb) * 100);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">
          Welcome back, {user?.firstName || "User"}
        </h1>
        <p className="text-gray-400">
          Manage your media files and account settings
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/files"
          className="p-6 bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 rounded-2xl hover:border-violet-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Open File Manager</h3>
              <p className="text-sm text-gray-400">View and manage files</p>
            </div>
          </div>
        </Link>

        <Link
          href="/files"
          className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <ArrowUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Upload Files</h3>
              <p className="text-sm text-gray-400">Drag & drop or click</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings"
          className="p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Billing & Plan</h3>
              <p className="text-sm text-gray-400">Upgrade to Pro</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Storage Used</span>
            <HardDrive className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-2xl font-bold mb-2">{storageUsedGb.toFixed(2)} GB</div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-violet-500 h-2 rounded-full"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{storagePercent}% of {storageGb} GB</div>
        </div>

        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Total Files</span>
            <FolderOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold mb-2">{userData?.user.filesCount || 0}</div>
          <div className="text-xs text-gray-500">files uploaded</div>
        </div>

        {(userData?.expiringFiles ?? 0) > 0 && (
          <div className="p-4 bg-gray-900 border border-amber-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Expiring Soon</span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold mb-2 text-amber-400">{(userData?.expiringFiles ?? 0)}</div>
            <div className="text-xs text-gray-500">files will be deleted</div>
          </div>
        )}
      </div>

      {/* Plan Badge */}
      <div className="mb-8 p-4 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <Cloud className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="font-medium text-white">{userData?.user.plan.displayName || "Free"} Plan</div>
            <div className="text-sm text-gray-400">
              {userData?.user.plan.storageGb || 1} GB storage
              {(userData?.user.plan.fileRetentionDays ?? 0) > 0 
                ? ` • Files expire after ${userData?.user.plan.fileRetentionDays} days`
                : " • Permanent storage"}
            </div>
          </div>
        </div>
        {userData?.user.plan.name !== "pro" && (
          <Link
            href="/pricing"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Upgrade to Pro
          </Link>
        )}
        {userData?.user.plan.name === "pro" && (
          <span className="px-3 py-1 bg-violet-500/20 text-violet-400 text-sm font-medium rounded-full">
            <CheckCircle className="w-4 h-4 inline mr-1" /> Pro
          </span>
        )}
      </div>

      {/* Recent Files */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Quick Stats</h2>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-800/50 rounded-xl">
            <Image className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">-</div>
            <div className="text-sm text-gray-400">Images</div>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-xl">
            <Video className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">-</div>
            <div className="text-sm text-gray-400">Videos</div>
          </div>
          <div className="text-center p-4 bg-gray-800/50 rounded-xl">
            <Music className="w-8 h-8 text-sky-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">-</div>
            <div className="text-sm text-gray-400">Audio Files</div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 text-center">
          <Link href="/files" className="text-sm text-violet-400 hover:text-violet-300">
            View all files →
          </Link>
        </div>
      </div>
    </div>
  );
}

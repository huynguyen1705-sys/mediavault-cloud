"use client";

import { useUser } from "@clerk/nextjs";
import { 
  Cloud, 
  HardDrive, 
  Image, 
  Video, 
  Music, 
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Clock,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = [
    { 
      label: "Total Storage", 
      value: "0 GB", 
      max: "1 GB",
      icon: HardDrive,
      color: "violet",
      progress: 0
    },
    { 
      label: "Images", 
      value: "0",
      icon: Image,
      color: "emerald"
    },
    { 
      label: "Videos", 
      value: "0",
      icon: Video,
      color: "amber"
    },
    { 
      label: "Audio", 
      value: "0",
      icon: Music,
      color: "sky"
    },
  ];

  const recentFiles = [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
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
              <h3 className="font-semibold">Open File Manager</h3>
              <p className="text-sm text-gray-400">View and manage files</p>
            </div>
          </div>
        </Link>

        <button className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl hover:border-emerald-500/50 transition-colors text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <ArrowUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">Upload Files</h3>
              <p className="text-sm text-gray-400">Drag & drop or click</p>
            </div>
          </div>
        </button>

        <Link
          href="/settings"
          className="p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">Billing & Plan</h3>
              <p className="text-sm text-gray-400">Upgrade to Pro</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-4 bg-gray-900 border border-gray-800 rounded-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{stat.label}</span>
              <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
            </div>
            <div className="text-2xl font-bold mb-2">{stat.value}</div>
            {stat.max && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className={`bg-${stat.color}-500 h-2 rounded-full`}
                  style={{ width: `${stat.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Plan Badge */}
      <div className="mb-8 p-4 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
            <Cloud className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <div className="font-medium">Free Plan</div>
            <div className="text-sm text-gray-400">1 GB storage • 7 day file retention</div>
          </div>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>

      {/* Recent Files */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Files</h2>
            <Link href="/files" className="text-sm text-violet-400 hover:text-violet-300">
              View all
            </Link>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="font-medium mb-2">No files yet</h3>
          <p className="text-gray-400 text-sm mb-4">
            Upload your first file to get started
          </p>
          <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
            Upload Files
          </button>
        </div>
      </div>
    </div>
  );
}

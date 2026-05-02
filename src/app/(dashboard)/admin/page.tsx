"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Shield, Users, BarChart3, Settings, ChevronRight, FileText, FileSearch, HardDrive, Activity } from "lucide-react";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/admin/check")
        .then((res) => res.json())
        .then((data) => {
          setIsAdmin(data.isAdmin);
          if (!data.isAdmin) {
            // Redirect non-admins after 2 seconds
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 3000);
          }
        })
        .catch(() => {
          setIsAdmin(false);
        });
    }
  }, [isLoaded, user]);

  if (!isLoaded || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4" />
          <p className="text-gray-400">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-gray-900/80 rounded-xl border border-gray-800">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">
            You don&apos;t have admin privileges.
            <br />
            <span className="text-sm">Redirecting to dashboard in 3 seconds...</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-violet-400" />
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
        </div>
        <p className="text-gray-400">Welcome, {user?.emailAddresses?.[0]?.emailAddress}</p>
      </div>

      {/* Admin Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/dashboard"
          className="group p-6 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-violet-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Dashboard</h2>
                <p className="text-sm text-gray-400">Analytics & charts</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="group p-6 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-cyan-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Users & Plans</h2>
                <p className="text-sm text-gray-400">Manage users and plans</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="group p-6 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-amber-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Reports</h2>
                <p className="text-sm text-gray-400">Usage reports & export</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/logs"
          className="group p-6 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-cyan-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <FileSearch className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Audit Logs</h2>
                <p className="text-sm text-gray-400">System events & activity</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/storage"
          className="group p-6 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-orange-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Storage</h2>
                <p className="text-sm text-gray-400">Manage disk usage</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/monitoring"
          className="group p-6 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-blue-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Monitoring</h2>
                <p className="text-sm text-gray-400">Real-time system status</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="group p-6 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-green-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Settings</h2>
                <p className="text-sm text-gray-400">System configuration</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
        <p className="text-center text-sm text-gray-400">
          You have full admin access to fii.one
        </p>
      </div>
    </div>
  );
}
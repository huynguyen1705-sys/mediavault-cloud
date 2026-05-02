"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { Cloud, Menu, X, LayoutDashboard, FolderOpen, BarChart3, Settings, ScrollText, Home, Sparkles, CreditCard, Shield } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isSignedIn && user) {
      // Check admin status
      fetch("/api/admin/check")
        .then(r => r.json())
        .then(data => {
          setIsAdmin(data.isAdmin || false);
        })
        .catch(() => setIsAdmin(false));
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user]);

  // Theme is managed by ThemeProvider — no local tracking needed

  const isActive = (path: string) => pathname === path;

  // Guest links
  const guestLinks = [
    { href: "/", label: "Home", icon: Home, color: "text-blue-400" },
    { href: "/features", label: "Features", icon: Sparkles, color: "text-amber-400" },
    { href: "/pricing", label: "Pricing", icon: CreditCard, color: "text-emerald-400" },
  ];

  // Logged in links
  const dashboardLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-400" },
    { href: "/files", label: "Files", icon: FolderOpen, color: "text-amber-400" },
    { href: "/analytics", label: "Analytics", icon: BarChart3, color: "text-emerald-400" },
    { href: "/settings", label: "Settings", icon: Settings, color: "text-gray-400" },
    { href: "/logs", label: "Logs", icon: ScrollText, color: "text-violet-400" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f]/90 backdrop-blur-lg border-b border-gray-800 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile: Menu button (left) */}
          <button
            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo - center on mobile */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 md:relative md:left-auto md:translate-x-0 flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center">
              <Cloud className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              fii.one
            </span>
          </Link>

          {/* Desktop Nav - hidden on mobile */}
          <div className="hidden md:flex items-center gap-6">
            {!isSignedIn ? (
              guestLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "text-violet-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive(link.href) ? "text-violet-400" : link.color}`} />
                    {link.label}
                  </Link>
                );
              })
            ) : (
              dashboardLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      active ? "text-violet-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-violet-400" : link.color}`} />
                    {link.label}
                  </Link>
                );
              })
            )}
            {isSignedIn && !loading && isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "text-violet-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Shield className={`w-4 h-4 ${pathname.startsWith("/admin") ? "text-violet-400" : "text-red-400"}`} />
                Admin
              </Link>
            )}
          </div>

          {/* Auth/Avatar - right side (mobile & desktop) */}
          <div className="flex items-center gap-2 md:gap-4">
            {!isSignedIn ? (
              <>
                <Link
                  href="/login"
                  className="hidden md:inline text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* Theme Toggle Button - uses useTheme() like Settings page */}
                <button
                  onClick={toggleTheme}
                  className={`relative w-11 h-7 rounded-full transition-colors ${
                    theme === "dark" ? "bg-violet-600" : "bg-gray-400"
                  }`}
                  title={theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      theme === "dark" ? "left-0.5" : "left-5"
                    }`}
                  />
                </button>
                <UserButton />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu - always dark regardless of theme */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0f0f0f] border-b border-gray-800 ">
          <div className="px-4 py-3 space-y-1">
            {!isSignedIn ? (
              guestLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive(link.href) ? "bg-violet-500/10 text-white" : "text-gray-300 hover:bg-white/5"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className={`w-5 h-5 ${isActive(link.href) ? "text-violet-400" : link.color}`} />
                    {link.label}
                  </Link>
                );
              })
            ) : (
              <>
                {dashboardLinks.map((link) => {
                  const Icon = link.icon;
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active ? "bg-violet-500/10 text-white" : "text-gray-300 hover:bg-white/5"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className={`w-5 h-5 ${active ? "text-violet-400" : link.color}`} />
                      {link.label}
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      pathname.startsWith("/admin") ? "bg-violet-500/10 text-white" : "text-gray-300 hover:bg-white/5"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Shield className={`w-5 h-5 ${pathname.startsWith("/admin") ? "text-violet-400" : "text-red-400"}`} />
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
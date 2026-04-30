"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { Cloud, Menu, X, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn && user) {
      // Check admin status
      fetch("/api/admin/stats")
        .then(r => {
          if (r.ok) setIsAdmin(true);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user]);

  const isActive = (path: string) => pathname === path;

  // Guest links
  const guestLinks = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
  ];

  // Logged in links (hide Home/Features/Pricing, show dashboard pages)
  const dashboardLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/files", label: "Files" },
    { href: "/analytics", label: "Analytics" },
    { href: "/settings", label: "Settings" },
    { href: "/logs", label: "Logs" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
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
              MediaVault
            </span>
          </Link>

          {/* Desktop Nav - hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            {!isSignedIn ? (
              guestLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-violet-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))
            ) : (
              dashboardLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith(link.href)
                      ? "text-violet-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))
            )}
            {isSignedIn && !loading && isAdmin && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "text-violet-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
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
                {/* Theme Toggle Button */}
                <button
                  onClick={() => {
                    const next = document.documentElement.classList.contains("light") ? "dark" : "light";
                    document.documentElement.classList.remove("light", "dark");
                    document.documentElement.classList.add(next);
                    localStorage.setItem("mv-theme", next);
                  }}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Toggle theme"
                >
                  <Moon className="w-5 h-5" />
                </button>
                <UserButton />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-900 border-b border-gray-800">
          <div className="px-4 py-4 space-y-3">
            {!isSignedIn ? (
              guestLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block text-sm font-medium ${
                    isActive(link.href) ? "text-violet-400" : "text-gray-400"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))
            ) : (
              <>
                {dashboardLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block text-sm font-medium ${
                      pathname.startsWith(link.href) ? "text-violet-400" : "text-gray-400"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`block text-sm font-medium ${
                      pathname.startsWith("/admin") ? "text-violet-400" : "text-gray-400"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
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
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

function applyTheme(t: Theme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(t);
}

function saveLocal(t: Theme) {
  // Cookie for SSR (server reads this on next request)
  document.cookie = `mv-theme=${t}; path=/; max-age=31536000; SameSite=Lax`;
  try { localStorage.setItem("mv-theme", t); } catch {}
}

function readLocal(): Theme | null {
  // Read cookie first (most reliable across refreshes)
  const cookieTheme = document.cookie
    .split("; ")
    .find((row) => row.startsWith("mv-theme="))
    ?.split("=")[1];
  if (cookieTheme === "light" || cookieTheme === "dark") return cookieTheme;

  // Fallback to localStorage
  try {
    const local = localStorage.getItem("mv-theme");
    if (local === "light" || local === "dark") return local;
  } catch {}

  return null;
}

async function saveToDb(theme: Theme) {
  try {
    await fetch("/api/settings/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Step 1: Apply local theme immediately (no flash)
    const localTheme = readLocal();

    if (localTheme) {
      // User has a local preference → apply it immediately
      setTheme(localTheme);
      applyTheme(localTheme);

      // Step 2: Also save local preference back to DB
      // (ensure DB stays in sync with local)
      saveToDb(localTheme);
    } else {
      // Step 3: No local preference → fetch from DB
      fetch("/api/settings/theme")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          const dbTheme: Theme = (data?.theme === "light" || data?.theme === "dark")
            ? data.theme
            : "dark";
          setTheme(dbTheme);
          applyTheme(dbTheme);
          saveLocal(dbTheme); // cache for next refresh
        })
        .catch(() => {
          // Default dark if everything fails
          applyTheme("dark");
        });
    }
  }, []);

  const toggleTheme = () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";

    // 1. Apply immediately
    setTheme(newTheme);
    applyTheme(newTheme);

    // 2. Save locally (cookie + localStorage) — critical for refresh
    saveLocal(newTheme);

    // 3. Save to DB in background
    saveToDb(newTheme);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

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

function saveLocalOnly(t: Theme) {
  // Client-side cookie - best effort
  try {
    document.cookie = `mv-theme=${t}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
  try { localStorage.setItem("mv-theme", t); } catch {}
}

function readLocal(): Theme | null {
  try {
    const cookieTheme = document.cookie
      .split("; ")
      .find((row) => row.startsWith("mv-theme="))
      ?.split("=")[1];
    if (cookieTheme === "light" || cookieTheme === "dark") return cookieTheme;
  } catch {}

  try {
    const local = localStorage.getItem("mv-theme");
    if (local === "light" || local === "dark") return local;
  } catch {}

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const local = readLocal();
    if (local) {
      setTheme(local);
      applyTheme(local);
    } else {
      // No local — fetch from DB
      fetch("/api/settings/theme")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const t: Theme = (data?.theme === "light" || data?.theme === "dark") ? data.theme : "dark";
          setTheme(t);
          applyTheme(t);
          saveLocalOnly(t);
        })
        .catch(() => applyTheme("dark"));
    }
  }, []);

  const toggleTheme = async () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";

    // 1. Apply + save locally FIRST (instant)
    setTheme(newTheme);
    applyTheme(newTheme);
    saveLocalOnly(newTheme);

    // 2. Save to DB + get server-set cookie back
    try {
      const res = await fetch("/api/settings/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("[Theme] DB save failed:", err);
      }
      // Server response sets cookie via Set-Cookie header automatically
    } catch (e) {
      console.warn("[Theme] Network error saving theme:", e);
    }
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

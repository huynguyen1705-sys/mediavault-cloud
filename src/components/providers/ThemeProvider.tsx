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

function saveTheme(t: Theme) {
  // localStorage — primary persistence
  try { localStorage.setItem("mv-theme", t); } catch {}

  // Cookie — backup for SSR (non-critical)
  try {
    document.cookie = `mv-theme=${t}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}

  // DB — source of truth for logged-in users across devices
  fetch("/api/settings/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme: t }),
  }).catch(() => {});
}

function readCurrentTheme(): Theme {
  // Check what's already on <html> element (set by inline script before hydration)
  const html = document.documentElement;
  if (html.classList.contains("light")) return "light";
  if (html.classList.contains("dark")) return "dark";
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Step 1: Read what's currently on the DOM (set by inline script)
    // This is the most reliable — matches what user actually sees
    const current = readCurrentTheme();
    setTheme(current);

    // Step 2: Sync localStorage with DOM state (in case of mismatch)
    const stored = localStorage.getItem("mv-theme");
    if (stored !== current) {
      try { localStorage.setItem("mv-theme", current); } catch {}
    }

    // Step 3: Optionally sync from DB if logged in (background, non-blocking)
    // DB is source of truth for cross-device sync
    fetch("/api/settings/theme")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.theme && (data.theme === "light" || data.theme === "dark")) {
          if (data.theme !== current) {
            // DB says different — update DOM + localStorage
            setTheme(data.theme);
            applyTheme(data.theme);
            try { localStorage.setItem("mv-theme", data.theme); } catch {}
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
    saveTheme(newTheme);
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

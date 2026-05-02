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
  // Also save to cookie for SSR (survives hard refresh)
  document.cookie = `mv-theme=${t}; path=/; max-age=31536000; SameSite=Lax`;
  try { localStorage.setItem("mv-theme", t); } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Priority: cookie (fastest, set by SSR) > localStorage > default dark
    const cookieTheme = document.cookie
      .split("; ")
      .find((row) => row.startsWith("mv-theme="))
      ?.split("=")[1] as Theme | undefined;
    let localTheme: Theme | null = null;
    try { localTheme = localStorage.getItem("mv-theme") as Theme | null; } catch {}

    const initialTheme: Theme = (cookieTheme === "light" || cookieTheme === "dark")
      ? cookieTheme
      : (localTheme === "light" || localTheme === "dark")
      ? localTheme
      : "dark";

    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Sync from DB (for logged-in users, after initial paint)
    fetch("/api/settings/theme")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.theme && (data.theme === "light" || data.theme === "dark")) {
          // DB is source of truth for logged-in users
          setTheme(data.theme);
          applyTheme(data.theme);
        }
      })
      .catch(() => {}); // Silently fail if not logged in
  }, []);

  const toggleTheme = () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);

    // Save to DB (fire and forget)
    fetch("/api/settings/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {}); // Silently fail if not logged in
  };

  // Prevent hydration mismatch — render children immediately
  // Theme class is set on <html> server-side via cookie in layout.tsx
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

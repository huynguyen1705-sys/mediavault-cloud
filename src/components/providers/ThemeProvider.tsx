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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Priority: cookie > localStorage
    const cookieTheme = document.cookie
      .split("; ")
      .find((row) => row.startsWith("mv-theme="))
      ?.split("=")[1] as Theme | undefined;
    const localTheme = localStorage.getItem("mv-theme") as Theme | null;
    const saved = cookieTheme || localTheme;
    if (saved && (saved === "dark" || saved === "light")) {
      setTheme(saved);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(saved);
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    // Save to both localStorage AND cookie (cookie survives hard refresh)
    localStorage.setItem("mv-theme", newTheme);
    document.cookie = `mv-theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(newTheme);
  };

  // Prevent hydration mismatch
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
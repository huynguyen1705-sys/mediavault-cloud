"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ThemePage() {
  const router = useRouter();

  useEffect(() => {
    // Toggle theme
    const current = document.documentElement.classList.contains("light") ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    localStorage.setItem("mv-theme", next);

    // Go back
    router.back();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Switching theme...</div>
    </div>
  );
}
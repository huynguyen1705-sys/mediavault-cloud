import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { cookies } from "next/headers";
import "./globals.css";
import "./light-mode.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "fii.one - Secure Cloud Storage",
  description: "Store, share, and manage your media files securely",
};

// Inline script to read localStorage BEFORE React hydrates — prevents flash
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('mv-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(t);
    }
  } catch(e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("mv-theme")?.value;
  const initialTheme = savedTheme === "light" ? "light" : "dark";

  return (
    <ClerkProvider>
      <ThemeProvider>
        <html lang="en" className={initialTheme}>
          <head>
            {/* Inline script prevents theme flash — runs before React hydration */}
            <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          </head>
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-gray-950 dark:text-gray-100`}>
            {children}
          </body>
        </html>
      </ThemeProvider>
    </ClerkProvider>
  );
}
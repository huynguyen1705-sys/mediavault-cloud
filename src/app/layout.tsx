import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "fii.one - Secure Cloud Storage",
    template: "%s | fii.one",
  },
  description: "Upload, store, and share your media files securely. Fast cloud storage with short share links, password protection, and instant previews.",
  keywords: ["cloud storage", "file sharing", "secure upload", "media hosting", "share files"],
  metadataBase: new URL("https://fii.one"),
  openGraph: {
    title: "fii.one - Secure Cloud Storage",
    description: "Upload, store, and share your media files securely with short links.",
    url: "https://fii.one",
    siteName: "fii.one",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "fii.one - Secure Cloud Storage",
    description: "Upload, store, and share your media files securely.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
            {/* Preconnect to external services for faster loading */}
            <link rel="preconnect" href="https://clerk.fii.one" />
            <link rel="dns-prefetch" href="https://pub-2971f994a6ac2fdadd4842209a20496e.r2.dev" />
            <meta name="theme-color" content="#0a0a0a" />
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
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
  title: "MediaVault Cloud - Secure Media Storage",
  description: "Store, share, and manage your media files securely",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <ThemeProvider>
        <html lang="en" className="dark">
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-gray-950 dark:text-gray-100`}>
            {children}
          </body>
        </html>
      </ThemeProvider>
    </ClerkProvider>
  );
}
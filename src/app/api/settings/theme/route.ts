import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - fetch user theme
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ theme: "dark" });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { theme: true },
    });
    return NextResponse.json({ theme: user?.theme || "dark" });
  } catch {
    return NextResponse.json({ theme: "dark" });
  }
}

// POST - save theme
// Auth optional: always set cookie, save to DB if logged in
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { theme } = body;

  if (theme !== "dark" && theme !== "light") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  // Always set cookie from server-side (most reliable for SSR)
  const res = NextResponse.json({ ok: true, theme });
  res.cookies.set("mv-theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  // Also save to DB if logged in
  try {
    const { userId } = await auth();
    if (userId) {
      await prisma.user.update({
        where: { clerkUserId: userId },
        data: { theme },
      });
    }
  } catch (e: any) {
    // Non-fatal: cookie already set, just log
    console.error("[Theme] DB save error:", e?.message);
  }

  return res;
}

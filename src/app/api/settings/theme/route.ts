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

// POST - save user theme
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { theme } = await req.json();
  if (theme !== "dark" && theme !== "light") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { clerkUserId: userId },
      data: { theme },
    });

    // Set cookie from SERVER side — guaranteed to be sent on next SSR request
    const res = NextResponse.json({ ok: true, theme });
    res.cookies.set("mv-theme", theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
      httpOnly: false, // ThemeProvider needs to read it client-side too
    });
    return res;
  } catch (e: any) {
    console.error("Theme save error:", e?.message);
    return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
  }
}

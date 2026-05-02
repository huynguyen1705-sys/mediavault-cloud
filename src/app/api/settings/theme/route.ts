import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { theme } = body;

  if (theme !== "dark" && theme !== "light") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  // Build Set-Cookie header manually for maximum compatibility
  const cookieStr = [
    `mv-theme=${theme}`,
    "Path=/",
    "Max-Age=31536000",
    "Expires=Mon, 01 Jan 2027 00:00:00 GMT",
    "HttpOnly=false",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ].filter(Boolean).join("; ");

  // Also save to DB if logged in
  try {
    const { userId } = await auth();
    if (userId) {
      await prisma.user.update({
        where: { clerkUserId: userId },
        data: { theme },
      }).catch(() => {}); // Non-fatal
    }
  } catch {}

  // Return JSON with cookie header
  return NextResponse.json(
    { ok: true, theme },
    {
      status: 200,
      headers: {
        "Set-Cookie": cookieStr,
      },
    }
  );
}

// GET - fetch theme
export async function GET() {
  try {
    const { userId } = await auth();
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { clerkUserId: userId },
        select: { theme: true },
      });
      if (user?.theme) {
        return NextResponse.json({ theme: user.theme });
      }
    }
  } catch {}
  return NextResponse.json({ theme: "dark" });
}

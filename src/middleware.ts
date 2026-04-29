import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard/:path*",
  "/files/:path*",
  "/settings/:path*",
  "/analytics/:path*",
  "/logs/:path*",
  "/admin/:path*",
]);

// Public API routes that don't need auth
const isPublicApiRoute = createRouteMatcher([
  "/api/files/:path*/proxy",
  "/api/share/:path*",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Allow public API routes without auth
  if (isPublicApiRoute(req)) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

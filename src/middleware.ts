import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Pages that require login (will redirect to /login if not authenticated)
const isProtectedPage = createRouteMatcher([
  "/dashboard/:path*",
  "/files/:path*",
  "/settings/:path*",
  "/analytics/:path*",
  "/logs/:path*",
  "/admin/:path*",
]);

// Public routes that skip Clerk entirely (no auth needed at all)
const isPublicRoute = createRouteMatcher([
  "/",
  "/login/:path*",
  "/register/:path*",
  "/pricing",
  "/features",
  "/about",
  "/terms",
  "/privacy",
  "/contact",
  "/refund",
  "/developers",
  "/public/:path*",
  "/s/:path*",
  "/api/files/:path*/proxy",
  "/api/share/:path*/download",
  "/api/share/:token",
  "/api/plans",
  "/api/v1/upload",
  "/api/v1/files/:path*",
  // /api/share/[token] GET is now in public routes
  // Do NOT add /api/share here - POST needs Clerk session
  "/api/settings/theme",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Public routes: skip all auth logic
  if (isPublicRoute(req)) {
    return;
  }

  // Protected pages: redirect to login if not authenticated
  if (isProtectedPage(req)) {
    const { userId } = await auth();
    if (!userId) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect_url", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // API routes: let them through (they handle their own auth via auth() in route handlers)
  // Clerk middleware still attaches the session cookies for authenticated requests
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

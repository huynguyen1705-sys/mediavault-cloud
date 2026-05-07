import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const user = await currentUser();
    if (!user) {
      // Should not happen if userId exists, but handle defensively
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Find or create user profile
    let userProfile = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!userProfile) {
      // Create new user profile with free plan
      const freePlan = await prisma.plan.findUnique({
        where: { name: "free" },
      });

      if (!freePlan) {
        console.error("Free plan not found during user creation callback.");
        return NextResponse.json({ error: "Free plan not found" }, { status: 500 });
      }

      userProfile = await prisma.user.create({
        data: {
          clerkUserId: userId,
          email: user.emailAddresses[0]?.emailAddress || null,
          displayName: user.fullName || user.firstName || "User",
          avatarUrl: user.imageUrl || null,
          planId: freePlan.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: userProfile.id,
          action: "USER_CREATED_VIA_CALLBACK",
          resourceType: "user",
          resourceId: userProfile.id,
        },
      });
    }

    // Redirect to dashboard after successful processing
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    // Redirect to an error page or login page on unexpected errors
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
  }
}

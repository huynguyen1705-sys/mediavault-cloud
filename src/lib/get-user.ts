import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * Get or create user profile in DB.
 * Call this from any API route that needs the internal user.
 * Returns null if not authenticated.
 */
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  // Try to find existing user
  let userProfile = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { plan: true },
  });

  if (userProfile) return userProfile;

  // User doesn't exist yet — create with free plan
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const freePlan = await prisma.plan.findUnique({
    where: { name: "free" },
  });

  if (!freePlan) {
    console.error("CRITICAL: Free plan not found in DB");
    return null;
  }

  userProfile = await prisma.user.create({
    data: {
      clerkUserId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || null,
      displayName: clerkUser.fullName || clerkUser.firstName || "User",
      avatarUrl: clerkUser.imageUrl || null,
      planId: freePlan.id,
    },
    include: { plan: true },
  });

  // Log
  await prisma.auditLog.create({
    data: {
      userId: userProfile.id,
      action: "USER_CREATED",
      resourceType: "user",
      resourceId: userProfile.id,
    },
  }).catch(() => {}); // non-critical

  console.log(`New user created: ${userProfile.email} (${userProfile.id})`);
  return userProfile;
}

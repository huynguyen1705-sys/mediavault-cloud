import { NextRequest } from "next/server";
import prisma from "@/lib/db";

export interface ApiUser {
  id: string;
  email: string | null;
  planId: string;
  apiKeyId: string;
  permissions: string[];
}

/**
 * Validate API key from request header or query param.
 * Returns user info or null if invalid.
 */
export async function validateApiKey(request: NextRequest): Promise<ApiUser | null> {
  // Check Authorization header: Bearer <key> or just the key
  const authHeader = request.headers.get("authorization");
  let apiKey: string | null = null;

  if (authHeader) {
    apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();
  }

  // Fallback: check query param ?key=
  if (!apiKey) {
    const { searchParams } = new URL(request.url);
    apiKey = searchParams.get("key");
  }

  if (!apiKey) return null;

  // Find key in database
  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    include: {
      user: {
        select: { id: true, email: true, planId: true },
      },
    },
  });

  if (!keyRecord) return null;
  if (!keyRecord.isActive) return null;
  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {}); // non-blocking

  return {
    id: keyRecord.user.id,
    email: keyRecord.user.email,
    planId: keyRecord.user.planId,
    apiKeyId: keyRecord.id,
    permissions: keyRecord.permissions,
  };
}

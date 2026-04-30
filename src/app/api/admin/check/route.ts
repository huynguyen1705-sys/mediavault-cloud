import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ 
        authenticated: false,
        message: "Not logged in" 
      }, { status: 401 });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { 
        id: true,
        email: true,
        isAdmin: true 
      }
    });

    return NextResponse.json({
      authenticated: true,
      clerkUserId,
      user: user ? {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      } : null,
      isAdmin: user?.isAdmin || false,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ 
      error: "Internal error",
      details: String(error)
    }, { status: 500 });
  }
}
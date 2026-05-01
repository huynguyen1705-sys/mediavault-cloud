import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import os from "os";

// In-memory tracking
const activeUsers = new Map<string, number>(); // clerkUserId -> lastActivity timestamp
let activeUploads = 0;

// Track user activity
export function trackUserActivity(clerkUserId: string) {
  activeUsers.set(clerkUserId, Date.now());
}

// Track upload start/end
export function trackUploadStart() {
  activeUploads++;
}

export function trackUploadEnd() {
  activeUploads = Math.max(0, activeUploads - 1);
}

// Clean old entries periodically
function cleanInactiveUsers() {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  for (const [userId, lastActivity] of activeUsers.entries()) {
    if (lastActivity < fiveMinutesAgo) {
      activeUsers.delete(userId);
    }
  }
}

// GET - Get real-time monitoring data
export async function GET() {
  try {
    // Clean inactive users first
    cleanInactiveUsers();

    // Get system metrics
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsage = cpuCount > 0 ? ((1 - totalIdle / totalTick) * 100).toFixed(1) : "0";
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

    // Active users count (online in last 5 minutes)
    const onlineUsers = activeUsers.size;

    // Get from database - total users
    const { default: prisma } = await import("@/lib/db");
    
    let totalUsers = 0;
    let totalFiles = 0;
    try {
      totalUsers = await prisma.user.count();
      totalFiles = await prisma.file.count({ where: { deletedAt: null } });
    } catch (e) {
      // DB not available
    }

    return NextResponse.json({
      onlineUsers,
      activeUploads,
      system: {
        cpu: {
          cores: cpuCount,
          usagePercent: parseFloat(cpuUsage),
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercent: parseFloat(memUsagePercent),
        },
        platform: os.platform(),
        uptime: os.uptime(),
      },
      stats: {
        totalUsers,
        totalFiles,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Monitoring error:", error);
    return NextResponse.json({ error: "Failed to get monitoring data" }, { status: 500 });
  }
}

// Export for use in other routes
export { activeUsers, activeUploads };

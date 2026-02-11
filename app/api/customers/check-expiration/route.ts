import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

// POST - Check and suspend expired customers
// This can be called manually by admin or by a cron job
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret or admin session
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (cronSecret && cronSecret === expectedSecret) {
      // Valid cron request
    } else {
      // Check for admin session
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();

    // Find all expired active customers
    const expiredCustomers = await prisma.customer.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lt: now,
          not: null,
        },
      },
    });

    if (expiredCustomers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired customers found",
        processed: 0,
      });
    }

    const results = {
      suspended: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    // Import HestiaAPI
    const { HestiaAPI } = await import("@/lib/hestia-api");
    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_ADMIN_USER || "admin",
      password: process.env.HESTIA_ADMIN_PASSWORD!,
    });

    for (const customer of expiredCustomers) {
      try {
        // Suspend in HestiaCP
        await hestia.suspendUser(customer.hestiaUsername);

        // Update customer status in database
        await prisma.customer.update({
          where: { id: customer.id },
          data: { status: "SUSPENDED" },
        });

        // Also suspend all websites
        await prisma.website.updateMany({
          where: { customerId: customer.id },
          data: { status: "SUSPENDED" },
        });

        // Log activity
        await prisma.activityLog.create({
          data: {
            userId: null, // System action
            action: "CUSTOMER_SUSPENDED",
            resource: "customer",
            resourceId: customer.id,
            description: `Customer ${customer.email} suspended due to expired subscription. Expired at: ${customer.expiresAt?.toISOString()}`,
            ipAddress: "system",
          },
        });

        results.suspended.push(customer.email);
      } catch (error) {
        console.error(`Failed to suspend customer ${customer.email}:`, error);
        results.failed.push({
          email: customer.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredCustomers.length} expired customers`,
      processed: expiredCustomers.length,
      suspended: results.suspended.length,
      failed: results.failed.length,
      details: results,
    });
  } catch (error) {
    console.error("Error checking expired customers:", error);
    return NextResponse.json(
      { error: "Failed to check expired customers" },
      { status: 500 },
    );
  }
}

// GET - Get list of expired/expiring customers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get already expired customers (still active)
    const expired = await prisma.customer.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lt: now,
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        expiresAt: true,
        packageId: true,
      },
    });

    // Get customers expiring within 7 days
    const expiringSoon = await prisma.customer.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        expiresAt: true,
        packageId: true,
      },
    });

    // Get suspended due to expiration
    const suspended = await prisma.customer.findMany({
      where: {
        status: "SUSPENDED",
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        expiresAt: true,
        packageId: true,
      },
    });

    return NextResponse.json({
      expired: expired.map((c) => ({
        ...c,
        daysOverdue: Math.ceil(
          (now.getTime() - (c.expiresAt?.getTime() || 0)) /
            (1000 * 60 * 60 * 24),
        ),
      })),
      expiringSoon: expiringSoon.map((c) => ({
        ...c,
        daysRemaining: Math.ceil(
          ((c.expiresAt?.getTime() || 0) - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      })),
      suspended,
      summary: {
        totalExpired: expired.length,
        totalExpiringSoon: expiringSoon.length,
        totalSuspended: suspended.length,
      },
    });
  } catch (error) {
    console.error("Error fetching expiration status:", error);
    return NextResponse.json(
      { error: "Failed to fetch expiration status" },
      { status: 500 },
    );
  }
}

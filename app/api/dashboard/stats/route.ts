import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
export async function GET() {
  try {
    const [
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      totalWebsites,
      activeWebsites,
      pendingWebsites,
      totalDatabases,
      recentActivities,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.customer.count({ where: { status: "SUSPENDED" } }),
      prisma.website.count(),
      prisma.website.count({ where: { status: "ACTIVE" } }),
      prisma.website.count({
        where: {
          status: { in: ["PENDING", "SSL_PENDING", "DNS_PENDING"] },
        },
      }),
      prisma.database.count(),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          active: activeCustomers,
          suspended: suspendedCustomers,
        },
        websites: {
          total: totalWebsites,
          active: activeWebsites,
          pending: pendingWebsites,
        },
        databases: {
          total: totalDatabases,
        },
        totalCustomers,
        recentActivities,
      },
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

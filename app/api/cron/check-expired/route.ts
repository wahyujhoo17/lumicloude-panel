import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { HestiaAPI } from "@/lib/hestia-api";

/**
 * GET /api/cron/check-expired - Check and suspend expired customers
 * This should be called by a cron job daily
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "change-this-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const now = new Date();

    // Find all active customers that have expired
    const expiredCustomers = await prisma.customer.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lt: now,
        },
      },
      include: {
        websites: true,
      },
    });

    console.log(`[Cron] Found ${expiredCustomers.length} expired customers`);

    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const results = [];
    for (const customer of expiredCustomers) {
      try {
        // Suspend user account in HestiaCP
        const suspendResult = await hestia.suspendUser(customer.hestiaUsername);

        if (suspendResult.success) {
          // Suspend all websites
          const websiteResults = [];
          for (const website of customer.websites) {
            // Use custom domain if available, otherwise use subdomain
            const domain = website.customDomain || website.subdomain;

            try {
              const webResult = await hestia.suspendWebDomain(
                customer.hestiaUsername,
                domain,
              );
              websiteResults.push({
                domain,
                success: webResult.success,
              });
            } catch (error: any) {
              websiteResults.push({
                domain,
                success: false,
                error: error.message,
              });
            }
          }

          // Update status in database
          await prisma.customer.update({
            where: { id: customer.id },
            data: { status: "SUSPENDED" },
          });

          // Log activity
          await prisma.activityLog.create({
            data: {
              action: "customer.auto_suspended",
              resource: "customer",
              resourceId: customer.id,
              description: `Auto-suspended expired customer: ${customer.name} (${customer.email}) and ${customer.websites.length} websites. Expired on: ${customer.expiresAt?.toISOString()}`,
            },
          });

          results.push({
            customerId: customer.id,
            email: customer.email,
            success: true,
            websitesSuspended: websiteResults.filter((w) => w.success).length,
            totalWebsites: customer.websites.length,
          });

          console.log(
            `[Cron] Suspended customer: ${customer.email} and ${customer.websites.length} websites`,
          );
        } else {
          results.push({
            customerId: customer.id,
            email: customer.email,
            success: false,
            error: suspendResult.error,
          });

          console.error(
            `[Cron] Failed to suspend customer ${customer.email}:`,
            suspendResult.error,
          );
        }
      } catch (error: any) {
        results.push({
          customerId: customer.id,
          email: customer.email,
          success: false,
          error: error.message,
        });

        console.error(
          `[Cron] Error suspending customer ${customer.email}:`,
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredCustomers.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron] Error checking expired customers:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

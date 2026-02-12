import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { HestiaAPI } from "@/lib/hestia-api";

/**
 * POST /api/customers/[id]/suspend - Suspend customer account
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    // Only admins can suspend customers
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        websites: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    // Suspend in HestiaCP
    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    // Suspend user account
    const result = await hestia.suspendUser(customer.hestiaUsername);

    if (!result.success) {
      throw new Error(result.error || "Failed to suspend user in HestiaCP");
    }

    // Suspend all websites/domains
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
          error: webResult.error,
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
    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: { status: "SUSPENDED" },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "customer.suspended",
        resource: "customer",
        resourceId: customer.id,
        description: `Suspended customer: ${customer.name} (${customer.email}) and ${customer.websites.length} websites`,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: "Customer and all websites suspended successfully",
      websiteResults,
    });
  } catch (error: any) {
    console.error("Error suspending customer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/customers/[id]/suspend - Unsuspend customer account
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    // Only admins can unsuspend customers
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        websites: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    // Unsuspend in HestiaCP
    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    // Unsuspend user account
    const result = await hestia.unsuspendUser(customer.hestiaUsername);

    if (!result.success) {
      throw new Error(result.error || "Failed to unsuspend user in HestiaCP");
    }

    // Unsuspend all websites/domains
    const websiteResults = [];
    for (const website of customer.websites) {
      // Use custom domain if available, otherwise use subdomain
      const domain = website.customDomain || website.subdomain;

      try {
        const webResult = await hestia.unsuspendWebDomain(
          customer.hestiaUsername,
          domain,
        );
        websiteResults.push({
          domain,
          success: webResult.success,
          error: webResult.error,
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
    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: { status: "ACTIVE" },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "customer.unsuspended",
        resource: "customer",
        resourceId: customer.id,
        description: `Unsuspended customer: ${customer.name} (${customer.email}) and ${customer.websites.length} websites`,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: "Customer and all websites unsuspended successfully",
      websiteResults,
    });
  } catch (error: any) {
    console.error("Error unsuspending customer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

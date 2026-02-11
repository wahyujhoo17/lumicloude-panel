import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

// GET billing history (optional, bisa dikembangkan nanti)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        packageId: true,
        billingCycle: true,
        monthlyPrice: true,
        expiresAt: true,
        status: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Calculate days remaining
    let daysRemaining = null;
    let isExpired = false;
    if (customer.expiresAt) {
      const now = new Date();
      const diff = customer.expiresAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
      isExpired = diff < 0;
    }

    return NextResponse.json({
      customer,
      daysRemaining,
      isExpired,
    });
  } catch (error) {
    console.error("Error fetching billing info:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing info" },
      { status: 500 },
    );
  }
}

// POST - Add billing / Extend subscription
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can add billing
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admin can add billing" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { months } = body;

    // Validate months (1-12)
    if (!months || months < 1 || months > 12) {
      return NextResponse.json(
        { error: "Months must be between 1 and 12" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Calculate new expiration date
    let newExpiresAt: Date;
    const now = new Date();

    if (customer.expiresAt && customer.expiresAt > now) {
      // If not expired, add months to current expiration
      newExpiresAt = new Date(customer.expiresAt);
    } else {
      // If expired or no expiration, start from now
      newExpiresAt = now;
    }

    // Add months
    newExpiresAt.setMonth(newExpiresAt.getMonth() + months);

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        expiresAt: newExpiresAt,
        status: "ACTIVE", // Reactivate if was suspended
        nextBillingDate: newExpiresAt, // Set next billing date
      },
    });

    // If customer was suspended, reactivate in HestiaCP
    if (customer.status === "SUSPENDED") {
      try {
        // Import HestiaAPI and unsuspend user
        const { HestiaAPI } = await import("@/lib/hestia-api");
        const hestia = new HestiaAPI({
          host: process.env.HESTIA_HOST!,
          port: process.env.HESTIA_PORT!,
          user: process.env.HESTIA_ADMIN_USER || "admin",
          password: process.env.HESTIA_ADMIN_PASSWORD!,
        });
        await hestia.unsuspendUser(customer.hestiaUsername);
      } catch (hestiaError) {
        console.error("Failed to unsuspend in HestiaCP:", hestiaError);
        // Don't fail the request, just log the error
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "BILLING_EXTENDED",
        resource: "customer",
        resourceId: customer.id,
        description: `Extended subscription for ${customer.email} by ${months} month(s). New expiration: ${newExpiresAt.toISOString()}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription extended by ${months} month(s)`,
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        expiresAt: updatedCustomer.expiresAt,
        status: updatedCustomer.status,
      },
    });
  } catch (error) {
    console.error("Error extending billing:", error);
    return NextResponse.json(
      { error: "Failed to extend billing" },
      { status: 500 },
    );
  }
}

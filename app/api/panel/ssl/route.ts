import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getHestiaAPI } from "@/lib/hestia-api";

/**
 * POST /api/panel/ssl/enable - Enable SSL for domain
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { domain, websiteId } = body;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    const hestia = getHestiaAPI();

    // Enable SSL using Let's Encrypt
    const sslResult = await hestia.enableSSL(customer.hestiaUsername, domain);

    if (!sslResult.success) {
      throw new Error(sslResult.error || "Failed to enable SSL");
    }

    // Force SSL redirect
    await hestia.forceSSL(customer.hestiaUsername, domain);

    // Update database if websiteId provided
    if (websiteId) {
      await prisma.website.update({
        where: { id: websiteId },
        data: {
          sslEnabled: true,
          sslForce: true,
          sslVerified: true,
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "SSL certificate enabled successfully",
    });
  } catch (error: any) {
    console.error("Error enabling SSL:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/panel/ssl/renew - Renew SSL certificate
 */
export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    const hestia = getHestiaAPI();

    const result = await hestia.renewSSL(customer.hestiaUsername, domain);

    if (!result.success) {
      throw new Error(result.error || "Failed to renew SSL");
    }

    return NextResponse.json({
      success: true,
      message: "SSL certificate renewed successfully",
    });
  } catch (error: any) {
    console.error("Error renewing SSL:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

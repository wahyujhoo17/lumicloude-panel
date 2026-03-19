import { NextResponse } from "next/server";
import { getHestiaAPI } from "@/lib/hestia-api";
import prisma from "@/lib/prisma";

/**
 * POST /api/websites/ssl/enable
 * Enable SSL for a website
 */
export async function POST(request: Request) {
  try {
    const { websiteId, customDomain } = await request.json();

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: { customer: true },
    });

    if (!website) {
      return NextResponse.json(
        { success: false, error: "Website not found" },
        { status: 404 },
      );
    }

    const hestia = getHestiaAPI();

    // Enable SSL for custom domain if provided, otherwise for subdomain
    const domainToEnable = customDomain || website.subdomain;
    const sslResult = await hestia.enableSSL(
      website.customer.hestiaUsername,
      domainToEnable,
    );

    if (!sslResult.success) {
      throw new Error(`SSL enable failed: ${sslResult.error}`);
    }

    // Force SSL redirect
    await hestia.forceSSL(website.customer.hestiaUsername, domainToEnable);

    // Update database
    await prisma.website.update({
      where: { id: websiteId },
      data: {
        sslEnabled: true,
        sslForce: true,
        sslVerified: true,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: `SSL enabled successfully for ${domainToEnable}`,
    });
  } catch (error: any) {
    console.error("Error enabling SSL:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

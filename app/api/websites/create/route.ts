import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { HestiaAPI } from "@/lib/hestia-api";
import { getPackage } from "@/lib/packages";
import { z } from "zod";

const createWebsiteSchema = z.object({
  name: z.string().min(2, "Website name must be at least 2 characters"),
  phpVersion: z.string().default("8.1"),
  enableSSL: z.boolean().default(true),
});

/**
 * POST /api/websites/create
 * Create new website for existing customer
 */
export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();

    // Get customer data
    const customer = await prisma.customer.findUnique({
      where: { email: currentUser.email || "" },
      include: {
        websites: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer account not found" },
        { status: 404 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = createWebsiteSchema.parse(body);

    // Check package limits
    const pkg = getPackage(customer.packageId);
    const websiteLimit = pkg ? pkg.websites : 1;
    const packageName = pkg ? pkg.name : "Basic";

    if (websiteLimit > 0 && customer.websites.length >= websiteLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Website limit reached. Your ${packageName} package allows ${websiteLimit} website(s). You currently have ${customer.websites.length}. Please upgrade your package to add more websites.`,
        },
        { status: 403 },
      );
    }

    // Generate subdomain from website name
    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST || "",
      port: process.env.HESTIA_PORT || "8083",
      user: process.env.HESTIA_USER || "admin",
      password: process.env.HESTIA_PASSWORD,
    });

    const subdomain = hestia.formatSubdomain(
      data.name,
      process.env.PRIMARY_DOMAIN,
    );

    console.log(
      `[CREATE WEBSITE] Creating website: ${subdomain} for customer: ${customer.hestiaUsername}`,
    );

    // Check if subdomain already exists
    const existingWebsite = await prisma.website.findFirst({
      where: {
        subdomain: subdomain,
      },
    });

    if (existingWebsite) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A website with this name already exists. Please choose a different name.",
        },
        { status: 409 },
      );
    }

    // Create website in Hestia (no aliases - subdomain only)
    const domainResult = await hestia.addDomain({
      user: customer.hestiaUsername,
      domain: subdomain,
      aliases: [],
      restart: true,
    });

    if (!domainResult.success) {
      console.error(
        `[CREATE WEBSITE] Failed to create domain:`,
        domainResult.error,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create website: ${domainResult.error || "Unknown error"}`,
        },
        { status: 500 },
      );
    }

    console.log(`[CREATE WEBSITE] Domain created successfully: ${subdomain}`);

    // Enable SSL if requested
    let sslEnabled = false;
    if (data.enableSSL) {
      const sslResult = await hestia.enableSSL(
        customer.hestiaUsername,
        subdomain,
      );
      sslEnabled = sslResult.success;

      if (sslEnabled) {
        await hestia.forceSSL(customer.hestiaUsername, subdomain);
        console.log(`[CREATE WEBSITE] SSL enabled for: ${subdomain}`);
      } else {
        console.warn(
          `[CREATE WEBSITE] SSL setup failed, will be pending:`,
          sslResult.error,
        );
      }
    }

    // Save website to database
    const website = await prisma.website.create({
      data: {
        subdomain,
        customDomain: null,
        aliases: [],
        ipAddress: process.env.CLOUDFLARE_EDGE_IP || "198.41.192.67",
        sslEnabled,
        sslForce: sslEnabled,
        phpVersion: data.phpVersion,
        status: sslEnabled ? "ACTIVE" : "SSL_PENDING",
        dnsVerified: true, // Cloudflare Tunnel wildcard handles this
        sslVerified: sslEnabled,
        diskUsage: 0,
        bandwidthUsage: 0,
        customerId: customer.id,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE_WEBSITE",
        resource: "website",
        resourceId: website.id,
        description: `Customer ${customer.name} created website: ${subdomain}`,
        status: "SUCCESS",
        metadata: {
          subdomain,
          customerId: customer.id,
          sslEnabled,
        },
      },
    });

    console.log(`[CREATE WEBSITE] Website created successfully:`, website.id);

    return NextResponse.json({
      success: true,
      data: {
        website: {
          id: website.id,
          subdomain: website.subdomain,
          url: `https://${website.subdomain}`,
          status: website.status,
          sslEnabled: website.sslEnabled,
          phpVersion: website.phpVersion,
        },
        message: `Website ${subdomain} created successfully! It will be accessible in 1-2 minutes.`,
      },
    });
  } catch (error: any) {
    console.error("[CREATE WEBSITE] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create website",
      },
      { status: 500 },
    );
  }
}

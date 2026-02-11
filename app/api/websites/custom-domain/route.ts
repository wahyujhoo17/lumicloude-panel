import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { HestiaAPI } from "@/lib/hestia-api";
import { z } from "zod";

const customDomainSchema = z.object({
  websiteId: z.string(),
  customDomain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i,
      "Invalid domain format",
    ),
});

/**
 * POST /api/websites/custom-domain
 * Add custom domain to existing website (as alias in Hestia)
 */
export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();

    const customer = await prisma.customer.findUnique({
      where: { email: currentUser.email || "" },
      include: { websites: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer account not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const data = customDomainSchema.parse(body);

    // Verify website belongs to this customer
    const website = customer.websites.find((w) => w.id === data.websiteId);
    if (!website) {
      return NextResponse.json(
        { success: false, error: "Website not found" },
        { status: 404 },
      );
    }

    // Check if custom domain is already used
    const existingDomain = await prisma.website.findFirst({
      where: { customDomain: data.customDomain },
    });

    if (existingDomain) {
      return NextResponse.json(
        { success: false, error: "This custom domain is already in use" },
        { status: 409 },
      );
    }

    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST || "",
      port: process.env.HESTIA_PORT || "8083",
      user: process.env.HESTIA_USER || "admin",
      password: process.env.HESTIA_PASSWORD,
    });

    // Add custom domain as alias in Hestia
    const aliasResult = await hestia.addDomainAliases(
      customer.hestiaUsername,
      website.subdomain,
      [data.customDomain],
    );

    if (!aliasResult.success) {
      console.error(`[CUSTOM DOMAIN] Failed to add alias:`, aliasResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to add custom domain: ${aliasResult.error || "Unknown error"}`,
        },
        { status: 500 },
      );
    }

    console.log(
      `[CUSTOM DOMAIN] Alias added: ${data.customDomain} → ${website.subdomain}`,
    );

    // Update database
    await prisma.website.update({
      where: { id: data.websiteId },
      data: {
        customDomain: data.customDomain,
        aliases: [data.customDomain],
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "ADD_CUSTOM_DOMAIN",
        resource: "website",
        resourceId: website.id,
        description: `Customer ${customer.name} added custom domain ${data.customDomain} to ${website.subdomain}`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        customDomain: data.customDomain,
        subdomain: website.subdomain,
        message: `Custom domain ${data.customDomain} has been linked to ${website.subdomain}. Please make sure your DNS is pointing to this subdomain.`,
        dnsInstructions: {
          type: "CNAME",
          name: "@",
          value: website.subdomain,
          ttl: 3600,
          note: "If your DNS provider doesn't support CNAME on root domain, use an A record pointing to the server IP, or use a subdomain like www.",
        },
      },
    });
  } catch (error: any) {
    console.error("[CUSTOM DOMAIN] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid domain format",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to add custom domain" },
      { status: 500 },
    );
  }
}

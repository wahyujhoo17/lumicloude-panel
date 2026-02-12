import { NextResponse } from "next/server";
import { HestiaAPI } from "@/lib/hestia-api";
import prisma from "@/lib/prisma";

/**
 * Test endpoint for debugging suspend functionality
 * GET /api/test-suspend?customerId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId query parameter required" },
        { status: 400 },
      );
    }

    // Get customer with websites
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        websites: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const results = {
      customer: {
        id: customer.id,
        name: customer.name,
        hestiaUsername: customer.hestiaUsername,
        status: customer.status,
      },
      websites: [] as any[],
      tests: {
        userSuspend: null as any,
        webDomainSuspends: [] as any[],
      },
    };

    // List all websites
    for (const website of customer.websites) {
      const domain = website.customDomain || website.subdomain;
      results.websites.push({
        id: website.id,
        subdomain: website.subdomain,
        customDomain: website.customDomain,
        domainToUse: domain,
      });
    }

    // Test 1: Check if user can be suspended
    console.log(`[Test] Testing suspend user: ${customer.hestiaUsername}`);
    const userSuspendTest = await hestia.suspendUser(customer.hestiaUsername);
    results.tests.userSuspend = {
      success: userSuspendTest.success,
      error: userSuspendTest.error,
      output: userSuspendTest.output,
    };

    // Test 2: Try to suspend each web domain
    for (const website of customer.websites) {
      const domain = website.customDomain || website.subdomain;
      console.log(
        `[Test] Testing suspend web domain: ${customer.hestiaUsername} - ${domain}`,
      );

      const webSuspendTest = await hestia.suspendWebDomain(
        customer.hestiaUsername,
        domain,
      );

      results.tests.webDomainSuspends.push({
        domain,
        success: webSuspendTest.success,
        error: webSuspendTest.error,
        output: webSuspendTest.output,
      });
    }

    // Test 3: List web domains to see status
    console.log(`[Test] Listing web domains for: ${customer.hestiaUsername}`);
    const listResult = await hestia.request("v-list-web-domains", [
      customer.hestiaUsername,
      "json",
    ]);

    return NextResponse.json({
      success: true,
      results,
      domainsList: listResult.data || listResult.output,
    });
  } catch (error: any) {
    console.error("[TestSuspend] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

/**
 * Test unsuspend
 * POST /api/test-suspend?customerId=xxx
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId query parameter required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        websites: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const results = {
      userUnsuspend: null as any,
      webDomainUnsuspends: [] as any[],
    };

    // Unsuspend user
    const userUnsuspendTest = await hestia.unsuspendUser(
      customer.hestiaUsername,
    );
    results.userUnsuspend = {
      success: userUnsuspendTest.success,
      error: userUnsuspendTest.error,
    };

    // Unsuspend web domains
    for (const website of customer.websites) {
      const domain = website.customDomain || website.subdomain;
      const webUnsuspendTest = await hestia.unsuspendWebDomain(
        customer.hestiaUsername,
        domain,
      );

      results.webDomainUnsuspends.push({
        domain,
        success: webUnsuspendTest.success,
        error: webUnsuspendTest.error,
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

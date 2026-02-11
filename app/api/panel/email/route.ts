import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getHestiaAPI } from "@/lib/hestia-api";

/**
 * GET /api/panel/email - List all email accounts
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
      include: {
        websites: true,
      },
    });

    if (!customer || customer.websites.length === 0) {
      return NextResponse.json(
        { success: false, error: "No websites found" },
        { status: 404 },
      );
    }

    const hestiaClient = new (await import("@/lib/hestia-api")).HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: customer.hestiaUsername,
      password: customer.hestiaPassword,
    });

    const domain = customer.websites[0].subdomain;
    const result = await hestiaClient.listMailAccounts(
      customer.hestiaUsername,
      domain,
    );

    return NextResponse.json({
      success: true,
      data: result.success ? result.data : [],
    });
  } catch (error: any) {
    console.error("Error fetching email accounts:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/panel/email - Create email account
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { account, password, domain } = body;

    if (!account || !password) {
      return NextResponse.json(
        { success: false, error: "Account name and password are required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
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

    const targetDomain = domain || customer.websites[0]?.subdomain;

    if (!targetDomain) {
      return NextResponse.json(
        { success: false, error: "No domain available" },
        { status: 400 },
      );
    }

    const hestiaClient = new (await import("@/lib/hestia-api")).HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const result = await hestiaClient.addMailAccount({
      user: customer.hestiaUsername,
      domain: targetDomain,
      account: account,
      password: password,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to create email account");
    }

    return NextResponse.json({
      success: true,
      data: {
        email: `${account}@${targetDomain}`,
        account,
        domain: targetDomain,
      },
    });
  } catch (error: any) {
    console.error("Error creating email account:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/panel/email - Delete email account
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const account = searchParams.get("account");
    const domain = searchParams.get("domain");

    if (!account || !domain) {
      return NextResponse.json(
        { success: false, error: "Account and domain are required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    const hestiaClient = new (await import("@/lib/hestia-api")).HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const result = await hestiaClient.deleteMailAccount(
      customer.hestiaUsername,
      domain,
      account,
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to delete email account");
    }

    return NextResponse.json({
      success: true,
      message: "Email account deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting email account:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

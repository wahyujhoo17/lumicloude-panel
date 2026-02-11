import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { HestiaAPI } from "@/lib/hestia-api";

/**
 * GET /api/panel/dns - List DNS records
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

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

    const targetDomain = domain || customer.websites[0].subdomain;

    const hestiaClient = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: customer.hestiaUsername,
      password: customer.hestiaPassword,
    });

    const result = await hestiaClient.listDNSRecords(
      customer.hestiaUsername,
      targetDomain,
    );

    return NextResponse.json({
      success: true,
      data: {
        domain: targetDomain,
        records: result.success ? result.data : [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching DNS records:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/panel/dns - Add DNS record
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { domain, type, name, value, priority, ttl } = body;

    if (!domain || !type || !value) {
      return NextResponse.json(
        { success: false, error: "Domain, type, and value are required" },
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

    const hestiaClient = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const result = await hestiaClient.addDNSRecord({
      user: customer.hestiaUsername,
      domain: domain,
      record: name || "@",
      type: type,
      value: value,
      priority: priority,
      ttl: ttl || 3600,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to add DNS record");
    }

    return NextResponse.json({
      success: true,
      message: "DNS record added successfully",
    });
  } catch (error: any) {
    console.error("Error adding DNS record:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/panel/dns - Delete DNS record
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const recordId = searchParams.get("id");

    if (!domain || !recordId) {
      return NextResponse.json(
        { success: false, error: "Domain and record ID are required" },
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

    const hestiaClient = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const result = await hestiaClient.deleteDNSRecord(
      customer.hestiaUsername,
      domain,
      parseInt(recordId),
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to delete DNS record");
    }

    return NextResponse.json({
      success: true,
      message: "DNS record deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting DNS record:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

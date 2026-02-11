import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getHestiaAPI } from "@/lib/hestia-api";

/**
 * GET /api/panel/backups - List available backups
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
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
      user: customer.hestiaUsername,
      password: customer.hestiaPassword,
    });

    const result = await hestiaClient.listBackups(customer.hestiaUsername);

    return NextResponse.json({
      success: true,
      data: result.success ? result.data : [],
    });
  } catch (error: any) {
    console.error("Error fetching backups:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/panel/backups - Create backup
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
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

    const result = await hestiaClient.backupUser(customer.hestiaUsername);

    if (!result.success) {
      throw new Error(result.error || "Failed to create backup");
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE_BACKUP",
        resource: "backup",
        description: `Backup created for ${customer.hestiaUsername}`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Backup created successfully",
    });
  } catch (error: any) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/panel/backups/restore - Restore from backup
 */
export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { backup } = body;

    if (!backup) {
      return NextResponse.json(
        { success: false, error: "Backup name is required" },
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

    const hestiaClient = new (await import("@/lib/hestia-api")).HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const result = await hestiaClient.restoreUser(
      customer.hestiaUsername,
      backup,
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to restore backup");
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "RESTORE_BACKUP",
        resource: "backup",
        description: `Backup restored for ${customer.hestiaUsername}: ${backup}`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Backup restored successfully",
    });
  } catch (error: any) {
    console.error("Error restoring backup:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getHestiaAPI } from "@/lib/hestia-api";

/**
 * GET /api/panel/databases - List all databases for customer
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
      include: {
        databases: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    // Also fetch from HestiaCP for real-time stats
    const hestia = new getHestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: customer.hestiaUsername,
      password: customer.hestiaPassword,
    });

    const result = await hestia.listDatabases(customer.hestiaUsername);

    return NextResponse.json({
      success: true,
      data: {
        local: customer.databases,
        hestia: result.success ? result.data : [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching databases:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/panel/databases - Create new database
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Database name is required" },
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

    // Generate credentials
    const hestia = getHestiaAPI();
    const dbName = `${customer.hestiaUsername}_${name}`;
    const dbUser = `${customer.hestiaUsername}_${name}`;
    const dbPassword = hestia.generatePassword(16);

    // Create in HestiaCP
    const hestiaClient = new getHestiaAPI.constructor({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    const result = await hestiaClient.createDatabase({
      user: customer.hestiaUsername,
      database: dbName,
      dbuser: dbUser,
      dbpass: dbPassword,
      charset: "utf8mb4",
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to create database in HestiaCP");
    }

    // Save to local database
    const database = await prisma.database.create({
      data: {
        customerId: customer.id,
        name: dbName,
        username: dbUser,
        password: dbPassword,
        host: "localhost",
        port: 3306,
        charset: "utf8mb4",
      },
    });

    return NextResponse.json({
      success: true,
      data: database,
    });
  } catch (error: any) {
    console.error("Error creating database:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/panel/databases/[id] - Delete database
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Database ID is required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
      include: {
        databases: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    const database = customer.databases.find((db) => db.id === id);

    if (!database) {
      return NextResponse.json(
        { success: false, error: "Database not found" },
        { status: 404 },
      );
    }

    // Delete from HestiaCP
    const hestiaClient = new getHestiaAPI.constructor({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    await hestiaClient.deleteDatabase(customer.hestiaUsername, database.name);

    // Delete from local database
    await prisma.database.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Database deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting database:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

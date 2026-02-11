import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getHestiaAPI } from "@/lib/hestia-api";
import { z } from "zod";

const changeDocRootSchema = z.object({
  directory: z.string().min(1, "Directory path is required"),
});

/**
 * POST /api/websites/document-root
 * Change website document root directory
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { directory } = changeDocRootSchema.parse(body);

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

    const website = customer.websites[0];
    if (!website) {
      return NextResponse.json(
        { success: false, error: "No website found" },
        { status: 404 },
      );
    }

    const hestia = getHestiaAPI();

    // Validate directory path (security check)
    if (directory.includes("..") || directory.startsWith("/")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid directory path. Use relative path only (e.g., SEOcom)",
        },
        { status: 400 },
      );
    }

    // Change document root
    const result = await hestia.changeDocumentRoot(
      customer.hestiaUsername,
      website.subdomain,
      directory,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to change document root: ${result.error}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Document root changed to: ${directory}`,
      directory,
    });
  } catch (error: any) {
    console.error("Error changing document root:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/websites/document-root
 * Reset document root to default (public_html)
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();

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

    const website = customer.websites[0];
    if (!website) {
      return NextResponse.json(
        { success: false, error: "No website found" },
        { status: 404 },
      );
    }

    const hestia = getHestiaAPI();

    // Reset to default
    const result = await hestia.resetDocumentRoot(
      customer.hestiaUsername,
      website.subdomain,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to reset document root: ${result.error}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document root reset to default (public_html)",
    });
  } catch (error: any) {
    console.error("Error resetting document root:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

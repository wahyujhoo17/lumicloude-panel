import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHestiaAPI } from "@/lib/hestia-api";

/**
 * GET /api/websites/[id] - Get website details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
      include: {
        websites: {
          where: { id: params.id },
        },
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
        { success: false, error: "Website not found or not owned by you" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: website,
    });
  } catch (error: any) {
    console.error("Error fetching website:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/websites/[id] - Update website (custom domain, PHP version)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { customDomain, phpVersion } = body;

    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
      include: {
        websites: {
          where: { id: params.id },
        },
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
        { success: false, error: "Website not found or not owned by you" },
        { status: 404 },
      );
    }

    const hestia = getHestiaAPI();
    const updateData: any = {};

    // Update PHP version if provided
    if (phpVersion && phpVersion !== website.phpVersion) {
      const validPhpVersions = ["7.4", "8.0", "8.1", "8.2", "8.3"];
      if (!validPhpVersions.includes(phpVersion)) {
        return NextResponse.json(
          { success: false, error: "Invalid PHP version" },
          { status: 400 },
        );
      }

      // Change PHP version in HestiaCP
      try {
        const result = await hestia.changePhpVersion(
          customer.hestiaUsername,
          website.subdomain,
          phpVersion,
        );

        if (!result.success) {
          console.error(
            "Failed to change PHP version in HestiaCP:",
            result.error,
          );
          // Continue anyway, just update database
        }
      } catch (hestiaError) {
        console.error("HestiaCP PHP version change error:", hestiaError);
      }

      updateData.phpVersion = phpVersion;
    }

    // Update custom domain if provided (or remove if null)
    if (customDomain !== undefined) {
      if (customDomain) {
        // Validate domain format
        const domainRegex =
          /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(customDomain)) {
          return NextResponse.json(
            { success: false, error: "Invalid domain format" },
            { status: 400 },
          );
        }

        // Check if domain is already used
        const existingDomain = await prisma.website.findFirst({
          where: {
            customDomain: customDomain,
            id: { not: params.id },
          },
        });

        if (existingDomain) {
          return NextResponse.json(
            {
              success: false,
              error: "This domain is already connected to another website",
            },
            { status: 400 },
          );
        }

        // Add domain alias in HestiaCP
        if (customDomain !== website.customDomain) {
          try {
            // Remove old alias if exists
            if (website.customDomain) {
              await hestia.deleteDomainAlias(
                customer.hestiaUsername,
                website.subdomain,
                website.customDomain,
              );
            }

            // Add new alias
            const result = await hestia.addDomainAlias(
              customer.hestiaUsername,
              website.subdomain,
              customDomain,
            );

            if (!result.success) {
              console.error(
                "Failed to add domain alias in HestiaCP:",
                result.error,
              );
            }
          } catch (hestiaError) {
            console.error("HestiaCP domain alias error:", hestiaError);
          }
        }

        updateData.customDomain = customDomain;
      } else {
        // Remove custom domain
        if (website.customDomain) {
          try {
            await hestia.deleteDomainAlias(
              customer.hestiaUsername,
              website.subdomain,
              website.customDomain,
            );
          } catch (hestiaError) {
            console.error("HestiaCP remove alias error:", hestiaError);
          }
        }
        updateData.customDomain = null;
      }
    }

    // Update database
    if (Object.keys(updateData).length > 0) {
      await prisma.website.update({
        where: { id: params.id },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Website updated successfully",
      data: {
        ...website,
        ...updateData,
      },
    });
  } catch (error: any) {
    console.error("Error updating website:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/websites/[id] - Delete website
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
      include: {
        websites: {
          where: { id: params.id },
        },
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
        { success: false, error: "Website not found or not owned by you" },
        { status: 404 },
      );
    }

    // Delete domain in HestiaCP
    const hestia = getHestiaAPI();
    try {
      await hestia.deleteDomain(customer.hestiaUsername, website.subdomain);
    } catch (hestiaError) {
      console.error("HestiaCP delete domain error:", hestiaError);
    }

    // Delete from database
    await prisma.website.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Website deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting website:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

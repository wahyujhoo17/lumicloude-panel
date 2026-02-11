import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/customers/[id]
 * Get customer details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // Authorization: if caller is a USER ensure they only fetch their own customer record
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("@/lib/auth-config");
    const session = await getServerSession(authOptions as any);

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        websites: true,
        databases: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    const sess = session as any;
    if (sess && sess.user && sess.user.role === "USER") {
      if (sess.user.email !== customer.email) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/customers/[id]
 * Update customer
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      company,
      status,
      plan,
      packageId,
      billingCycle,
    } = body;

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(status && { status }),
        ...(plan && { plan }),
        ...(packageId && { packageId }),
        ...(billingCycle && { billingCycle }),
      },
      include: {
        websites: true,
        databases: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "UPDATE_CUSTOMER",
        resource: "customer",
        resourceId: customer.id,
        description: `Updated customer: ${customer.name}`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/customers/[id]
 * Update customer (alias for PATCH)
 */
export async function PUT(
  request: Request,
  context: { params: { id: string } },
) {
  return PATCH(request, context);
}

/**
 * DELETE /api/customers/[id]
 * Delete customer (with cascading deletes)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: { websites: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 },
      );
    }

    // Delete from Hestia if customer has Hestia username
    if (customer.hestiaUsername) {
      console.log(
        `[DELETE CUSTOMER] Attempting to delete Hestia user: ${customer.hestiaUsername}`,
      );

      const { HestiaAPI } = await import("@/lib/hestia-api");
      const hestiaConfig = {
        host: process.env.HESTIA_HOST || "",
        port: process.env.HESTIA_PORT || "8083",
        user: process.env.HESTIA_USER || "admin",
        password: process.env.HESTIA_PASSWORD,
      };

      console.log(
        `[DELETE CUSTOMER] Hestia Config: ${hestiaConfig.host}:${hestiaConfig.port}, user: ${hestiaConfig.user}`,
      );

      const hestia = new HestiaAPI(hestiaConfig);
      const deleteResult = await hestia.deleteUser(customer.hestiaUsername);

      console.log(`[DELETE CUSTOMER] Hestia delete result:`, deleteResult);

      if (!deleteResult.success) {
        // Return error instead of just logging
        return NextResponse.json(
          {
            success: false,
            error: `Failed to delete user from Hestia: ${deleteResult.error || "Unknown error"}`,
            hestiaResponse: deleteResult,
          },
          { status: 500 },
        );
      }

      console.log(
        `[DELETE CUSTOMER] Successfully deleted from Hestia: ${customer.hestiaUsername}`,
      );
    }

    // Delete from database (cascades to websites & databases)
    await prisma.customer.delete({
      where: { id: params.id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "DELETE_CUSTOMER",
        resource: "customer",
        resourceId: params.id,
        description: `Deleted customer: ${customer.name}`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

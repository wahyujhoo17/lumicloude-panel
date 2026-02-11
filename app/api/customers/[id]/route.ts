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
    const { name, email, phone, company, status, plan } = body;

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(status && { status }),
        ...(plan && {
          plan,
        }),
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

    // TODO: Delete from Hestia
    // const hestia = getHestiaAPI();
    // await hestia.deleteUser(customer.hestiaUsername);

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

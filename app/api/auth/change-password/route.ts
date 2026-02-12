import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getHestiaAPI } from "@/lib/hestia-api";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        customers: {
          where: {
            createdBy: session.user.id,
            status: "ACTIVE",
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // If user has customers with Hestia accounts, update their passwords too
    const hestiaUpdatePromises = [];
    const hestiaAPI = getHestiaAPI();

    for (const customer of user.customers) {
      if (customer.hestiaUsername) {
        hestiaUpdatePromises.push(
          hestiaAPI
            .updateUserPassword(customer.hestiaUsername, newPassword)
            .then(() => ({ success: true, username: customer.hestiaUsername }))
            .catch((error) => ({
              success: false,
              username: customer.hestiaUsername,
              error: error.message,
            })),
        );
      }
    }

    // Execute all Hestia updates
    const hestiaResults = await Promise.all(hestiaUpdatePromises);
    const failedHestiaUpdates = hestiaResults.filter(
      (result) => !result.success,
    );

    // If any Hestia updates failed, don't update database
    if (failedHestiaUpdates.length > 0) {
      return NextResponse.json(
        {
          error:
            "Failed to update password in Hestia for some accounts. Please try again.",
          details: failedHestiaUpdates,
        },
        { status: 500 },
      );
    }

    // Update database password only if all Hestia updates succeeded
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Also update customer passwords in database
    if (user.customers.length > 0) {
      await prisma.customer.updateMany({
        where: {
          createdBy: user.id,
          status: "ACTIVE",
        },
        data: {
          hestiaPassword: newPassword,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Password updated successfully in both panel and hosting accounts.",
      hestiaUpdated: hestiaResults.length,
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

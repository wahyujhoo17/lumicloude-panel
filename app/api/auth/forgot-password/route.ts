import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getEmailService } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    console.log("[Forgot Password] Request received for email:", email);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();

    // Find user in both User and Customer tables
    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    const customer = await prisma.customer.findUnique({
      where: { email: lowerEmail },
    });

    console.log("[Forgot Password] User found:", user ? "Yes" : "No");
    console.log("[Forgot Password] Customer found:", customer ? "Yes" : "No");

    // If neither user nor customer exists
    if (!user && !customer) {
      return NextResponse.json(
        {
          error:
            "Email tidak terdaftar dalam sistem. Pastikan email yang Anda masukkan benar.",
        },
        { status: 404 },
      );
    }

    // If customer exists but no user record, create/update user record first
    let targetUser = user;
    if (!user && customer) {
      console.log("[Forgot Password] Creating user record for customer");
      const randomPass = Math.random().toString(36) + Date.now();
      const { hash } = await import("bcryptjs");
      const hashed = await hash(randomPass, 10);

      targetUser = await prisma.user.upsert({
        where: { email: lowerEmail },
        update: {
          name: customer.name || lowerEmail,
        },
        create: {
          email: lowerEmail,
          name: customer.name || lowerEmail,
          password: hashed,
          role: "USER",
        },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Terjadi kesalahan sistem. Silakan coba lagi." },
        { status: 500 },
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    console.log("[Forgot Password] Reset token generated");

    // Save reset token to database
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    console.log("[Forgot Password] Token saved to database");

    // Send reset email
    const emailService = getEmailService();
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    console.log("[Forgot Password] Reset link:", resetLink);
    console.log("[Forgot Password] Sending email to:", targetUser.email);

    const emailSent = await emailService.sendForgotPassword({
      to: targetUser.email,
      name: targetUser.name || customer?.name || "User",
      resetLink,
    });

    console.log("[Forgot Password] Email sent status:", emailSent);

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send reset email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getEmailService, generateOTP, getOTPExpiry } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const lowerEmail = email.toLowerCase();

    // Find user in both User and Customer tables
    let user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    const customer = await prisma.customer.findUnique({
      where: { email: lowerEmail },
    });

    // If no user found, check if customer exists
    if (!user && !customer) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // If customer exists but no user record, create user record
    if (!user && customer && customer.hestiaUsername) {
      // Check customer password
      const isStoredPasswordHashed = customer.hestiaPassword.startsWith("$2");
      const isPasswordValid = isStoredPasswordHashed
        ? await bcrypt.compare(password, customer.hestiaPassword)
        : password === customer.hestiaPassword;

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      // Create user record for customer
      const randomPass = Math.random().toString(36) + Date.now();
      const hashedPassword = await bcrypt.hash(randomPass, 10);

      user = await prisma.user.create({
        data: {
          email: lowerEmail,
          name: customer.name || lowerEmail,
          password: hashedPassword,
          role: "USER",
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check password (for existing users)
    if (!customer) {
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }
    }

    // Check if too many OTP attempts (max 5 per hour)
    if (user.otpAttempts && user.otpAttempts >= 5) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (user.updatedAt > oneHourAgo) {
        return NextResponse.json(
          { error: "Too many OTP attempts. Please try again later." },
          { status: 429 },
        );
      }
      // Reset attempts if more than 1 hour has passed
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: 0 },
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Save OTP to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiry,
        otpAttempts: (user.otpAttempts || 0) + 1,
      },
    });

    // Send OTP email
    const emailService = getEmailService();
    const emailSent = await emailService.sendLoginOTP({
      to: user.email,
      name: user.name || "User",
      otp: otpCode,
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
      email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email for security
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

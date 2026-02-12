import { NextRequest, NextResponse } from "next/server";
import { signIn } from "next-auth/react";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 },
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if OTP exists
    if (!user.otpCode || !user.otpExpiry) {
      return NextResponse.json(
        { error: "No OTP found. Please request a new one." },
        { status: 400 },
      );
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiry) {
      // Clear expired OTP
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: null,
          otpExpiry: null,
        },
      });

      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Check if OTP is correct
    if (user.otpCode !== otp.trim()) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 },
      );
    }

    // OTP is valid, clear it from database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiry: null,
        otpAttempts: 0, // Reset attempts on successful verification
      },
    });

    // Return success with user info for client-side login
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

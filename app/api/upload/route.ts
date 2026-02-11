import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "general"; // logo, image, customer, etc

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only images are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;

    // Determine upload path based on type
    let uploadDir = "";
    switch (type) {
      case "logo":
        uploadDir = join(process.cwd(), "public", "logos");
        break;
      case "customer":
        uploadDir = join(process.cwd(), "public", "uploads", "customers");
        break;
      default:
        uploadDir = join(process.cwd(), "public", "uploads");
    }

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/${type === "logo" ? "logos" : type === "customer" ? "uploads/customers" : "uploads"}/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        filename,
        url: publicUrl,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// Optional: GET endpoint to list uploaded files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "general";

    // This is a basic implementation
    // You might want to use fs.readdir to list files
    return NextResponse.json({
      success: true,
      message: "Use POST to upload files",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

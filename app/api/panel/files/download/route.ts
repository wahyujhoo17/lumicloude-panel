import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createHestiaFileManager } from "@/lib/hestia-file-manager";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * Helper function to get domain from website
 * For HestiaCP file operations, always use subdomain as that's the primary domain
 */
function getWebsiteDomain(website: any): string {
  return website.subdomain;
}

/**
 * Helper function to get the base directory for file operations
 */
function getBaseDirectory(username: string, domain: string): string {
  const hestiaDir = join("/home", username, "web", domain, "public_html");

  if (existsSync(hestiaDir)) {
    return hestiaDir;
  }

  const localDir = join(
    process.cwd(),
    "public",
    "uploads",
    "customers",
    username,
    domain,
  );

  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  return localDir;
}

/**
 * GET /api/panel/files/download - Download file from HestiaCP via SFTP
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { success: false, error: "Path is required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
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

    // Create HestiaCP File Manager using SFTP
    const fileManager = createHestiaFileManager(
      customer.hestiaUsername,
      customer.hestiaPassword,
    );

    try {
      const domain = getWebsiteDomain(website);
      const baseDir = `/home/${customer.hestiaUsername}/web/${domain}/public_html`;
      const filePath = `${baseDir}/${path}`;

      console.log("SFTP Download:", filePath);

      // Download file via SFTP
      const fileBuffer = await fileManager.readFile(filePath);
      fileManager.disconnect();

      const fileName = path.split("/").pop() || "download";

      // Determine content type based on file extension
      const ext = fileName.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        txt: "text/plain",
        html: "text/html",
        css: "text/css",
        js: "application/javascript",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        pdf: "application/pdf",
        zip: "application/zip",
        xml: "application/xml",
      };

      const contentType = contentTypes[ext || ""] || "application/octet-stream";

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    } catch (sftpError: any) {
      console.error("SFTP Download Error:", sftpError.message);
      fileManager.disconnect();

      // Fallback to local filesystem
      console.warn("Falling back to local filesystem for download");
      const domain = getWebsiteDomain(website);
      const baseDir = getBaseDirectory(customer.hestiaUsername, domain);
      const filePath = join(baseDir, path);
      const fileBuffer = await readFile(filePath);
      const fileName = path.split("/").pop() || "download";

      const ext = fileName.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        txt: "text/plain",
        html: "text/html",
        css: "text/css",
        js: "application/javascript",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        pdf: "application/pdf",
        zip: "application/zip",
        xml: "application/xml",
      };

      const contentType = contentTypes[ext || ""] || "application/octet-stream";

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    }
  } catch (error: any) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

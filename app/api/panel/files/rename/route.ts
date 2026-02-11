import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Client } from "ssh2";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { oldPath, newName, isDirectory } = await request.json();

    if (!oldPath || !newName) {
      return NextResponse.json(
        { error: "Old path and new name are required" },
        { status: 400 },
      );
    }

    // Get customer info using email with websites
    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
      include: {
        websites: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Get first website domain for the customer
    const website = customer.websites[0];
    if (!website) {
      return NextResponse.json(
        { error: "No website found for this customer" },
        { status: 404 },
      );
    }

    // Determine base path using website subdomain
    const domain = website.subdomain;
    const basePath = `/home/${customer.hestiaUsername}/web/${domain}/public_html`;

    // Build full paths - oldPath is relative, we need to combine with basePath
    const fullOldPath = oldPath ? `${basePath}/${oldPath}` : basePath;

    // Calculate new path - keep the directory path, just change the filename
    const pathParts = fullOldPath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const fullNewPath = pathParts.join("/");

    console.log("Rename operation:", { fullOldPath, fullNewPath });

    return new Promise<NextResponse>((resolve) => {
      const conn = new Client();

      conn.on("ready", () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            resolve(
              NextResponse.json(
                { error: "Failed to start SFTP session" },
                { status: 500 },
              ),
            );
            return;
          }

          sftp.rename(fullOldPath, fullNewPath, (err) => {
            conn.end();

            if (err) {
              resolve(
                NextResponse.json(
                  { error: `Failed to rename: ${err.message}` },
                  { status: 500 },
                ),
              );
              return;
            }

            resolve(
              NextResponse.json({
                success: true,
                message: `${isDirectory ? "Folder" : "File"} renamed successfully`,
              }),
            );
          });
        });
      });

      conn.on("error", (err) => {
        resolve(
          NextResponse.json(
            { error: `Connection failed: ${err.message}` },
            { status: 500 },
          ),
        );
      });

      conn.connect({
        host: process.env.HESTIA_HOST || "194.238.27.251",
        port: 22,
        username: customer.hestiaUsername,
        password: customer.hestiaPassword || "",
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

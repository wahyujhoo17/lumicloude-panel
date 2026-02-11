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

    // Get customer info using email
    const customer = await prisma.customer.findUnique({
      where: { email: user.email || "" },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Determine base path
    const subdomain = customer.hestiaUsername.substring(4); // Remove 'cust' prefix
    const basePath = `/home/${customer.hestiaUsername}/web/${subdomain}.lumicloude.my.id/public_html`;

    // Calculate new path - keep the directory path, just change the filename
    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join("/");

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

          sftp.rename(oldPath, newPath, (err) => {
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

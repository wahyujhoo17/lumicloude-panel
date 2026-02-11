import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createHestiaFileManager } from "@/lib/hestia-file-manager";
import {
  writeFile,
  readdir,
  unlink,
  stat,
  readFile,
  rename,
  mkdir,
} from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync, createReadStream } from "fs";
import AdmZip from "adm-zip";

/**
 * Helper function to get domain from website
 * For HestiaCP file operations, always use subdomain as that's the primary domain
 */
function getWebsiteDomain(website: any): string {
  return website.subdomain;
}

/**
 * Helper function to get the base directory for file operations
 * Tries HestiaCP directory first, falls back to local directory if not accessible
 */
function getBaseDirectory(username: string, domain: string): string {
  if (!domain) {
    throw new Error("Domain is required");
  }

  // Try HestiaCP directory first
  const hestiaDir = join("/home", username, "web", domain, "public_html");

  if (existsSync(hestiaDir)) {
    console.log("Using HestiaCP directory:", hestiaDir);
    return hestiaDir;
  }

  // Fallback to local directory
  console.warn(`HestiaCP directory not accessible: ${hestiaDir}`);
  console.warn("Falling back to local directory");

  const localDir = join(
    process.cwd(),
    "public",
    "uploads",
    "customers",
    username,
    domain,
  );

  // Create local directory if it doesn't exist
  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
    console.log("Created fallback directory:", localDir);
  }

  console.log("Using fallback directory:", localDir);
  return localDir;
}

/**
 * GET /api/panel/files - List files in directory OR read file content
 * Now uses SFTP to access HestiaCP files directly
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";
    const action = searchParams.get("action");

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

    // Get first website domain for the customer
    const website = customer.websites[0];
    if (!website) {
      return NextResponse.json(
        { success: false, error: "No website found for this customer" },
        { status: 404 },
      );
    }

    // Create HestiaCP File Manager using SFTP
    const fileManager = createHestiaFileManager(
      customer.hestiaUsername,
      customer.hestiaPassword,
    );

    try {
      // Base directory in HestiaCP
      const domain = getWebsiteDomain(website);
      const baseDir = `/home/${customer.hestiaUsername}/web/${domain}/public_html`;
      const fullPath = path ? `${baseDir}/${path}` : baseDir;

      console.log("SFTP File Manager - Accessing:", fullPath);

      // If action is read, return file content
      if (action === "read") {
        const content = await fileManager.readFile(fullPath);
        fileManager.disconnect();
        return NextResponse.json({
          success: true,
          content: content.toString("utf-8"),
          path,
        });
      }

      // List files in directory
      const files = await fileManager.listFiles(fullPath);
      fileManager.disconnect();

      return NextResponse.json({
        success: true,
        data: {
          currentPath: path,
          files: files.map((f) => ({
            name: f.name,
            isDirectory: f.isDirectory,
            size: f.size,
            modified: f.modified,
            path: path ? `${path}/${f.name}` : f.name,
          })),
          method: "sftp", // Indicate we're using SFTP
        },
      });
    } catch (sftpError: any) {
      console.error("SFTP Error:", sftpError.message);
      fileManager.disconnect();

      // Fallback to local filesystem if SFTP fails
      console.warn("Falling back to local filesystem");
      const domain = getWebsiteDomain(website);
      const baseDir = getBaseDirectory(customer.hestiaUsername, domain);

      if (action === "read") {
        const filePath = join(baseDir, path);
        const content = await readFile(filePath, "utf-8");
        return NextResponse.json({
          success: true,
          content,
          path,
        });
      }

      const targetDir = join(baseDir, path);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const localFiles = await readdir(targetDir, { withFileTypes: true });
      const fileList = await Promise.all(
        localFiles.map(async (file) => {
          const filePath = join(targetDir, file.name);
          const stats = await stat(filePath);
          return {
            name: file.name,
            isDirectory: file.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            path: join(path, file.name),
          };
        }),
      );

      return NextResponse.json({
        success: true,
        data: {
          currentPath: path,
          files: fileList,
          method: "local", // Indicate we're using local filesystem
        },
      });
    }
  } catch (error: any) {
    console.error("Error in file operation:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/panel/files - Upload file via SFTP
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = (formData.get("path") as string) || "";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
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
      const filePath = path
        ? `${baseDir}/${path}/${file.name}`
        : `${baseDir}/${file.name}`;

      console.log("SFTP Upload to:", filePath);

      // Read file content
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload via SFTP
      await fileManager.writeFile(filePath, buffer);
      fileManager.disconnect();

      return NextResponse.json({
        success: true,
        data: {
          fileName: file.name,
          size: file.size,
          path: path ? `${path}/${file.name}` : file.name,
          method: "sftp",
        },
      });
    } catch (sftpError: any) {
      console.error("SFTP Upload Error:", sftpError.message);
      fileManager.disconnect();

      // Fallback to local filesystem
      console.warn("Falling back to local filesystem for upload");
      const domain = getWebsiteDomain(website);
      const baseDir = getBaseDirectory(customer.hestiaUsername, domain);
      const targetDir = join(baseDir, path);

      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const localFilePath = join(targetDir, file.name);

      await writeFile(localFilePath, buffer);

      return NextResponse.json({
        success: true,
        data: {
          fileName: file.name,
          size: file.size,
          path: join(path, file.name),
          method: "local",
        },
      });
    }
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/panel/files - Update file, extract zip, rename, or create folder via SFTP
 */
export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { action, path, content, newPath, folderName } = body;

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

      // Update file content
      if (action === "update" && path && content !== undefined) {
        const filePath = `${baseDir}/${path}`;
        await fileManager.writeFile(filePath, content);
        fileManager.disconnect();
        return NextResponse.json({
          success: true,
          message: "File updated successfully",
          method: "sftp",
        });
      }

      // Extract ZIP file (download, extract locally, upload back)
      if (action === "extract" && path) {
        const zipPath = `${baseDir}/${path}`;
        console.log("Extracting ZIP via SFTP:", zipPath);

        // Download ZIP file
        const zipBuffer = await fileManager.readFile(zipPath);

        // Save to temporary file first (AdmZip works better with file path)
        const tmpDir = join(process.cwd(), "tmp");
        if (!existsSync(tmpDir)) {
          mkdirSync(tmpDir, { recursive: true });
        }
        const tmpZipPath = join(tmpDir, `extract_${Date.now()}.zip`);
        await writeFile(tmpZipPath, zipBuffer);

        // Extract locally
        const zip = new AdmZip(tmpZipPath);
        const zipEntries = zip.getEntries();

        // Get parent directory of the zip file
        const parentDir = path.substring(0, path.lastIndexOf("/"));
        const targetBaseDir = parentDir ? `${baseDir}/${parentDir}` : baseDir;

        // Upload each extracted file back to HestiaCP
        for (const entry of zipEntries) {
          if (!entry.isDirectory) {
            const targetPath = `${targetBaseDir}/${entry.entryName}`;
            console.log("Uploading extracted file:", targetPath);

            // Create directory if needed (now recursive)
            const dirPath = targetPath.substring(
              0,
              targetPath.lastIndexOf("/"),
            );
            try {
              await fileManager.createDirectory(dirPath);
            } catch (e) {
              console.error("Error creating directory:", e);
            }

            await fileManager.writeFile(targetPath, entry.getData());
          }
        }

        // Clean up temporary file
        try {
          await unlink(tmpZipPath);
        } catch (e) {
          console.warn("Failed to delete temporary zip file:", e);
        }

        fileManager.disconnect();
        return NextResponse.json({
          success: true,
          message: "ZIP file extracted successfully",
          method: "sftp",
        });
      }

      // Rename file or folder
      if (action === "rename" && path && newPath) {
        const oldPath = `${baseDir}/${path}`;
        const newFullPath = `${baseDir}/${newPath}`;
        await fileManager.rename(oldPath, newFullPath);
        fileManager.disconnect();
        return NextResponse.json({
          success: true,
          message: "Renamed successfully",
          method: "sftp",
        });
      }

      // Create folder
      if (action === "mkdir" && path) {
        const folderPath = `${baseDir}/${path}`;
        await fileManager.createDirectory(folderPath);
        fileManager.disconnect();
        return NextResponse.json({
          success: true,
          message: "Folder created successfully",
          method: "sftp",
        });
      }

      // Create new file
      if (action === "create" && path) {
        const filePath = `${baseDir}/${path}`;
        await fileManager.writeFile(filePath, "");
        fileManager.disconnect();
        return NextResponse.json({
          success: true,
          message: "File created successfully",
          method: "sftp",
        });
      }

      fileManager.disconnect();
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    } catch (sftpError: any) {
      console.error("SFTP Operation Error:", sftpError.message);
      fileManager.disconnect();

      // Fallback to local filesystem
      console.warn("Falling back to local filesystem for operation");
      const domain = getWebsiteDomain(website);
      const baseDir = getBaseDirectory(customer.hestiaUsername, domain);

      // Update file content
      if (action === "update" && path && content !== undefined) {
        const filePath = join(baseDir, path);
        await writeFile(filePath, content, "utf-8");
        return NextResponse.json({
          success: true,
          message: "File updated successfully",
          method: "local",
        });
      }

      // Extract ZIP file
      if (action === "extract" && path) {
        const zipPath = join(baseDir, path);
        const extractDir = join(baseDir, path.replace(/\.zip$/i, ""));
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);
        return NextResponse.json({
          success: true,
          message: "ZIP file extracted successfully",
          method: "local",
        });
      }

      // Rename file or folder
      if (action === "rename" && path && newPath) {
        const oldPath = join(baseDir, path);
        const newFullPath = join(baseDir, newPath);
        await rename(oldPath, newFullPath);
        return NextResponse.json({
          success: true,
          message: "Renamed successfully",
          method: "local",
        });
      }

      // Create folder
      if (action === "mkdir" && path) {
        const folderPath = join(baseDir, path);
        await mkdir(folderPath, { recursive: true });
        return NextResponse.json({
          success: true,
          message: "Folder created successfully",
          method: "local",
        });
      }

      // Create new file
      if (action === "create" && path) {
        const filePath = join(baseDir, path);
        await writeFile(filePath, "", "utf-8");
        return NextResponse.json({
          success: true,
          message: "File created successfully",
          method: "local",
        });
      }

      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/panel/files - Delete file via SFTP
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const isDirectory = searchParams.get("isDirectory") === "true";

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
      const targetPath = `${baseDir}/${path}`;

      console.log("SFTP Delete:", targetPath);

      await fileManager.delete(targetPath, isDirectory);
      fileManager.disconnect();

      return NextResponse.json({
        success: true,
        message: "File deleted successfully",
        method: "sftp",
      });
    } catch (sftpError: any) {
      console.error("SFTP Delete Error:", sftpError.message);
      fileManager.disconnect();

      // Fallback to local filesystem
      console.warn("Falling back to local filesystem for delete");
      const domain = getWebsiteDomain(website);
      const baseDir = getBaseDirectory(customer.hestiaUsername, domain);
      const targetPath = join(baseDir, path);

      await unlink(targetPath);

      return NextResponse.json({
        success: true,
        message: "File deleted successfully",
        method: "local",
      });
    }
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getHestiaAPI } from "@/lib/hestia-api";
import { getAAPanelAPI } from "@/lib/aapanel-api";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getPackage } from "@/lib/packages";

const createCustomerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  customDomain: z.string().optional(),
  packageId: z.enum(["starter", "business", "enterprise"]).default("starter"),
  phpVersion: z.string().default("8.1"),
  needDatabase: z.boolean().default(false),
});

/**
 * POST /api/customers/create
 * Create new customer with full automation
 */
export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    // Get package details
    const selectedPackage = getPackage(data.packageId);
    if (!selectedPackage) {
      throw new Error("Invalid package selected");
    }

    const hestia = getHestiaAPI();
    const aapanel = getAAPanelAPI();

    // Step 1: Generate unique credentials
    const hestiaUsername = hestia.generateUsername(data.email, "cust");
    const hestiaPassword = hestia.generatePassword(16);
    const subdomain = hestia.formatSubdomain(
      data.name,
      process.env.PRIMARY_DOMAIN,
    );

    console.log("Creating customer:", {
      name: data.name,
      subdomain,
      hestiaUsername,
      package: selectedPackage.name,
    });

    // Step 2: Create Hestia user account
    const userResult = await hestia.createUser({
      username: hestiaUsername,
      password: hestiaPassword,
      email: data.email,
      package: selectedPackage.hestiaPackageName, // Use package name from HestiaCP
      fname: data.name.split(" ")[0],
      lname: data.name.split(" ").slice(1).join(" "),
    });

    if (!userResult.success) {
      throw new Error(`Failed to create Hestia user: ${userResult.error}`);
    }

    // Step 3: Create website/domain in Hestia
    const aliases = [
      `www.${subdomain}`,
      ...(data.customDomain
        ? [data.customDomain, `www.${data.customDomain}`]
        : []),
    ];

    const domainResult = await hestia.addDomain({
      user: hestiaUsername,
      domain: subdomain,
      aliases: aliases,
      restart: true,
    });

    if (!domainResult.success) {
      // Rollback: delete user if domain creation fails
      await hestia.deleteUser(hestiaUsername);
      throw new Error(`Failed to create domain: ${domainResult.error}`);
    }

    // Step 4: Enable SSL certificate (Let's Encrypt)
    const sslResult = await hestia.enableSSL(hestiaUsername, subdomain);
    const sslEnabled = sslResult.success;

    if (sslEnabled) {
      // Force SSL redirect
      await hestia.forceSSL(hestiaUsername, subdomain);
    }

    // Step 5: Create DNS A record in aaPanel
    const subdomainPrefix = subdomain.replace(
      `.${process.env.PRIMARY_DOMAIN}`,
      "",
    );
    const dnsResult = await aapanel.addSubdomainARecord({
      primaryDomain: process.env.PRIMARY_DOMAIN || "lumicloude.my.id",
      subdomain: subdomainPrefix,
      ip: process.env.CLOUDFLARE_EDGE_IP || "198.41.192.67",
      ttl: 600,
    });

    if (!dnsResult.success) {
      console.warn("DNS creation failed:", dnsResult.error);
      // Don't rollback, DNS can be added manually
    }

    // Step 6: Create database if needed
    let database = null;
    if (data.needDatabase) {
      const dbName = `${hestiaUsername}_db`;
      const dbUser = `${hestiaUsername}_user`;
      const dbPassword = hestia.generatePassword(16);

      const dbResult = await hestia.createDatabase({
        user: hestiaUsername,
        database: dbName,
        dbuser: dbUser,
        dbpass: dbPassword,
        charset: "utf8mb4",
      });

      if (dbResult.success) {
        database = {
          name: dbName,
          username: dbUser,
          password: dbPassword,
          host: "localhost",
          port: 3306,
        };
      }
    }

    // Step 7: Save to database
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        hestiaUsername,
        hestiaPassword,
        packageId: data.packageId,
        plan: "BASIC", // Keep for compatibility, but use packageId
        status: "ACTIVE",
        monthlyPrice: 0,
        billingCycle: "MONTHLY",
        nextBillingDate: getNextBillingDate(),
        createdBy: currentUser.id,
        websites: {
          create: {
            subdomain,
            customDomain: data.customDomain,
            aliases: aliases,
            ipAddress: process.env.CLOUDFLARE_EDGE_IP || "198.41.192.67",
            sslEnabled,
            sslForce: sslEnabled,
            phpVersion: data.phpVersion,
            status: sslEnabled ? "ACTIVE" : "SSL_PENDING",
            dnsVerified: dnsResult.success,
            sslVerified: sslEnabled,
          },
        },
        ...(database && {
          databases: {
            create: {
              name: database.name,
              username: database.username,
              password: database.password,
              host: database.host,
              port: database.port,
              charset: "utf8mb4",
            },
          },
        }),
      },
      include: {
        websites: true,
        databases: true,
      },
    });

    // Step 8: Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE_CUSTOMER",
        resource: "customer",
        resourceId: customer.id,
        description: `Created customer: ${data.name} (${subdomain}) - Package: ${selectedPackage.name}`,
        status: "SUCCESS",
        metadata: {
          subdomain,
          hestiaUsername,
          sslEnabled,
          dnsCreated: dnsResult.success,
          package: selectedPackage.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          subdomain,
          customDomain: data.customDomain,
          package: selectedPackage.name,
        },
        credentials: {
          hestiaUsername,
          hestiaPassword,
          hestiaUrl: `https://${process.env.HESTIA_HOST}:${process.env.HESTIA_PORT}`,
        },
        website: {
          url: `https://${subdomain}`,
          status: sslEnabled ? "active" : "ssl_pending",
          sslEnabled,
        },
        database: database || null,
        resourceLimits: {
          diskSpace: `${selectedPackage.diskSpace} MB`,
          bandwidth:
            selectedPackage.bandwidth === 0
              ? "Unlimited"
              : `${selectedPackage.bandwidth} GB`,
          websites:
            selectedPackage.websites === 0
              ? "Unlimited"
              : selectedPackage.websites,
          databases:
            selectedPackage.databases === 0
              ? "Unlimited"
              : selectedPackage.databases,
        },
        nextSteps: data.customDomain
          ? [
              "Customer needs to add CNAME record:",
              `Type: CNAME`,
              `Name: www`,
              `Value: ${subdomain}`,
              `TTL: 3600`,
            ]
          : ["Website is ready at " + subdomain],
      },
    });
  } catch (error: any) {
    console.error("Error creating customer:", error);

    // Log failed attempt
    await prisma.activityLog.create({
      data: {
        action: "CREATE_CUSTOMER",
        resource: "customer",
        description: "Failed to create customer",
        status: "FAILED",
        error: error.message,
      },
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// Helper function
function getNextBillingDate(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

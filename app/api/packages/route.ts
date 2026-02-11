import { NextResponse } from "next/server";
import { getHestiaAPI } from "@/lib/hestia-api";
import { requireAuth } from "@/lib/auth";
import { PACKAGES } from "@/lib/packages";

/**
 * GET /api/packages
 * List all packages - try HestiaCP first, fallback to defaults if needed
 */
export async function GET() {
  try {
    await requireAuth();

    const hestia = getHestiaAPI();
    const result = await hestia.listPackages();

    // Check if HestiaCP API returns forbidden (returncode 10) or fails
    if (!result.success || !result.data || result.returncode === 10) {
      console.warn(
        "HestiaCP packages not accessible (returncode:",
        result.returncode,
        "), using default packages",
      );

      // Return our hardcoded packages as fallback
      return NextResponse.json({
        success: true,
        data: {
          packages: PACKAGES,
          source: "default",
          warning:
            "Using default packages. HestiaCP packages API requires IP whitelisting or proper permissions.",
        },
      });
    }

    // Transform HestiaCP packages to our format
    const packages = Object.entries(result.data || {}).map(([name, pkg]) => ({
      id: name.toLowerCase(),
      name: name,
      hestiaPackageName: name,

      // Resource Limits from HestiaCP
      diskQuota: pkg.disk_quota, // in MB
      bandwidth: pkg.bandwidth, // in MB
      webDomains: parseInt(pkg.web_domains) || 0, // 0 = unlimited
      webAliases: parseInt(pkg.web_aliases) || 0,
      databases: parseInt(pkg.databases) || 0,
      mailAccounts: parseInt(pkg.mail_accounts) || 0,
      cronJobs: parseInt(pkg.cron_jobs) || 0,
      backups: pkg.backups,

      // Additional Info
      dnsTemplates: pkg.dns_templates,
      webTemplates: pkg.web_templates,
      proxyTemplates: pkg.proxy_templates,
    }));

    return NextResponse.json({
      success: true,
      data: {
        packages,
        source: "hestiacp",
      },
    });
  } catch (error: any) {
    console.error("Error fetching packages:", error);

    // Return default packages as fallback on error
    return NextResponse.json({
      success: true,
      data: {
        packages: PACKAGES,
        source: "default",
        warning: "HestiaCP API error, using default packages",
      },
    });
  }
}

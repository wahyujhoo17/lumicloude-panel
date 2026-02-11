export interface Package {
  id: string;
  name: string;
  hestiaPackageName: string; // Package name in HestiaCP
  billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY";

  // Resource Limits
  diskSpace: number; // in MB
  bandwidth: number; // in GB
  websites: number; // 0 = unlimited
  databases: number; // 0 = unlimited
  emailAccounts: number; // 0 = unlimited
  subdomains: number; // 0 = unlimited
  ftpAccounts: number; // 0 = unlimited
  cronJobs: number; // 0 = unlimited
  backups: number; // 0 = unlimited

  // Features
  features: string[];
  sslIncluded: boolean;
  dedicatedIP: boolean;
  priority: "low" | "medium" | "high";
}

export const PACKAGES: Package[] = [
  {
    id: "starter",
    name: "Starter",
    hestiaPackageName: "Starter", // Harus sama dengan package name di HestiaCP
    billingCycle: "MONTHLY",
    diskSpace: 500, // 500 MB
    bandwidth: 0.98, // 0.98 GB
    websites: 1,
    databases: 1,
    emailAccounts: 1,
    subdomains: 5,
    ftpAccounts: 1,
    cronJobs: 1,
    backups: 1,
    features: [
      "500 MB Disk Space",
      "10 GB Bandwidth",
      "1 Website",
      "1 Database",
      "1 Email Account",
      "5 Subdomains",
      "Free SSL Certificate",
      "24/7 Support",
    ],
    sslIncluded: true,
    dedicatedIP: false,
    priority: "low",
  },
  {
    id: "business",
    name: "Business",
    hestiaPackageName: "Business", // Harus sama dengan package name di HestiaCP
    billingCycle: "MONTHLY",
    diskSpace: 2930, // 2.93 GB
    bandwidth: 19.53, // 19.53 GB
    websites: 3,
    databases: 3,
    emailAccounts: 1,
    subdomains: 0, // unlimited
    ftpAccounts: 1,
    cronJobs: 5,
    backups: 3,
    features: [
      "2.93 GB Disk Space",
      "19.53 GB Bandwidth",
      "3 Websites",
      "3 Databases",
      "Unlimited Email Accounts",
      "Unlimited Subdomains",
      "Free SSL Certificate",
      "Priority Support",
      "Weekly Backups",
    ],
    sslIncluded: true,
    dedicatedIP: false,
    priority: "medium",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    hestiaPackageName: "Enterprise", // Harus sama dengan package name di HestiaCP
    billingCycle: "MONTHLY",
    diskSpace: 6840, // 6.84 GB
    bandwidth: 0, // unlimited
    websites: 7,
    databases: 7,
    emailAccounts: 1,
    subdomains: 0, // unlimited
    ftpAccounts: 1,
    cronJobs: 0, // unlimited
    backups: 7,
    features: [
      "6.84 GB Disk Space",
      "Unlimited Bandwidth",
      "7 Websites",
      "7 Databases",
      "Unlimited Email Accounts",
      "Unlimited Subdomains",
      "Free SSL Certificate",
      "Dedicated IP Address",
      "Priority Support 24/7",
      "Daily Backups",
      "Free Migration",
    ],
    sslIncluded: true,
    dedicatedIP: true,
    priority: "high",
  },
];

export function getPackage(packageId: string): Package | undefined {
  return PACKAGES.find((pkg) => pkg.id === packageId);
}

export function formatDiskSpace(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

export function formatBandwidth(gb: number): string {
  if (gb === 0) return "Unlimited";
  return `${gb} GB`;
}

export function formatLimit(limit: number): string {
  if (limit === 0) return "Unlimited";
  return limit.toString();
}

import axios, { AxiosInstance } from "axios";

export interface HestiaConfig {
  host: string;
  port: string;
  user: string;
  // Method 1: Access Key (limited permissions)
  accessKeyId?: string;
  secretKey?: string;
  // Method 2: Password (full admin access)
  password?: string;
}

export interface HestiaResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  returncode?: number;
}

export interface HestiaUser {
  username: string;
  email: string;
  package: string;
  status: string;
  disk_quota: string;
  bandwidth: string;
}

export interface HestiaDomain {
  domain: string;
  ip: string;
  ssl: string;
  ssl_force: string;
  aliases: string[];
  status: string;
}

export interface HestiaDatabase {
  database: string;
  dbuser: string;
  charset: string;
  host: string;
}

export interface HestiaPackage {
  name: string;
  web_templates: string;
  proxy_templates: string;
  dns_templates: string;
  web_domains: string;
  web_aliases: string;
  dns_domains: string;
  dns_records: string;
  mail_domains: string;
  mail_accounts: string;
  databases: string;
  cron_jobs: string;
  disk_quota: string;
  bandwidth: string;
  ns1: string;
  ns2: string;
  backups: string;
  time: string;
  date: string;
}

export class HestiaAPI {
  private client: AxiosInstance;
  private config: HestiaConfig;

  constructor(config: HestiaConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.host}:${config.port}/api/`,
      timeout: 30000,
      httpsAgent: new (require("https").Agent)({
        rejectUnauthorized: false, // For self-signed certificates
      }),
    });
  }

  /**
   * Make a request to HestiaCP API
   * Uses positional args (arg1, arg2, ...) to avoid colliding with auth params (user, password)
   */
  private async request<T = any>(
    command: string,
    args: string[] = [],
    options: { forcePassword?: boolean; returnData?: boolean } = {},
  ): Promise<HestiaResponse<T>> {
    try {
      const { forcePassword = false, returnData = false } = options;

      // Build auth params - these are SEPARATE from command args
      const formParams: Record<string, string> = {
        user: this.config.user,
      };

      // When returnData is true, we skip returncode to get the actual data
      if (!returnData) {
        formParams.returncode = "yes";
      }

      // Always use password for admin panel (full access needed)
      // Access keys have limited permissions and cause 401 on admin commands
      if (this.config.password) {
        formParams.password = this.config.password;
      } else if (this.config.accessKeyId && this.config.secretKey) {
        formParams.access_key = this.config.accessKeyId;
        formParams.secret_key = this.config.secretKey;
      } else {
        throw new Error("No authentication credentials provided");
      }

      // Set command
      formParams.cmd = command;

      // Map positional args to arg1, arg2, arg3, etc.
      // This prevents collision with auth params (user, password)
      args.forEach((arg, i) => {
        formParams[`arg${i + 1}`] = String(arg);
      });

      console.log(`[HestiaAPI] Request command: ${command}, args:`, args);
      console.log(`[HestiaAPI] Form params:`, {
        ...formParams,
        password: formParams.password ? "***" : undefined,
      });

      const formData = new URLSearchParams(formParams);

      const response = await this.client.post("", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // HestiaCP returns different formats, normalize the response
      if (typeof response.data === "string") {
        const trimmed = response.data.trim();

        // If we requested returncode only, parse it
        if (!returnData) {
          const returncode = parseInt(trimmed);
          const success = returncode === 0;

          if (!success) {
            console.error(
              `[HestiaAPI] Command ${command} failed with returncode: ${returncode}`,
            );
          }

          return {
            success,
            returncode,
            data: response.data as T,
          };
        }

        // Otherwise return the raw data
        return {
          success: true,
          data: response.data as T,
        };
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`HestiaCP API Error (${command}):`, error.message);
      if (error.response?.data) {
        console.error(`[HestiaAPI] Response data:`, error.response.data);
      }
      if (error.response?.status) {
        console.error(`[HestiaAPI] Response status:`, error.response.status);
      }
      return {
        success: false,
        error: error.response?.data || error.message,
        returncode: error.response?.status,
      };
    }
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Create a new user account
   * v-add-user USER PASSWORD EMAIL [PACKAGE] [FNAME] [LNAME]
   */
  async createUser(params: {
    username: string;
    password: string;
    email: string;
    package?: string;
    fname?: string;
    lname?: string;
  }): Promise<HestiaResponse> {
    return this.request(
      "v-add-user",
      [
        params.username,
        params.password,
        params.email,
        params.package || "default",
        params.fname || "",
        params.lname || "",
      ],
      { forcePassword: true }, // Admin command requires password auth
    );
  }

  /**
   * Delete a user account
   * v-delete-user USER
   */
  async deleteUser(username: string): Promise<HestiaResponse> {
    console.log(`[HestiaAPI] Deleting user: ${username}`);
    const result = await this.request("v-delete-user", [username], {
      forcePassword: true,
    });
    console.log(
      `[HestiaAPI] Delete user result:`,
      JSON.stringify(result, null, 2),
    );
    return result;
  }

  /**
   * Suspend a user account
   * v-suspend-user USER [RESTART]
   */
  async suspendUser(username: string): Promise<HestiaResponse> {
    return this.request("v-suspend-user", [username, "no"], {
      forcePassword: true,
    });
  }

  /**
   * Unsuspend a user account
   * v-unsuspend-user USER [RESTART]
   */
  async unsuspendUser(username: string): Promise<HestiaResponse> {
    return this.request("v-unsuspend-user", [username, "no"], {
      forcePassword: true,
    });
  }

  /**
   * List all users
   * v-list-users [FORMAT]
   */
  async listUsers(): Promise<HestiaResponse<HestiaUser[]>> {
    return this.request("v-list-users", ["json"]);
  }

  /**
   * Change user password
   * v-change-user-password USER PASSWORD
   */
  async changeUserPassword(
    username: string,
    password: string,
  ): Promise<HestiaResponse> {
    return this.request("v-change-user-password", [username, password], {
      forcePassword: true,
    });
  }

  // ============================================
  // DOMAIN/WEBSITE MANAGEMENT
  // ============================================

  /**
   * Add a new web domain
   * v-add-web-domain USER DOMAIN [IP] [IPVERSION] [RESTART] [ALIASES]
   */
  async addDomain(params: {
    user: string;
    domain: string;
    ip?: string;
    aliases?: string[];
    proxy?: boolean;
    restart?: boolean;
  }): Promise<HestiaResponse> {
    return this.request("v-add-web-domain", [
      params.user,
      params.domain,
      params.ip || "",
      params.restart !== false ? "yes" : "no",
      params.aliases ? params.aliases.join(",") : "",
    ]);
  }

  /**
   * Delete a web domain
   * v-delete-web-domain USER DOMAIN
   */
  async deleteDomain(user: string, domain: string): Promise<HestiaResponse> {
    return this.request("v-delete-web-domain", [user, domain]);
  }

  /**
   * List all domains for a user
   * v-list-web-domains USER [FORMAT]
   */
  async listDomains(user: string): Promise<HestiaResponse<HestiaDomain[]>> {
    return this.request("v-list-web-domains", [user, "json"]);
  }

  /**
   * Add domain aliases
   * v-add-web-domain-alias USER DOMAIN ALIAS [RESTART]
   */
  async addDomainAliases(
    user: string,
    domain: string,
    aliases: string[],
  ): Promise<HestiaResponse> {
    return this.request("v-add-web-domain-alias", [
      user,
      domain,
      aliases.join(","),
      "yes",
    ]);
  }

  /**
   * Add single domain alias
   * v-add-web-domain-alias USER DOMAIN ALIAS [RESTART]
   */
  async addDomainAlias(
    user: string,
    domain: string,
    alias: string,
  ): Promise<HestiaResponse> {
    return this.request("v-add-web-domain-alias", [user, domain, alias, "yes"]);
  }

  /**
   * Delete domain alias
   * v-delete-web-domain-alias USER DOMAIN ALIAS
   */
  async deleteDomainAlias(
    user: string,
    domain: string,
    alias: string,
  ): Promise<HestiaResponse> {
    return this.request("v-delete-web-domain-alias", [user, domain, alias]);
  }

  /**
   * Change PHP version for domain
   * v-change-web-domain-backend-tpl USER DOMAIN TEMPLATE
   */
  async changePhpVersion(
    user: string,
    domain: string,
    phpVersion: string,
  ): Promise<HestiaResponse> {
    // HestiaCP uses template names like "PHP-8.1"
    const template = `PHP-${phpVersion}`;
    return this.request("v-change-web-domain-backend-tpl", [
      user,
      domain,
      template,
    ]);
  }

  /**
   * Enable SSL for domain
   * v-add-letsencrypt-domain USER DOMAIN [ALIASES] [MAIL]
   */
  async enableSSL(user: string, domain: string): Promise<HestiaResponse> {
    return this.request("v-add-letsencrypt-domain", [user, domain, "yes"]);
  }

  /**
   * Force SSL redirect
   * v-add-web-domain-ssl-force USER DOMAIN
   */
  async forceSSL(user: string, domain: string): Promise<HestiaResponse> {
    return this.request("v-add-web-domain-ssl-force", [user, domain]);
  }

  /**
   * Renew SSL certificate
   * v-update-letsencrypt-ssl USER DOMAIN
   */
  async renewSSL(user: string, domain: string): Promise<HestiaResponse> {
    return this.request("v-update-letsencrypt-ssl", [user, domain]);
  }

  /**
   * Change web domain document root (custom directory)
   * v-change-web-domain-docroot USER DOMAIN TARGET_DOMAIN [DIRECTORY]
   * To set custom directory within same domain, use domain name as target and directory path
   */
  async changeDocumentRoot(
    user: string,
    domain: string,
    directory: string,
  ): Promise<HestiaResponse> {
    // To set custom directory within the same domain:
    // v-change-web-domain-docroot user domain domain directory
    return this.request("v-change-web-domain-docroot", [
      user,
      domain,
      domain,
      directory,
    ]);
  }

  /**
   * Reset document root to default (public_html)
   * v-change-web-domain-docroot USER DOMAIN default
   */
  async resetDocumentRoot(
    user: string,
    domain: string,
  ): Promise<HestiaResponse> {
    return this.request("v-change-web-domain-docroot", [
      user,
      domain,
      "default",
    ]);
  }

  // ============================================
  // DATABASE MANAGEMENT
  // ============================================

  /**
   * Create a new database
   * v-add-database USER DATABASE DBUSER DBPASS [TYPE] [HOST] [CHARSET]
   */
  async createDatabase(params: {
    user: string;
    database: string;
    dbuser: string;
    dbpass: string;
    charset?: string;
    host?: string;
  }): Promise<HestiaResponse> {
    return this.request("v-add-database", [
      params.user,
      params.database,
      params.dbuser,
      params.dbpass,
      "mysql",
      params.host || "localhost",
      params.charset || "utf8",
    ]);
  }

  /**
   * Delete a database
   * v-delete-database USER DATABASE
   */
  async deleteDatabase(
    user: string,
    database: string,
  ): Promise<HestiaResponse> {
    return this.request("v-delete-database", [user, database]);
  }

  /**
   * List all databases for a user
   * v-list-databases USER [FORMAT]
   */
  async listDatabases(user: string): Promise<HestiaResponse<HestiaDatabase[]>> {
    return this.request("v-list-databases", [user, "json"]);
  }

  // ============================================
  // DNS MANAGEMENT (if using Hestia DNS)
  // ============================================

  /**
   * Add DNS domain
   * v-add-dns-domain USER DOMAIN IP
   */
  async addDNSDomain(
    user: string,
    domain: string,
    ip: string,
  ): Promise<HestiaResponse> {
    return this.request("v-add-dns-domain", [user, domain, ip]);
  }

  /**
   * Add DNS record
   * v-add-dns-record USER DOMAIN RECORD TYPE VALUE [PRIORITY] [ID] [RESTART] [TTL]
   */
  async addDNSRecord(params: {
    user: string;
    domain: string;
    record: string;
    type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";
    value: string;
    priority?: number;
    ttl?: number;
  }): Promise<HestiaResponse> {
    return this.request("v-add-dns-record", [
      params.user,
      params.domain,
      params.record,
      params.type,
      params.value,
      String(params.priority || ""),
      "", // id (auto)
      "yes", // restart
      String(params.ttl || 600),
    ]);
  }

  /**
   * Delete DNS record
   * v-delete-dns-record USER DOMAIN ID [RESTART]
   */
  async deleteDNSRecord(
    user: string,
    domain: string,
    recordId: number,
  ): Promise<HestiaResponse> {
    return this.request("v-delete-dns-record", [
      user,
      domain,
      String(recordId),
    ]);
  }

  /**
   * List DNS records for a domain
   * v-list-dns-records USER DOMAIN [FORMAT]
   */
  async listDNSRecords(
    user: string,
    domain: string,
    format: string = "json",
  ): Promise<HestiaResponse> {
    return this.request("v-list-dns-records", [user, domain, format]);
  }

  // ============================================
  // MAIL MANAGEMENT
  // ============================================

  /**
   * List mail accounts for a domain
   * v-list-mail-accounts USER DOMAIN [FORMAT]
   */
  async listMailAccounts(
    user: string,
    domain: string,
    format: string = "json",
  ): Promise<HestiaResponse> {
    return this.request("v-list-mail-accounts", [user, domain, format]);
  }

  /**
   * Add mail account
   * v-add-mail-account USER DOMAIN ACCOUNT PASSWORD [QUOTA]
   */
  async addMailAccount(params: {
    user: string;
    domain: string;
    account: string;
    password: string;
    quota?: string;
  }): Promise<HestiaResponse> {
    return this.request("v-add-mail-account", [
      params.user,
      params.domain,
      params.account,
      params.password,
      params.quota || "unlimited",
    ]);
  }

  /**
   * Delete mail account
   * v-delete-mail-account USER DOMAIN ACCOUNT
   */
  async deleteMailAccount(
    user: string,
    domain: string,
    account: string,
  ): Promise<HestiaResponse> {
    return this.request("v-delete-mail-account", [user, domain, account]);
  }

  // ============================================
  // BACKUP MANAGEMENT
  // ============================================

  /**
   * Backup user
   * v-backup-user USER
   */
  async backupUser(username: string): Promise<HestiaResponse> {
    return this.request("v-backup-user", [username]);
  }

  /**
   * Restore user backup
   * v-restore-user USER BACKUP
   */
  async restoreUser(username: string, backup: string): Promise<HestiaResponse> {
    return this.request("v-restore-user", [username, backup]);
  }

  /**
   * List backups
   * v-list-user-backups USER [FORMAT]
   */
  async listBackups(username: string): Promise<HestiaResponse> {
    return this.request("v-list-user-backups", [username, "json"]);
  }

  // ============================================
  // STATISTICS & MONITORING
  // ============================================

  /**
   * Get user statistics
   * v-list-user-stats USER [FORMAT]
   */
  async getUserStats(username: string): Promise<HestiaResponse> {
    return this.request("v-list-user-stats", [username, "json"]);
  }

  /**
   * Get system info
   * v-list-sys-info [FORMAT]
   */
  async getSystemInfo(): Promise<HestiaResponse> {
    return this.request("v-list-sys-info", ["json"]);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Test connection to HestiaCP
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.request("v-list-sys-info");
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique username from email or name
   */
  generateUsername(email: string, prefix: string = "user"): string {
    const base = email
      .split("@")[0]
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}${base}${random}`.substring(0, 16);
  }

  /**
   * List all packages
   * v-list-user-packages [FORMAT]
   */
  async listPackages(): Promise<HestiaResponse<Record<string, HestiaPackage>>> {
    try {
      // Request data WITHOUT returncode to get actual package data
      const result = await this.request<string>(
        "v-list-user-packages",
        [], // no positional args needed
        { forcePassword: true, returnData: true },
      );

      if (!result.success || !result.data || typeof result.data !== "string") {
        return { success: false, error: "No data returned", data: {} as any };
      }

      const raw = result.data.trim();

      // Check if it's an error returncode
      if (/^\d+$/.test(raw)) {
        const code = parseInt(raw);
        return {
          success: code === 0,
          returncode: code,
          error: code !== 0 ? `HestiaCP error code: ${code}` : undefined,
          data: {} as any,
        };
      }

      // Parse the table format output from HestiaCP
      const lines = raw.split("\n");
      if (lines.length < 3) {
        return { success: true, data: {} as any };
      }

      // Parse header to get column names
      const header = lines[0].split(/\s{2,}/).map((h) => h.trim());

      // Skip header (line 0) and separator (line 1), parse data lines
      const packages: Record<string, HestiaPackage> = {};

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/\s+/);
        if (parts.length < 7) continue;

        const pkgName = parts[0];
        packages[pkgName] = {
          name: pkgName,
          web_templates: parts[1] || "default",
          proxy_templates: "default",
          dns_templates: "default",
          web_domains: parts[2] || "0",
          web_aliases: "0",
          dns_domains: parts[3] || "0",
          dns_records: "0",
          mail_domains: parts[4] || "0",
          mail_accounts: "0",
          databases: parts[5] || "0",
          cron_jobs: "0",
          disk_quota: parts[7] || "0", // DISK column
          bandwidth: parts.length > 12 ? parts[12] || "unlimited" : "unlimited", // BW column
          ns1: "",
          ns2: "",
          backups: "0",
          time: "",
          date: "",
        };
      }

      return {
        success: true,
        data: packages,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: {} as any,
      };
    }
  }

  /**
   * Get package details
   */
  async getPackage(
    packageName: string,
  ): Promise<HestiaResponse<HestiaPackage>> {
    const result = await this.listPackages();
    if (result.success && result.data) {
      const pkg = result.data[packageName];
      if (pkg) {
        return {
          success: true,
          data: pkg,
        };
      }
      return {
        success: false,
        error: `Package '${packageName}' not found`,
      };
    }
    return {
      success: false,
      error: result.error || "Failed to list packages",
    };
  }

  /**
   * Generate secure password that meets HestiaCP requirements
   * (min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit)
   */
  generatePassword(length: number = 16): string {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const special = "@#%^&*_-+=";
    const all = lower + upper + digits + special;

    // Ensure at least one of each required type
    let password = "";
    password += lower.charAt(Math.floor(Math.random() * lower.length));
    password += upper.charAt(Math.floor(Math.random() * upper.length));
    password += digits.charAt(Math.floor(Math.random() * digits.length));
    password += special.charAt(Math.floor(Math.random() * special.length));

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Format subdomain for lumicloude.my.id
   * Generates unique subdomain with random suffix to prevent duplicates
   */
  formatSubdomain(
    name: string,
    primaryDomain: string = "lumicloude.my.id",
  ): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, "")
      .substring(0, 16);
    const random = Math.random().toString(36).substring(2, 7); // 5 char random
    return `${base}${random}.${primaryDomain}`;
  }
}

// Export singleton instance
let hestiaInstance: HestiaAPI | null = null;

export function getHestiaAPI(): HestiaAPI {
  if (!hestiaInstance) {
    hestiaInstance = new HestiaAPI({
      host: process.env.HESTIA_HOST || "100.86.108.93",
      port: process.env.HESTIA_PORT || "8083",
      user: process.env.HESTIA_USER || "wahyu",
      // Try Access Key first, fallback to password
      accessKeyId: process.env.HESTIA_ACCESS_KEY_ID,
      secretKey: process.env.HESTIA_SECRET_KEY,
      password: process.env.HESTIA_PASSWORD,
    });
  }
  return hestiaInstance;
}

export default HestiaAPI;

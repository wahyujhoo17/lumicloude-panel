import axios, { AxiosInstance } from "axios";

export interface AAPanelConfig {
  host: string;
  port: string;
  secretKey: string;
  securityEntrance?: string; // e.g., "/59be876e"
}

export interface AAPanelResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  msg?: string;
}

export interface DNSRecord {
  id?: number;
  name: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV";
  value: string;
  ttl?: number;
  priority?: number;
  status?: string;
}

export interface DNSZone {
  id: number;
  name: string;
  status: string;
  records: DNSRecord[];
}

export class AAPanelAPI {
  private client: AxiosInstance;
  private config: AAPanelConfig;

  constructor(config: AAPanelConfig) {
    this.config = config;
    const securityPath = config.securityEntrance || "";
    this.client = axios.create({
      baseURL: `https://${config.host}:${config.port}${securityPath}`,
      timeout: 30000,
      httpsAgent: new (require("https").Agent)({
        rejectUnauthorized: false,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  /**
   * Generate API signature for authentication
   * aaPanel uses: MD5(secretKey + timestamp)
   */
  private generateSignature(timestamp: number): string {
    const crypto = require("crypto");
    const data = `${this.config.secretKey}${timestamp}`;
    return crypto.createHash("md5").update(data).digest("hex");
  }

  /**
   * Make authenticated request to aaPanel API
   */
  private async request<T = any>(
    endpoint: string,
    method: "GET" | "POST" = "POST",
    params: Record<string, any> = {},
  ): Promise<AAPanelResponse<T>> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(timestamp);

      const requestData = new URLSearchParams({
        request_token: this.config.secretKey,
        request_time: timestamp.toString(),
        request_sign: signature,
        ...params,
      });

      const response = await this.client.request({
        url: endpoint,
        method,
        data: requestData,
      });

      // aaPanel API response format varies, normalize it
      if (response.data?.status === true || response.data?.success === true) {
        return {
          success: true,
          data: response.data.data || response.data,
        };
      }

      if (response.data?.status === false || response.data?.success === false) {
        return {
          success: false,
          error: response.data.msg || response.data.message || "Unknown error",
        };
      }

      // Assume success if no explicit status
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`aaPanel API Error (${endpoint}):`, error.message);
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  // ============================================
  // DNS ZONE MANAGEMENT
  // ============================================

  /**
   * List all DNS zones
   */
  async listZones(): Promise<AAPanelResponse<DNSZone[]>> {
    return this.request("/api/dns/get_list", "POST");
  }

  /**
   * Get specific DNS zone
   */
  async getZone(domain: string): Promise<AAPanelResponse<DNSZone>> {
    return this.request("/api/dns/get_zone", "POST", {
      domain: domain,
    });
  }

  /**
   * Create DNS zone
   */
  async createZone(domain: string): Promise<AAPanelResponse> {
    return this.request("/api/dns/create_zone", "POST", {
      domain: domain,
    });
  }

  /**
   * Delete DNS zone
   */
  async deleteZone(domain: string): Promise<AAPanelResponse> {
    return this.request("/api/dns/delete_zone", "POST", {
      domain: domain,
    });
  }

  // ============================================
  // DNS RECORD MANAGEMENT
  // ============================================

  /**
   * Add DNS record
   */
  async addRecord(params: {
    domain: string;
    name: string;
    type: DNSRecord["type"];
    value: string;
    ttl?: number;
    priority?: number;
  }): Promise<AAPanelResponse> {
    return this.request("/api/dns/add_record", "POST", {
      domain: params.domain,
      host: params.name,
      type: params.type,
      value: params.value,
      ttl: params.ttl || 600,
      mx_priority: params.priority || 10,
    });
  }

  /**
   * Update DNS record
   */
  async updateRecord(params: {
    domain: string;
    recordId: number;
    name: string;
    type: DNSRecord["type"];
    value: string;
    ttl?: number;
    priority?: number;
  }): Promise<AAPanelResponse> {
    return this.request("/api/dns/update_record", "POST", {
      domain: params.domain,
      id: params.recordId,
      host: params.name,
      type: params.type,
      value: params.value,
      ttl: params.ttl || 600,
      mx_priority: params.priority || 10,
    });
  }

  /**
   * Delete DNS record
   */
  async deleteRecord(
    domain: string,
    recordId: number,
  ): Promise<AAPanelResponse> {
    return this.request("/api/dns/delete_record", "POST", {
      domain: domain,
      id: recordId,
    });
  }

  /**
   * List all records for a domain
   */
  async listRecords(domain: string): Promise<AAPanelResponse<DNSRecord[]>> {
    return this.request("/api/dns/get_records", "POST", {
      domain: domain,
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Add A record for subdomain (common use case)
   */
  async addSubdomainARecord(params: {
    primaryDomain: string;
    subdomain: string;
    ip: string;
    ttl?: number;
  }): Promise<AAPanelResponse> {
    return this.addRecord({
      domain: params.primaryDomain,
      name: params.subdomain,
      type: "A",
      value: params.ip,
      ttl: params.ttl || 600,
    });
  }

  /**
   * Add CNAME record
   */
  async addCNAMERecord(params: {
    domain: string;
    name: string;
    target: string;
    ttl?: number;
  }): Promise<AAPanelResponse> {
    return this.addRecord({
      domain: params.domain,
      name: params.name,
      type: "CNAME",
      value: params.target,
      ttl: params.ttl || 600,
    });
  }

  /**
   * Check if DNS record exists
   */
  async recordExists(
    domain: string,
    name: string,
    type: DNSRecord["type"],
  ): Promise<boolean> {
    try {
      const result = await this.listRecords(domain);
      if (!result.success || !result.data) return false;

      return result.data.some(
        (record) => record.name === name && record.type === type,
      );
    } catch {
      return false;
    }
  }

  /**
   * Test connection to aaPanel
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.listZones();
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Verify DNS propagation
   */
  async verifyDNS(domain: string, expectedIP: string): Promise<boolean> {
    try {
      const dns = require("dns").promises;
      const addresses = await dns.resolve4(domain);
      return addresses.includes(expectedIP);
    } catch {
      return false;
    }
  }
}

// Export singleton instance
let aapanelInstance: AAPanelAPI | null = null;

export function getAAPanelAPI(): AAPanelAPI {
  if (!aapanelInstance) {
    aapanelInstance = new AAPanelAPI({
      host: process.env.AAPANEL_HOST || "vpsdashboard.lumicloud.my.id",
      port: process.env.AAPANEL_PORT || "9000",
      secretKey: process.env.AAPANEL_SECRET_KEY || "",
      securityEntrance: process.env.AAPANEL_SECURITY_ENTRANCE || "",
    });
  }
  return aapanelInstance;
}

export default AAPanelAPI;

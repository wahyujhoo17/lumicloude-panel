import { Client, ConnectConfig, SFTPWrapper } from "ssh2";
import { promisify } from "util";

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  permissions: string;
  owner: string;
  group: string;
}

export interface HestiaFileManagerConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
}

/**
 * HestiaCP File Manager using SFTP
 * Provides direct access to HestiaCP user files via SSH/SFTP
 */
export class HestiaFileManager {
  private config: HestiaFileManagerConfig;
  private client: Client | null = null;
  private sftp: SFTPWrapper | null = null;

  constructor(config: HestiaFileManagerConfig) {
    this.config = {
      port: 22,
      ...config,
    };
  }

  /**
   * Connect to HestiaCP server via SSH
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client();

      this.client.on("ready", () => {
        this.client!.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }
          this.sftp = sftp;
          resolve();
        });
      });

      this.client.on("error", (err) => {
        reject(err);
      });

      const connectConfig: ConnectConfig = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: 30000,
      };

      this.client.connect(connectConfig);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.sftp) {
      this.sftp.end();
      this.sftp = null;
    }
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (!this.sftp) {
      await this.connect();
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<FileInfo[]> {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      this.sftp!.readdir(path, (err, list) => {
        if (err) {
          reject(err);
          return;
        }

        const files: FileInfo[] = list.map((item) => ({
          name: item.filename,
          path: `${path}/${item.filename}`.replace(/\/+/g, "/"),
          isDirectory: (item.attrs.mode & 0o040000) !== 0,
          size: item.attrs.size,
          modified: new Date(item.attrs.mtime * 1000),
          permissions: this.getPermissionsString(item.attrs.mode),
          owner: item.attrs.uid.toString(),
          group: item.attrs.gid.toString(),
        }));

        // Sort: directories first, then files
        files.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

        resolve(files);
      });
    });
  }

  /**
   * Read file content
   */
  async readFile(path: string): Promise<Buffer> {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = this.sftp!.createReadStream(path);

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on("error", (err: Error) => {
        reject(err);
      });
    });
  }

  /**
   * Write file content
   */
  async writeFile(path: string, content: Buffer | string): Promise<void> {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
      const stream = this.sftp!.createWriteStream(path);

      stream.on("close", () => {
        resolve();
      });

      stream.on("error", (err: Error) => {
        reject(err);
      });

      stream.write(buffer);
      stream.end();
    });
  }

  /**
   * Delete file or directory
   */
  async delete(path: string, isDirectory: boolean = false): Promise<void> {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      if (isDirectory) {
        this.sftp!.rmdir(path, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        this.sftp!.unlink(path, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  }

  /**
   * Create directory
   */
  async createDirectory(path: string): Promise<void> {
    await this.ensureConnection();

    // Create directories recursively
    const parts = path.split("/").filter((p) => p);
    let currentPath = path.startsWith("/") ? "/" : "";

    for (const part of parts) {
      currentPath += (currentPath === "/" ? "" : "/") + part;

      try {
        await new Promise<void>((resolve, reject) => {
          this.sftp!.mkdir(currentPath, (err) => {
            if (err) {
              // Ignore error if directory already exists
              if (
                err.message.includes("File exists") ||
                err.message.includes("Failure")
              ) {
                resolve();
              } else {
                reject(err);
              }
            } else {
              resolve();
            }
          });
        });
      } catch (err) {
        // Check if directory exists
        const exists = await new Promise<boolean>((resolve) => {
          this.sftp!.stat(currentPath, (err) => {
            resolve(!err);
          });
        });

        if (!exists) {
          throw err;
        }
      }
    }
  }

  /**
   * Rename file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      this.sftp!.rename(oldPath, newPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Check if file/directory exists
   */
  async exists(path: string): Promise<boolean> {
    await this.ensureConnection();

    return new Promise((resolve) => {
      this.sftp!.stat(path, (err) => {
        resolve(!err);
      });
    });
  }

  /**
   * Get file stats
   */
  async stat(path: string): Promise<any> {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      this.sftp!.stat(path, (err, stats) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });
  }

  /**
   * Convert permission mode to string (e.g., "drwxr-xr-x")
   */
  private getPermissionsString(mode: number): string {
    const types = {
      0o140000: "s", // socket
      0o120000: "l", // symbolic link
      0o100000: "-", // regular file
      0o060000: "b", // block device
      0o040000: "d", // directory
      0o020000: "c", // character device
      0o010000: "p", // FIFO
    };

    const type =
      Object.entries(types).find(([mask]) => {
        return (mode & parseInt(mask, 8)) !== 0;
      })?.[1] || "-";

    const perms = [
      (mode & 0o400) !== 0 ? "r" : "-",
      (mode & 0o200) !== 0 ? "w" : "-",
      (mode & 0o100) !== 0 ? "x" : "-",
      (mode & 0o040) !== 0 ? "r" : "-",
      (mode & 0o020) !== 0 ? "w" : "-",
      (mode & 0o010) !== 0 ? "x" : "-",
      (mode & 0o004) !== 0 ? "r" : "-",
      (mode & 0o002) !== 0 ? "w" : "-",
      (mode & 0o001) !== 0 ? "x" : "-",
    ].join("");

    return type + perms;
  }
}

/**
 * Create a HestiaCP File Manager instance for a specific user
 */
export function createHestiaFileManager(
  hestiaUsername: string,
  hestiaPassword: string,
): HestiaFileManager {
  return new HestiaFileManager({
    host: process.env.HESTIA_HOST || "localhost",
    port: parseInt(process.env.HESTIA_SSH_PORT || "22"),
    username: hestiaUsername,
    password: hestiaPassword,
  });
}

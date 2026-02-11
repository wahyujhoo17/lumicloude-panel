import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import axios from "axios";

/**
 * GET /api/system/stats
 * Get real-time system stats from HestiaCP server (CPU, RAM, Disk, Services)
 */
export async function GET() {
  try {
    await requireAuth();

    const host = process.env.HESTIA_HOST || "100.86.108.93";
    const port = process.env.HESTIA_PORT || "8083";
    const user = process.env.HESTIA_USER || "wahyu";
    const password = process.env.HESTIA_PASSWORD || "";

    const agent = new (require("https").Agent)({
      rejectUnauthorized: false,
    });

    // IMPORTANT: Fetch CPU status FIRST (alone) to avoid self-measurement
    // If we fetch all 4 in parallel, the other 3 HestiaCP commands use CPU
    // and top captures that spike, showing inflated CPU (~20%)
    const cpuRes = await Promise.allSettled([
      axios.post(
        `https://${host}:${port}/api/`,
        new URLSearchParams({
          user,
          password,
          cmd: "v-list-sys-cpu-status",
          arg1: "json",
        }),
        { httpsAgent: agent, timeout: 15000 },
      ),
    ]);

    // Now fetch the rest in parallel (CPU measurement is already done)
    const [sysInfoRes, servicesRes, diskRes] = await Promise.allSettled([
      // System Info
      axios.post(
        `https://${host}:${port}/api/`,
        new URLSearchParams({
          user,
          password,
          cmd: "v-list-sys-info",
          arg1: "json",
        }),
        { httpsAgent: agent, timeout: 15000 },
      ),
      // Services
      axios.post(
        `https://${host}:${port}/api/`,
        new URLSearchParams({
          user,
          password,
          cmd: "v-list-sys-services",
          arg1: "json",
        }),
        { httpsAgent: agent, timeout: 15000 },
      ),
      // Disk Status
      axios.post(
        `https://${host}:${port}/api/`,
        new URLSearchParams({
          user,
          password,
          cmd: "v-list-sys-disk-status",
          arg1: "json",
        }),
        { httpsAgent: agent, timeout: 15000 },
      ),
    ]);

    // Parse System Info
    let sysInfo: any = {};
    if (sysInfoRes.status === "fulfilled") {
      try {
        const data =
          typeof sysInfoRes.value.data === "string"
            ? JSON.parse(sysInfoRes.value.data)
            : sysInfoRes.value.data;
        sysInfo = data?.sysinfo || {};
      } catch {
        sysInfo = {};
      }
    }

    // Parse Services
    let services: any[] = [];
    if (servicesRes.status === "fulfilled") {
      try {
        const data =
          typeof servicesRes.value.data === "string"
            ? JSON.parse(servicesRes.value.data)
            : servicesRes.value.data;
        services = Object.entries(data).map(([name, info]: [string, any]) => ({
          name,
          system: info.SYSTEM,
          state: info.STATE,
          cpu: parseFloat(info.CPU) || 0,
          mem: parseInt(info.MEM) || 0,
          rtime: parseInt(info.RTIME) || 0,
        }));
      } catch {
        services = [];
      }
    }

    // Parse CPU/Memory from top output
    let cpu = { usage: 0, cores: 0, user: 0, system: 0, idle: 100 };
    let memory = {
      total: 0,
      used: 0,
      free: 0,
      available: 0,
      buffCache: 0,
      usagePercent: 0,
    };
    let loadAverage = { load1: 0, load5: 0, load15: 0 };

    const cpuResult = cpuRes[0];
    if (cpuResult.status === "fulfilled") {
      try {
        const raw = cpuResult.value.data;

        // Parse load average from sysInfo
        if (sysInfo.LOADAVERAGE) {
          const parts = sysInfo.LOADAVERAGE.split("/").map((s: string) =>
            parseFloat(s.trim()),
          );
          loadAverage = {
            load1: parts[0] || 0,
            load5: parts[1] || 0,
            load15: parts[2] || 0,
          };
        }

        // Parse CPU from top output: %Cpu(s):  0.0 us,  0.8 sy,  0.0 ni, 99.2 id,...
        const cpuMatch = raw.match(
          /%Cpu\(s\):\s*([\d.]+)\s*us,\s*([\d.]+)\s*sy,\s*[\d.]+\s*ni,\s*([\d.]+)\s*id/,
        );
        if (cpuMatch) {
          cpu.user = parseFloat(cpuMatch[1]);
          cpu.system = parseFloat(cpuMatch[2]);
          cpu.idle = parseFloat(cpuMatch[3]);
          cpu.usage = Math.round((100 - cpu.idle) * 10) / 10;
        }

        // Parse CPU count from lscpu output: "CPU(s):                                  8"
        const cpuCountMatch = raw.match(/^CPU\(s\):\s+(\d+)/m);
        if (cpuCountMatch) {
          cpu.cores = parseInt(cpuCountMatch[1]);
        }

        // Parse Memory from top: MiB Mem :   3910.3 total,   1821.9 free,    675.3 used,   1413.1 buff/cache
        const memMatch = raw.match(
          /MiB Mem\s*:\s*([\d.]+)\s*total,\s*([\d.]+)\s*free,\s*([\d.]+)\s*used,\s*([\d.]+)\s*buff\/cache/,
        );
        if (memMatch) {
          memory.total = parseFloat(memMatch[1]);
          memory.free = parseFloat(memMatch[2]);
          memory.used = parseFloat(memMatch[3]);
          memory.buffCache = parseFloat(memMatch[4]);
          // Memory usage = (used + buff/cache) / total
          memory.usagePercent =
            Math.round(
              ((memory.used + memory.buffCache) / memory.total) * 1000,
            ) / 10;
        }

        // Parse available memory: MiB Swap:      0.0 total,      0.0 free,      0.0 used.   2980.4 avail Mem
        const availMatch = raw.match(/([\d.]+)\s*avail Mem/);
        if (availMatch) {
          memory.available = parseFloat(availMatch[1]);
        }
      } catch {
        // Keep defaults
      }
    }

    // Parse Disk from df output
    let disk = { total: 0, used: 0, available: 0, usagePercent: 0 };
    if (diskRes.status === "fulfilled") {
      try {
        const raw = diskRes.value.data;
        // Look for the main disk partition: /dev/sda1    39G  4.0G   35G  11% /
        const diskMatch = raw.match(
          /\/dev\/\w+\s+([\d.]+)([GMTK])\s+([\d.]+)([GMTK])\s+([\d.]+)([GMTK])\s+(\d+)%\s+\/\s*$/m,
        );
        if (diskMatch) {
          disk.total = parseSize(diskMatch[1], diskMatch[2]);
          disk.used = parseSize(diskMatch[3], diskMatch[4]);
          disk.available = parseSize(diskMatch[5], diskMatch[6]);
          disk.usagePercent = parseInt(diskMatch[7]);
        }
      } catch {
        // Keep defaults
      }
    }

    // Calculate total service memory
    const totalServiceMem = services.reduce((sum, s) => sum + s.mem, 0);

    return NextResponse.json({
      success: true,
      data: {
        server: {
          hostname: sysInfo.HOSTNAME || "server",
          os: `${sysInfo.OS || "Ubuntu"} ${sysInfo.VERSION || ""}`.trim(),
          arch: sysInfo.ARCH || "x86_64",
          hestia: sysInfo.HESTIA || "",
          uptime: formatUptime(parseInt(sysInfo.UPTIME) || 0),
          uptimeMinutes: parseInt(sysInfo.UPTIME) || 0,
        },
        cpu,
        memory,
        disk,
        loadAverage,
        services,
        totalServiceMem,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching system stats:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

function parseSize(value: string, unit: string): number {
  const num = parseFloat(value);
  switch (unit.toUpperCase()) {
    case "T":
      return num * 1024;
    case "G":
      return num;
    case "M":
      return num / 1024;
    case "K":
      return num / (1024 * 1024);
    default:
      return num;
  }
}

function formatUptime(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  return parts.join(" ") || "0m";
}

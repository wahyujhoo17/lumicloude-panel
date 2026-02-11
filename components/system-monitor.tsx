"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  Activity,
  RefreshCw,
  Clock,
  Zap,
  Shield,
  CircleDot,
  ChevronDown,
} from "lucide-react";

interface SystemStats {
  server: {
    hostname: string;
    os: string;
    arch: string;
    hestia: string;
    uptime: string;
    uptimeMinutes: number;
  };
  cpu: {
    usage: number;
    cores: number;
    user: number;
    system: number;
    idle: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
    buffCache: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    usagePercent: number;
  };
  loadAverage: {
    load1: number;
    load5: number;
    load15: number;
  };
  services: {
    name: string;
    system: string;
    state: string;
    cpu: number;
    mem: number;
    rtime: number;
  }[];
  totalServiceMem: number;
  timestamp: string;
}

// Clean circular progress gauge
function CircularGauge({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color,
  label,
  subLabel,
  icon: Icon,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  subLabel: string;
  icon: any;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min((value / max) * 100, 100);
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-4 h-4 mb-0.5 text-gray-400" />
          <span className="text-xl font-bold text-gray-900">
            {percent.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>
      </div>
    </div>
  );
}

// Mini bar for service list
function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(false);

  const fetchStats = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      const res = await fetch("/api/system/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        setError("");
      } else {
        setError(data.error || "Failed to fetch stats");
      }
    } catch (err: any) {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchStats(), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 text-sm">Loading server monitoring...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-xl p-8 border border-red-200">
        <div className="text-center">
          <Server className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => fetchStats(true)}
            className="mt-3 px-4 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const runningServices = stats.services.filter(
    (s) => s.state === "running",
  ).length;
  const totalServices = stats.services.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Server Monitoring</h2>
              <p className="text-blue-300 text-xs">
                {stats.server.hostname} — {stats.server.os} —{" "}
                {stats.server.arch}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1 text-xs rounded-md transition ${
                autoRefresh
                  ? "bg-green-500/20 text-green-300"
                  : "bg-white/10 text-gray-300"
              }`}
            >
              {autoRefresh ? "● Live" : "○ Paused"}
            </button>
            <button
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Server info pills */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-md text-xs">
            <Clock className="w-3 h-3 text-blue-300" />
            <span>
              Uptime: <strong>{stats.server.uptime}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-md text-xs">
            <Zap className="w-3 h-3 text-yellow-300" />
            <span>
              Load: <strong>{stats.loadAverage.load1}</strong> /{" "}
              {stats.loadAverage.load5} / {stats.loadAverage.load15}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-md text-xs">
            <Cpu className="w-3 h-3 text-cyan-300" />
            <span>
              <strong>{stats.cpu.cores}</strong> CPU Cores
            </span>
          </div>
          <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-md text-xs">
            <Shield className="w-3 h-3 text-green-300" />
            <span>
              HestiaCP <strong>v{stats.server.hestia}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Gauge */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <CircularGauge
            value={stats.cpu.usage}
            color={
              stats.cpu.usage >= 90
                ? "#ef4444"
                : stats.cpu.usage >= 70
                  ? "#f59e0b"
                  : "#3b82f6"
            }
            label="CPU Usage"
            subLabel={`${stats.cpu.user}% user / ${stats.cpu.system}% sys`}
            icon={Cpu}
          />
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>User</span>
              <span>{stats.cpu.user}%</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${stats.cpu.user}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>System</span>
              <span>{stats.cpu.system}%</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${stats.cpu.system}%` }}
              />
            </div>
          </div>
        </div>

        {/* Memory Gauge */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <CircularGauge
            value={stats.memory.usagePercent}
            color={
              stats.memory.usagePercent >= 90
                ? "#ef4444"
                : stats.memory.usagePercent >= 70
                  ? "#f59e0b"
                  : "#8b5cf6"
            }
            label="Memory Usage"
            subLabel={`${(stats.memory.used + stats.memory.buffCache).toFixed(0)} / ${stats.memory.total.toFixed(0)} MiB`}
            icon={MemoryStick}
          />
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Used</span>
              <span>{stats.memory.used.toFixed(0)} MiB</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{
                  width: `${(stats.memory.used / stats.memory.total) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Buff/Cache</span>
              <span>{stats.memory.buffCache.toFixed(0)} MiB</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                style={{
                  width: `${(stats.memory.buffCache / stats.memory.total) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Available</span>
              <span>{stats.memory.available.toFixed(0)} MiB</span>
            </div>
          </div>
        </div>

        {/* Disk Gauge */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <CircularGauge
            value={stats.disk.usagePercent}
            color={
              stats.disk.usagePercent >= 90
                ? "#ef4444"
                : stats.disk.usagePercent >= 70
                  ? "#f59e0b"
                  : "#10b981"
            }
            label="Disk Usage"
            subLabel={`${stats.disk.used.toFixed(1)} / ${stats.disk.total.toFixed(1)} GB`}
            icon={HardDrive}
          />
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Used</span>
              <span>{stats.disk.used.toFixed(1)} GB</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${stats.disk.usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Available</span>
              <span>{stats.disk.available.toFixed(1)} GB</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-300 rounded-full transition-all duration-700"
                style={{
                  width: `${(stats.disk.available / stats.disk.total) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setServicesOpen(!servicesOpen)}
          className="w-full px-5 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                System Services
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CircleDot className="w-2.5 h-2.5" />
                <span>{runningServices} running</span>
              </span>
              <span className="text-xs text-gray-400">/ {totalServices}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                  servicesOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </button>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            servicesOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="divide-y divide-gray-100">
            {stats.services.map((service) => (
              <div
                key={service.name}
                className="px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      service.state === "running"
                        ? "bg-green-500"
                        : "bg-red-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {service.name}
                    </p>
                    <p className="text-xs text-gray-500">{service.system}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">CPU</p>
                    <p className="text-sm font-medium text-gray-700">
                      {service.cpu}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">MEM</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-700">
                        {service.mem} MB
                      </p>
                      <MiniBar
                        value={service.mem}
                        max={stats.memory.total}
                        color={
                          service.mem > 500
                            ? "bg-red-500"
                            : service.mem > 200
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                        }
                      />
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      service.state === "running"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {service.state}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Service Memory Footer */}
          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Total Service Memory</span>
              <span className="font-medium text-gray-600">
                {stats.totalServiceMem} MB (
                {((stats.totalServiceMem / stats.memory.total) * 100).toFixed(
                  1,
                )}
                % of total)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

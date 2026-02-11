import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Globe,
  Database,
  HardDrive,
  Activity,
  Lock,
  FileText,
  Settings,
  Mail,
  Shield,
  Cloud,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function CustomerPanelPage() {
  const user = await requireAuth();

  // Only allow customers (USER role) to access this page
  if (user.role === "ADMIN") {
    redirect("/dashboard");
  }

  // Get customer data
  const customer = await prisma.customer.findUnique({
    where: { email: user.email || "" },
    include: {
      websites: true,
      databases: true,
    },
  });

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl w-full p-8 bg-white rounded-xl shadow">
          <h2 className="text-xl font-semibold">No Hosting Account</h2>
          <p className="mt-4 text-gray-600">
            No hosting account found for your email. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Calculate usage statistics
  const totalDiskUsage = customer.websites.reduce(
    (sum, w) => sum + (w.diskUsage || 0),
    0,
  );
  const totalBandwidth = customer.websites.reduce(
    (sum, w) => sum + (w.bandwidthUsage || 0),
    0,
  );

  const hestiaUrl = `https://${process.env.HESTIA_HOST}:${process.env.HESTIA_PORT}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {customer.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your hosting account, websites, databases, and more.
          </p>
        </div>

        {/* Account Status Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Account Status</h2>
              <p className="text-blue-100 mt-1">
                Plan:{" "}
                <span className="font-bold">
                  {customer.packageId.toUpperCase()}
                </span>
              </p>
              <p className="text-blue-100 mt-1">
                Status:{" "}
                <span
                  className={`font-bold ${
                    customer.status === "ACTIVE"
                      ? "text-green-300"
                      : "text-yellow-300"
                  }`}
                >
                  {customer.status}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">Username</p>
              <p className="text-lg font-mono font-bold">
                {customer.hestiaUsername}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Websites</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {customer.websites.length}
                </p>
              </div>
              <Globe className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Databases</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {customer.databases.length}
                </p>
              </div>
              <Database className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disk Usage</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalDiskUsage.toFixed(0)} MB
                </p>
              </div>
              <HardDrive className="w-10 h-10 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bandwidth</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalBandwidth.toFixed(0)} MB
                </p>
              </div>
              <Activity className="w-10 h-10 text-cyan-500" />
            </div>
          </div>
        </div>

        {/* Control Panel Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Websites Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-blue-600" />
                Your Websites
              </h3>
            </div>
            <div className="p-6">
              {customer.websites.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No websites yet</p>
                  <p className="text-sm mt-1">
                    Contact support to add a website
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customer.websites.map((website) => (
                    <div
                      key={website.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 flex items-center">
                            {website.subdomain}
                            {website.sslEnabled && (
                              <Lock className="w-4 h-4 ml-2 text-green-500" />
                            )}
                          </h4>
                          {website.customDomain && (
                            <p className="text-sm text-gray-600 mt-1">
                              Custom: {website.customDomain}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>IP: {website.ipAddress}</span>
                            <span>PHP: {website.phpVersion}</span>
                            <span className="flex items-center">
                              <HardDrive className="w-3 h-3 mr-1" />
                              {website.diskUsage.toFixed(0)} MB
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            website.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : website.status === "SSL_PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {website.status}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <a
                          href={`https://${website.subdomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Visit Site
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Databases Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Database className="w-5 h-5 mr-2 text-purple-600" />
                Databases
              </h3>
            </div>
            <div className="p-6">
              {customer.databases.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No databases yet</p>
                  <p className="text-sm mt-1">
                    Contact support to create a database
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customer.databases.map((db) => (
                    <div
                      key={db.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition"
                    >
                      <h4 className="font-semibold text-gray-900">{db.name}</h4>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Username:</span>{" "}
                          {db.username}
                        </p>
                        <p>
                          <span className="font-medium">Host:</span> {db.host}:
                          {db.port}
                        </p>
                        <p>
                          <span className="font-medium">Size:</span>{" "}
                          {db.size.toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Management Tools */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-600" />
            Management Tools
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Manage your hosting account with these powerful tools.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/panel/files"
              className="flex items-center justify-center px-4 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-md"
            >
              <FileText className="w-5 h-5 mr-2" />
              File Manager
            </Link>

            <Link
              href="/panel/databases"
              className="flex items-center justify-center px-4 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition shadow-md"
            >
              <Database className="w-5 h-5 mr-2" />
              Databases
            </Link>

            <Link
              href="/panel/email"
              className="flex items-center justify-center px-4 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition shadow-md"
            >
              <Mail className="w-5 h-5 mr-2" />
              Email Accounts
            </Link>

            <Link
              href="/panel/dns"
              className="flex items-center justify-center px-4 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-md"
            >
              <Cloud className="w-5 h-5 mr-2" />
              DNS Management
            </Link>

            <Link
              href="/panel/backups"
              className="flex items-center justify-center px-4 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition shadow-md"
            >
              <HardDrive className="w-5 h-5 mr-2" />
              Backups
            </Link>

            <a
              href={hestiaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-4 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition shadow-md"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              HestiaCP Panel
            </a>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>✨ Full Control Panel:</strong>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Username:{" "}
              <code className="bg-white px-2 py-1 rounded">
                {customer.hestiaUsername}
              </code>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Manage your hosting account completely from this panel - files,
              databases, email, DNS, backups, and more. No need to access
              HestiaCP unless you need advanced features.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

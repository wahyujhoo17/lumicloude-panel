import { Users, Server, Database, Globe, Activity } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SystemMonitor } from "@/components/system-monitor";

async function getDashboardStats() {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/dashboard/stats`,
      {
        cache: "no-store",
      },
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return null;
  }
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const stats = await getDashboardStats();

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your hosting today.
          </p>
        </div>

        {/* Server Monitoring - Real-time */}
        <div className="mb-8">
          <SystemMonitor />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Customers */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 border-l-4 border-blue-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Customers
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.customers.total}
                </p>
                <p className="text-sm text-blue-600 mt-1 font-medium">
                  {stats.customers.active} active
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Total Websites */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 border-l-4 border-purple-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Websites
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.websites.total}
                </p>
                <p className="text-sm text-purple-600 mt-1 font-medium">
                  {stats.websites.pending} pending
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Globe className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Total Databases */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 border-l-4 border-indigo-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Databases</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.databases.total}
                </p>
                <p className="text-sm text-indigo-600 mt-1 font-medium">
                  MySQL/MariaDB
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <Database className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Active Services */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 border-l-4 border-cyan-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Services
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalCustomers}
                </p>
                <p className="text-sm text-cyan-600 mt-1 font-medium">
                  Hosting accounts
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl">
                <Server className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-t-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/customers/new"
              className="flex items-center justify-center px-4 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-md hover:shadow-lg"
            >
              <Users className="w-5 h-5 mr-2" />
              Add New Customer
            </Link>
            <Link
              href="/dashboard/customers"
              className="flex items-center justify-center px-4 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition shadow-md hover:shadow-lg"
            >
              <Server className="w-5 h-5 mr-2" />
              Manage Customers
            </Link>
            <Link
              href="/dashboard/activity"
              className="flex items-center justify-center px-4 py-4 bg-white border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition shadow-md hover:shadow-lg"
            >
              <Activity className="w-5 h-5 mr-2" />
              View Activity Logs
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border-t-4 border-purple-500">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentActivities.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              stats.recentActivities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action.replace(/_/g, " ")}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(activity.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span
                      className={`ml-4 px-3 py-1 text-xs font-semibold rounded-full ${
                        activity.status === "SUCCESS"
                          ? "bg-green-100 text-green-800"
                          : activity.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

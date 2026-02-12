"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  MoreVertical,
  Ban,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getPackage } from "@/lib/packages";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface Customer {
  id: string;
  name: string;
  email: string;
  hestiaUsername: string;
  hestiaPassword: string;
  packageId: string;
  plan: string;
  status: string;
  monthlyPrice: number;
  createdAt: string;
  websites: any[];
  databases: any[];
  _count: {
    websites: number;
    databases: number;
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set(),
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suspending, setSuspending] = useState<string | null>(null);

  const togglePasswordVisibility = (customerId: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDelete = async (customer: Customer) => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete customer");
      }

      toast({
        title: "Success",
        description: `Customer ${customer.name} has been deleted`,
      });

      setDeleteConfirm(null);
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSuspend = async (customerId: string, currentStatus: string) => {
    try {
      setSuspending(customerId);
      const isSuspend = currentStatus !== "SUSPENDED";

      const response = await fetch(`/api/customers/${customerId}/suspend`, {
        method: isSuspend ? "POST" : "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to ${isSuspend ? "suspend" : "unsuspend"} customer`,
        );
      }

      toast({
        title: "Success",
        description:
          data.message ||
          `Customer ${isSuspend ? "suspended" : "unsuspended"} successfully`,
      });

      setActiveDropdown(null);
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setSuspending(null);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data.customers);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "SUSPENDED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPlanColor = (packageId: string) => {
    switch (packageId.toLowerCase()) {
      case "starter":
        return "bg-blue-100 text-blue-800";
      case "business":
        return "bg-purple-100 text-purple-800";
      case "enterprise":
        return "bg-pink-100 text-pink-800";
      // Legacy support
      case "BASIC":
        return "bg-blue-100 text-blue-800";
      case "STANDARD":
        return "bg-purple-100 text-purple-800";
      case "PREMIUM":
        return "bg-orange-100 text-orange-800";
      case "ENTERPRISE":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchCustomers();
    }
  }, [page, statusFilter, status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar
        user={{
          email: session?.user?.email,
          name: session?.user?.name,
          role: "Admin",
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-1">Manage your hosting customers</p>
          </div>
          <Link
            href="/dashboard/customers/new"
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Customer
          </Link>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No customers found</p>
            <Link
              href="/dashboard/customers/new"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Customer
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credentials
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          @{customer.hestiaUsername}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="text-gray-500">Username:</div>
                        <code className="bg-gray-100 px-2 py-1 rounded text-gray-900">
                          {customer.hestiaUsername}
                        </code>
                        <div className="text-gray-500 mt-2">Password:</div>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-gray-900 flex-1">
                            {visiblePasswords.has(customer.id)
                              ? customer.hestiaPassword
                              : "••••••••••••••••"}
                          </code>
                          <button
                            onClick={() =>
                              togglePasswordVisibility(customer.id)
                            }
                            className="p-1 hover:bg-gray-200 rounded transition"
                            title={
                              visiblePasswords.has(customer.id)
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {visiblePasswords.has(customer.id) ? (
                              <EyeOff className="w-4 h-4 text-gray-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const pkg = getPackage(customer.packageId || "starter");
                        return (
                          <div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanColor(customer.packageId || "starter")}`}
                            >
                              {pkg?.name || customer.plan}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(customer.status)}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{customer._count.websites} websites</div>
                      <div>{customer._count.databases} databases</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative dropdown-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(
                              activeDropdown === customer.id
                                ? null
                                : customer.id,
                            );
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>

                        {activeDropdown === customer.id && (
                          <div
                            className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <Link
                                href={`/dashboard/customers/${customer.id}`}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                                <span>View Details</span>
                              </Link>
                              <Link
                                href={`/dashboard/customers/${customer.id}/edit`}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4 text-orange-600" />
                                <span>Edit Customer</span>
                              </Link>
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                onClick={() =>
                                  handleSuspend(customer.id, customer.status)
                                }
                                disabled={suspending === customer.id}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                  customer.status === "SUSPENDED"
                                    ? "text-green-600"
                                    : "text-orange-600"
                                }`}
                              >
                                {suspending === customer.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing...</span>
                                  </>
                                ) : customer.status === "SUSPENDED" ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Unsuspend</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-4 h-4" />
                                    <span>Suspend</span>
                                  </>
                                )}
                              </button>
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                onClick={() => {
                                  setDeleteConfirm(customer);
                                  setActiveDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Customer</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{(page - 1) * 10 + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(page * 10, total)}
                </span>{" "}
                of <span className="font-medium">{total}</span> results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 10 >= total}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-red-600">
                Delete Customer
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{deleteConfirm.name}</span>?
              </p>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                ⚠️ This will also delete all websites, databases, and data
                associated with this customer. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
}

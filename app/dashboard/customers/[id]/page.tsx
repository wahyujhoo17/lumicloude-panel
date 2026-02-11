"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Package,
  Calendar,
  Globe,
  Database,
  Server,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getPackage } from "@/lib/packages";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  hestiaUsername: string;
  hestiaPassword: string;
  packageId: string;
  plan: string;
  status: string;
  monthlyPrice: number;
  billingCycle: string;
  nextBillingDate: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  websites: any[];
  databases: any[];
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [billingModal, setBillingModal] = useState(false);
  const [billingMonths, setBillingMonths] = useState(1);
  const [addingBilling, setAddingBilling] = useState(false);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setCustomer(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch customer",
          variant: "error",
        });
        router.push("/dashboard/customers");
      }
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      router.push("/dashboard/customers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;

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

      router.push("/dashboard/customers");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleAddBilling = async () => {
    if (!customer) return;

    try {
      setAddingBilling(true);
      const response = await fetch(`/api/customers/${customer.id}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: billingMonths }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add billing");
      }

      toast({
        title: "Success",
        description: `Subscription extended by ${billingMonths} month(s)`,
      });

      // Refresh customer data
      fetchCustomer();
      setBillingModal(false);
      setBillingMonths(1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setAddingBilling(false);
    }
  };

  // Calculate days remaining
  const getExpirationInfo = () => {
    if (!customer?.expiresAt) return null;

    const now = new Date();
    const expiresAt = new Date(customer.expiresAt);
    const diff = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return {
      daysRemaining,
      isExpired: diff < 0,
      expiresAt,
    };
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

  useEffect(() => {
    if (status === "authenticated" && params.id) {
      fetchCustomer();
    }
  }, [status, params.id]);

  if (status === "loading" || loading) {
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

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  const pkg = getPackage(customer.packageId || "starter");

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
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/customers"
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.name}
              </h1>
              <p className="text-gray-600">{customer.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBillingModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Billing
            </button>
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Customer Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Name</label>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">{customer.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-medium">{customer.phone || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Company</label>
                  <p className="font-medium">{customer.company || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(customer.status)}`}
                    >
                      {customer.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Created</label>
                  <p className="font-medium">
                    {new Date(customer.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-600" />
                Hosting Credentials
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">
                    HestiaCP Username
                  </label>
                  <code className="block bg-gray-100 px-3 py-2 rounded mt-1">
                    {customer.hestiaUsername}
                  </code>
                </div>
                <div>
                  <label className="text-sm text-gray-500">
                    HestiaCP Password
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded">
                      {showPassword
                        ? customer.hestiaPassword
                        : "••••••••••••••••"}
                    </code>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 hover:bg-gray-100 rounded transition"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <a
                  href={`https://${process.env.NEXT_PUBLIC_HESTIA_HOST || "194.238.27.251"}:8083`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  Open HestiaCP Panel <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Websites */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Websites ({customer.websites.length})
              </h2>
              {customer.websites.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No websites yet
                </p>
              ) : (
                <div className="space-y-3">
                  {customer.websites.map((website: any) => (
                    <div
                      key={website.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{website.subdomain}</p>
                        <p className="text-sm text-gray-500">
                          {website.domain || website.subdomain}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(website.status)}`}
                      >
                        {website.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Databases */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Databases ({customer.databases.length})
              </h2>
              {customer.databases.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No databases yet
                </p>
              ) : (
                <div className="space-y-3">
                  {customer.databases.map((db: any) => (
                    <div
                      key={db.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{db.name}</p>
                        <p className="text-sm text-gray-500">{db.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Package Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                Package
              </h2>
              <div className="text-center py-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {pkg?.name || customer.plan}
                </h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  Rp {customer.monthlyPrice.toLocaleString("id-ID")}
                </p>
                <p className="text-sm text-gray-500">
                  / {customer.billingCycle.toLowerCase()}
                </p>
              </div>
              <div className="border-t pt-4 mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Disk Space</span>
                  <span className="font-medium">{pkg?.diskSpace || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bandwidth</span>
                  <span className="font-medium">{pkg?.bandwidth || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Websites</span>
                  <span className="font-medium">{pkg?.websites || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Databases</span>
                  <span className="font-medium">{pkg?.databases || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email Accounts</span>
                  <span className="font-medium">
                    {pkg?.emailAccounts || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                Billing
              </h2>

              {/* Expiration Status */}
              {(() => {
                const expInfo = getExpirationInfo();
                if (expInfo) {
                  return (
                    <div
                      className={`mb-4 p-3 rounded-lg ${
                        expInfo.isExpired
                          ? "bg-red-50 border border-red-200"
                          : expInfo.daysRemaining <= 7
                            ? "bg-yellow-50 border border-yellow-200"
                            : "bg-green-50 border border-green-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {expInfo.isExpired ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-green-600" />
                        )}
                        <div>
                          {expInfo.isExpired ? (
                            <>
                              <p className="font-semibold text-red-600">
                                Expired
                              </p>
                              <p className="text-sm text-red-500">
                                {Math.abs(expInfo.daysRemaining)} days overdue
                              </p>
                            </>
                          ) : (
                            <>
                              <p
                                className={`font-semibold ${expInfo.daysRemaining <= 7 ? "text-yellow-600" : "text-green-600"}`}
                              >
                                {expInfo.daysRemaining} days remaining
                              </p>
                              <p
                                className={`text-sm ${expInfo.daysRemaining <= 7 ? "text-yellow-500" : "text-green-500"}`}
                              >
                                Expires:{" "}
                                {expInfo.expiresAt.toLocaleDateString("id-ID")}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-sm text-gray-500">
                      No expiration date set
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Billing Cycle</span>
                  <span className="font-medium">{customer.billingCycle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expiration Date</span>
                  <span className="font-medium">
                    {customer.expiresAt
                      ? new Date(customer.expiresAt).toLocaleDateString("id-ID")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Next Billing</span>
                  <span className="font-medium">
                    {customer.nextBillingDate
                      ? new Date(customer.nextBillingDate).toLocaleDateString(
                          "id-ID",
                        )
                      : "-"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setBillingModal(true)}
                className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Extend Subscription
              </button>
            </div>
          </div>
        </div>
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
                <span className="font-semibold">{customer.name}</span>?
              </p>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                ⚠️ This will also delete all websites, databases, and data
                associated with this customer. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

      {/* Add Billing Modal */}
      {billingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-green-600">
                Add Billing / Extend Subscription
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Extend subscription for{" "}
                <span className="font-semibold">{customer.name}</span>
              </p>

              {/* Current Status */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">Current Expiration:</span>
                  <span className="font-medium">
                    {customer.expiresAt
                      ? new Date(customer.expiresAt).toLocaleDateString("id-ID")
                      : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={`font-medium ${customer.status === "ACTIVE" ? "text-green-600" : "text-red-600"}`}
                  >
                    {customer.status}
                  </span>
                </div>
              </div>

              {/* Month Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Duration (Months)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 6].map((m) => (
                    <button
                      key={m}
                      onClick={() => setBillingMonths(m)}
                      className={`py-2 rounded-lg border transition ${
                        billingMonths === m
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                      }`}
                    >
                      {m} {m === 1 ? "Month" : "Months"}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[9, 12].map((m) => (
                    <button
                      key={m}
                      onClick={() => setBillingMonths(m)}
                      className={`py-2 rounded-lg border transition ${
                        billingMonths === m
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                      }`}
                    >
                      {m} Months
                    </button>
                  ))}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={billingMonths}
                      onChange={(e) =>
                        setBillingMonths(
                          Math.min(
                            12,
                            Math.max(1, parseInt(e.target.value) || 1),
                          ),
                        )
                      }
                      className="w-full py-2 px-3 border border-gray-300 rounded-lg text-center"
                      placeholder="Custom"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-green-50 rounded-lg text-sm">
                <p className="text-green-700">
                  <span className="font-medium">New Expiration: </span>
                  {(() => {
                    const startDate =
                      customer.expiresAt &&
                      new Date(customer.expiresAt) > new Date()
                        ? new Date(customer.expiresAt)
                        : new Date();
                    const newDate = new Date(startDate);
                    newDate.setMonth(newDate.getMonth() + billingMonths);
                    return newDate.toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  })()}
                </p>
                {customer.status === "SUSPENDED" && (
                  <p className="text-green-600 mt-1">
                    ✓ Customer will be reactivated
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setBillingModal(false);
                  setBillingMonths(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={addingBilling}
              >
                Cancel
              </button>
              <button
                onClick={handleAddBilling}
                disabled={addingBilling}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {addingBilling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add {billingMonths} Month(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

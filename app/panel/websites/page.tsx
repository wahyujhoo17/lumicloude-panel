"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Globe,
  Lock,
  HardDrive,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle,
  Link2,
  Copy,
  CheckCircle,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertTriangle,
  Edit,
  Trash2,
  FolderOpen,
} from "lucide-react";

interface Website {
  id: string;
  subdomain: string;
  customDomain: string | null;
  status: string;
  sslEnabled: boolean;
  phpVersion: string;
  ipAddress: string;
  diskUsage: number;
}

interface Customer {
  name: string;
  packageId: string;
  websites: Website[];
}

export default function WebsitesPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCustomDomainForm, setShowCustomDomainForm] = useState<
    string | null
  >(null);
  const [formData, setFormData] = useState({
    name: "",
    phpVersion: "8.1",
    enableSSL: true,
  });
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showDnsGuide, setShowDnsGuide] = useState<string | null>(null);

  // Edit website states
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [editFormData, setEditFormData] = useState({
    customDomain: "",
    phpVersion: "8.1",
  });
  const [updating, setUpdating] = useState(false);

  // Load customer data
  useEffect(() => {
    fetch("/api/customers/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCustomer(data.data);
        } else {
          setError("Failed to load customer data");
        }
      })
      .catch(() => {
        setError("Failed to load customer data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const response = await fetch("/api/websites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.data.message);
        setFormData({ name: "", phpVersion: "8.1", enableSSL: true });
        setShowAddForm(false);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(data.error || "Failed to create website");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create website");
    } finally {
      setCreating(false);
    }
  };

  const handleConnectCustomDomain = async (websiteId: string) => {
    if (!customDomainInput.trim()) return;
    setError("");
    setSuccess("");
    setConnectingDomain(true);

    try {
      const response = await fetch("/api/websites/custom-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          customDomain: customDomainInput.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.data.message);
        setCustomDomainInput("");
        setShowCustomDomainForm(null);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(data.error || "Failed to connect custom domain");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect custom domain");
    } finally {
      setConnectingDomain(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (website: Website) => {
    setEditingWebsite(website);
    setEditFormData({
      customDomain: website.customDomain || "",
      phpVersion: website.phpVersion || "8.1",
    });
    setError("");
  };

  // Handle update website
  const handleUpdateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebsite) return;

    setError("");
    setSuccess("");
    setUpdating(true);

    try {
      const response = await fetch(`/api/websites/${editingWebsite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDomain: editFormData.customDomain.trim() || null,
          phpVersion: editFormData.phpVersion,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Website updated successfully");
        setEditingWebsite(null);
        // Update local state
        if (customer) {
          setCustomer({
            ...customer,
            websites: customer.websites.map((w) =>
              w.id === editingWebsite.id
                ? {
                    ...w,
                    customDomain: editFormData.customDomain.trim() || null,
                    phpVersion: editFormData.phpVersion,
                  }
                : w,
            ),
          });
        }
      } else {
        setError(data.error || "Failed to update website");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update website");
    } finally {
      setUpdating(false);
    }
  };

  // Handle remove custom domain
  const handleRemoveCustomDomain = async (websiteId: string) => {
    if (!confirm("Are you sure you want to remove the custom domain?")) return;

    setError("");
    setUpdating(true);

    try {
      const response = await fetch(`/api/websites/${websiteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDomain: null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Custom domain removed successfully");
        // Update local state
        if (customer) {
          setCustomer({
            ...customer,
            websites: customer.websites.map((w) =>
              w.id === websiteId ? { ...w, customDomain: null } : w,
            ),
          });
        }
      } else {
        setError(data.error || "Failed to remove custom domain");
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove custom domain");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full p-6 bg-white rounded-xl shadow">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center">Error</h2>
          <p className="mt-2 text-gray-600 text-center">
            {error || "Customer data not found"}
          </p>
          <button
            onClick={() => router.push("/panel")}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const packageLimits: Record<string, { websites: number; name: string }> = {
    starter: { websites: 3, name: "Starter" },
    business: { websites: 10, name: "Business" },
    enterprise: { websites: 0, name: "Enterprise" },
  };

  const limit = packageLimits[customer.packageId] || {
    websites: 1,
    name: "Basic",
  };
  const canAddMore =
    limit.websites === 0 || customer.websites.length < limit.websites;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={{ email: customer?.name || "", role: "USER" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push("/panel")}
                className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                Your Websites
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your websites — {customer.websites.length} of{" "}
                {limit.websites === 0 ? "unlimited" : limit.websites} used
              </p>
            </div>
            {canAddMore && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Website
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="ml-3 text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Add Website Form */}
        {showAddForm && (
          <div className="mb-8 bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Website
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setError("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., myshop, portfolio, blog"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={2}
                  disabled={creating}
                />
                <p className="mt-1 text-xs text-gray-500">
                  A unique subdomain will be auto-generated (e.g.,
                  myshopx7k2a.lumicloude.my.id). You can connect your own domain
                  later.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PHP Version
                </label>
                <select
                  value={formData.phpVersion}
                  onChange={(e) =>
                    setFormData({ ...formData, phpVersion: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={creating}
                >
                  <option value="7.4">PHP 7.4</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="8.1">PHP 8.1 (Recommended)</option>
                  <option value="8.2">PHP 8.2</option>
                  <option value="8.3">PHP 8.3</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableSSL"
                  checked={formData.enableSSL}
                  onChange={(e) =>
                    setFormData({ ...formData, enableSSL: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={creating}
                />
                <label
                  htmlFor="enableSSL"
                  className="ml-2 text-sm text-gray-700"
                >
                  Enable SSL Certificate (Let&apos;s Encrypt) — Recommended
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Create Website
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError("");
                  }}
                  disabled={creating}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Package Limit Warning */}
        {!canAddMore && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Website limit reached!</strong> Your {limit.name} package
              allows {limit.websites} website(s). Upgrade your package to add
              more.
            </p>
          </div>
        )}

        {/* Websites List */}
        <div className="space-y-6">
          {customer.websites.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No websites yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first website to get started.
              </p>
              {canAddMore && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Website
                </button>
              )}
            </div>
          ) : (
            customer.websites.map((website) => (
              <div
                key={website.id}
                className="bg-white rounded-xl shadow-md overflow-hidden"
              >
                {/* Website Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Side - Website Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <Globe className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {/* Primary Domain Name */}
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center flex-wrap gap-2">
                            <span className="truncate">
                              {website.customDomain || website.subdomain}
                            </span>
                            {website.sslEnabled && (
                              <Lock
                                className="w-4 h-4 text-green-500 flex-shrink-0"
                                title="SSL Enabled"
                              />
                            )}
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                                website.status === "ACTIVE"
                                  ? "bg-green-100 text-green-800"
                                  : website.status === "SSL_PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {website.status}
                            </span>
                          </h3>

                          {/* Generated Domain (subdomain) */}
                          <div className="mt-1.5 flex items-center text-sm text-gray-500">
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium mr-2">
                              Generated Domain
                            </span>
                            <span className="font-mono text-xs truncate">
                              {website.subdomain}
                            </span>
                            <button
                              onClick={() =>
                                handleCopy(
                                  website.subdomain,
                                  "subdomain-" + website.id,
                                )
                              }
                              className="ml-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                              title="Copy subdomain"
                            >
                              {copied === "subdomain-" + website.id ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Custom Domain */}
                          {website.customDomain && (
                            <div className="mt-1.5 flex items-center text-sm text-purple-600">
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium mr-2">
                                Custom Domain
                              </span>
                              <a
                                href={`https://${website.customDomain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline flex items-center truncate"
                              >
                                {website.customDomain}
                                <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                              </a>
                            </div>
                          )}

                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                            <span className="flex items-center">
                              <span className="font-medium">PHP</span>&nbsp;
                              {website.phpVersion}
                            </span>
                            <span className="flex items-center">
                              <HardDrive className="w-3.5 h-3.5 mr-1" />
                              {website.diskUsage.toFixed(0)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Action Buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <a
                        href={`https://${website.customDomain || website.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit Site
                      </a>
                      <button
                        onClick={() =>
                          router.push(
                            `/panel/files?domain=${website.subdomain}`,
                          )
                        }
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm whitespace-nowrap"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Manage Files
                      </button>
                      <button
                        onClick={() => handleOpenEdit(website)}
                        className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm whitespace-nowrap"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      {!website.customDomain && (
                        <button
                          onClick={() => {
                            setShowCustomDomainForm(
                              showCustomDomainForm === website.id
                                ? null
                                : website.id,
                            );
                            setCustomDomainInput("");
                            setError("");
                          }}
                          className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm whitespace-nowrap"
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Custom Domain
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Domain Form */}
                {showCustomDomainForm === website.id && (
                  <div className="border-t border-gray-200 bg-gradient-to-b from-purple-50 to-gray-50 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      <Link2 className="w-5 h-5 mr-2 text-purple-600" />
                      Hubungkan Custom Domain ke Website Anda
                    </h4>
                    <p className="text-sm text-gray-500 mb-5">
                      Arahkan domain milik Anda ke generated domain{" "}
                      <strong className="font-mono text-gray-700">
                        {website.subdomain}
                      </strong>{" "}
                      agar website Anda bisa diakses melalui domain sendiri.
                    </p>

                    {/* Step-by-step Instructions */}
                    <div className="mb-6 space-y-4">
                      <div className="bg-white border border-blue-200 rounded-lg p-5">
                        <h5 className="text-sm font-semibold text-blue-800 flex items-center mb-4">
                          <Info className="w-4 h-4 mr-2" />
                          Cara Menghubungkan Custom Domain
                        </h5>

                        <div className="space-y-4 text-sm text-gray-700">
                          {/* Step 1 */}
                          <div className="flex items-start">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                              1
                            </span>
                            <div>
                              <p className="font-semibold">
                                Login ke DNS Management domain Anda
                              </p>
                              <p className="text-gray-500 mt-0.5">
                                Buka panel DNS di registrar domain Anda
                                (misalnya Namecheap, GoDaddy, Cloudflare,
                                Niagahoster, dll).
                              </p>
                            </div>
                          </div>

                          {/* Step 2 */}
                          <div className="flex items-start">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                              2
                            </span>
                            <div>
                              <p className="font-semibold">
                                Tambahkan CNAME Record
                              </p>
                              <p className="text-gray-500 mt-0.5">
                                Buat DNS record baru dengan konfigurasi berikut:
                              </p>
                              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                                <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                  <span className="text-gray-500">Type:</span>
                                  <span className="font-bold text-blue-700">
                                    CNAME
                                  </span>
                                </div>
                                <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                  <span className="text-gray-500">Name:</span>
                                  <span className="font-bold">
                                    @{" "}
                                    <span className="text-gray-400 font-normal">
                                      (atau www)
                                    </span>
                                  </span>
                                </div>
                                <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                  <span className="text-gray-500">Value:</span>
                                  <div className="flex items-center">
                                    <span className="font-bold text-purple-700 break-all">
                                      {website.subdomain}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleCopy(
                                          website.subdomain,
                                          "cname-" + website.id,
                                        )
                                      }
                                      className="ml-2 text-blue-600 hover:text-blue-700 flex-shrink-0"
                                      title="Copy"
                                    >
                                      {copied === "cname-" + website.id ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                  <span className="text-gray-500">TTL:</span>
                                  <span>
                                    3600{" "}
                                    <span className="text-gray-400 font-normal">
                                      (atau Auto)
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Step 3 */}
                          <div className="flex items-start">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                              3
                            </span>
                            <div>
                              <p className="font-semibold">
                                Tunggu DNS Propagation (5-30 menit)
                              </p>
                              <p className="text-gray-500 mt-0.5">
                                DNS membutuhkan waktu untuk menyebar ke seluruh
                                dunia. Cek status di{" "}
                                <a
                                  href="https://dnschecker.org"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline font-medium"
                                >
                                  dnschecker.org
                                </a>
                              </p>
                            </div>
                          </div>

                          {/* Step 4 */}
                          <div className="flex items-start">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                              4
                            </span>
                            <div>
                              <p className="font-semibold">
                                Masukkan domain Anda di bawah dan klik Connect
                              </p>
                              <p className="text-gray-500 mt-0.5">
                                Setelah DNS sudah aktif, hubungkan domain ke
                                website Anda.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="mt-4 space-y-2">
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-yellow-800">
                              <strong>Catatan:</strong> Beberapa registrar tidak
                              mendukung CNAME pada root domain (@). Gunakan{" "}
                              <strong>www</strong> sebagai Name, atau gunakan
                              registrar yang mendukung CNAME Flattening seperti{" "}
                              <strong>Cloudflare</strong>.
                            </p>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
                            <Lightbulb className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-800">
                              <strong>Tips:</strong> Jika menggunakan
                              Cloudflare, pastikan Proxy Status dalam keadaan{" "}
                              <strong>DNS Only (grey cloud)</strong> agar CNAME
                              berfungsi langsung ke server kami.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Domain Input */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Masukkan Custom Domain Anda
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={customDomainInput}
                          onChange={(e) => setCustomDomainInput(e.target.value)}
                          placeholder="contoh: mydomain.com atau www.mydomain.com"
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          disabled={connectingDomain}
                        />
                        <button
                          onClick={() => handleConnectCustomDomain(website.id)}
                          disabled={
                            connectingDomain || !customDomainInput.trim()
                          }
                          className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center text-sm font-medium"
                        >
                          {connectingDomain ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="w-4 h-4 mr-2" />
                              Connect
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowCustomDomainForm(null);
                            setCustomDomainInput("");
                            setError("");
                          }}
                          disabled={connectingDomain}
                          className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Custom Domain Info + Collapsible DNS Guide */}
                {website.customDomain && (
                  <div className="border-t border-gray-200">
                    {/* Connection Status */}
                    <div className="bg-green-50 p-4">
                      <div className="flex items-start text-sm text-green-800">
                        <CheckCircle className="w-5 h-5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-green-900">
                            Custom domain{" "}
                            <strong>{website.customDomain}</strong> berhasil
                            terhubung!
                          </p>
                          <p className="mt-1 text-green-700">
                            Pengunjung dapat mengakses website Anda melalui:{" "}
                            <a
                              href={`https://${website.customDomain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-semibold hover:text-green-900"
                            >
                              https://{website.customDomain}
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible DNS Setup Guide */}
                    <div className="border-t border-gray-200">
                      <button
                        onClick={() =>
                          setShowDnsGuide(
                            showDnsGuide === website.id ? null : website.id,
                          )
                        }
                        className="w-full flex items-center justify-between px-6 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm"
                      >
                        <span className="flex items-center font-medium text-gray-700">
                          <Info className="w-4 h-4 mr-2 text-blue-600" />
                          Cara Menghubungkan Domain {website.customDomain}
                        </span>
                        {showDnsGuide === website.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {showDnsGuide === website.id && (
                        <div className="bg-gray-50 px-6 pb-6">
                          <p className="text-sm text-gray-500 mb-4">
                            Pastikan DNS domain{" "}
                            <strong>{website.customDomain}</strong> sudah
                            diarahkan ke generated domain Anda agar website
                            dapat diakses.
                          </p>

                          <div className="bg-white border border-blue-200 rounded-lg p-5">
                            <h5 className="text-sm font-semibold text-blue-800 mb-4 flex items-center">
                              <Info className="w-4 h-4 mr-2" />
                              Langkah-langkah Setup DNS
                            </h5>

                            <div className="space-y-4 text-sm text-gray-700">
                              {/* Step 1 */}
                              <div className="flex items-start">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                                  1
                                </span>
                                <div>
                                  <p className="font-semibold">
                                    Login ke DNS Management domain Anda
                                  </p>
                                  <p className="text-gray-500 mt-0.5">
                                    Buka panel DNS di registrar domain Anda
                                    (misalnya Namecheap, GoDaddy, Cloudflare,
                                    Niagahoster, Domainesia, dll).
                                  </p>
                                </div>
                              </div>

                              {/* Step 2 */}
                              <div className="flex items-start">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                                  2
                                </span>
                                <div>
                                  <p className="font-semibold">
                                    Tambahkan / Edit CNAME Record
                                  </p>
                                  <p className="text-gray-500 mt-0.5">
                                    Arahkan domain Anda ke generated domain
                                    berikut:
                                  </p>
                                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                                    <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                      <span className="text-gray-500">
                                        Type:
                                      </span>
                                      <span className="font-bold text-blue-700">
                                        CNAME
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                      <span className="text-gray-500">
                                        Name:
                                      </span>
                                      <span className="font-bold">
                                        @{" "}
                                        <span className="text-gray-400 font-normal">
                                          (atau www)
                                        </span>
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                      <span className="text-gray-500">
                                        Value:
                                      </span>
                                      <div className="flex items-center">
                                        <span className="font-bold text-purple-700 break-all">
                                          {website.subdomain}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleCopy(
                                              website.subdomain,
                                              "dns-cname-" + website.id,
                                            )
                                          }
                                          className="ml-2 text-blue-600 hover:text-blue-700 flex-shrink-0"
                                          title="Copy"
                                        >
                                          {copied ===
                                          "dns-cname-" + website.id ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                          ) : (
                                            <Copy className="w-4 h-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr] gap-1 font-mono text-xs">
                                      <span className="text-gray-500">
                                        TTL:
                                      </span>
                                      <span>
                                        3600{" "}
                                        <span className="text-gray-400 font-normal">
                                          (atau Auto)
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Step 3 */}
                              <div className="flex items-start">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                                  3
                                </span>
                                <div>
                                  <p className="font-semibold">
                                    Verifikasi DNS Propagation
                                  </p>
                                  <p className="text-gray-500 mt-0.5">
                                    DNS membutuhkan waktu 5-30 menit untuk
                                    menyebar. Cek status di{" "}
                                    <a
                                      href={`https://dnschecker.org/#CNAME/${website.customDomain}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline font-medium"
                                    >
                                      dnschecker.org
                                    </a>
                                  </p>
                                </div>
                              </div>

                              {/* Step 4 */}
                              <div className="flex items-start">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center mr-3 mt-0.5">
                                  <CheckCircle className="w-4 h-4" />
                                </span>
                                <div>
                                  <p className="font-semibold text-green-700">
                                    Selesai!
                                  </p>
                                  <p className="text-gray-500 mt-0.5">
                                    Setelah DNS aktif, website Anda akan bisa
                                    diakses melalui{" "}
                                    <a
                                      href={`https://${website.customDomain}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline font-medium"
                                    >
                                      https://{website.customDomain}
                                    </a>
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Tips */}
                            <div className="mt-4 space-y-2">
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-yellow-800">
                                  <strong>Catatan:</strong> Beberapa registrar
                                  tidak mendukung CNAME pada root domain (@).
                                  Gunakan <strong>www</strong> sebagai Name,
                                  atau gunakan registrar yang mendukung CNAME
                                  Flattening seperti <strong>Cloudflare</strong>
                                  .
                                </p>
                              </div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
                                <Lightbulb className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-blue-800">
                                  <strong>Tips:</strong> Jika menggunakan
                                  Cloudflare, pastikan Proxy Status dalam
                                  keadaan <strong>DNS Only (grey cloud)</strong>{" "}
                                  agar CNAME berfungsi langsung ke server kami.
                                </p>
                              </div>
                              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start">
                                <Link2 className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-purple-800">
                                  <strong>Ringkasan:</strong>{" "}
                                  <span className="font-mono bg-purple-100 px-1 rounded">
                                    {website.customDomain}
                                  </span>
                                  {" → "}
                                  <span className="font-mono bg-purple-100 px-1 rounded">
                                    {website.subdomain}
                                  </span>
                                  {" (via CNAME)"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Website Modal */}
      {editingWebsite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Website
              </h3>
              <button
                onClick={() => setEditingWebsite(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateWebsite} className="p-6 space-y-4">
              {/* Website Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Subdomain</p>
                <p className="font-mono text-sm">{editingWebsite.subdomain}</p>
              </div>

              {/* Custom Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Domain
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editFormData.customDomain}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        customDomain: e.target.value,
                      })
                    }
                    placeholder="example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={updating}
                  />
                  {editingWebsite.customDomain && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveCustomDomain(editingWebsite.id)
                      }
                      className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                      disabled={updating}
                      title="Remove custom domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Pastikan DNS sudah diarahkan ke subdomain sebelum menambahkan
                  custom domain.
                </p>
              </div>

              {/* PHP Version */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PHP Version
                </label>
                <select
                  value={editFormData.phpVersion}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      phpVersion: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updating}
                >
                  <option value="7.4">PHP 7.4</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.2">PHP 8.2</option>
                  <option value="8.3">PHP 8.3</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Pilih versi PHP yang sesuai dengan kebutuhan aplikasi Anda.
                </p>
              </div>

              {/* Error Message in Modal */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingWebsite(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

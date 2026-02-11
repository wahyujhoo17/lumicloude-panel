"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle, Check } from "lucide-react";
import { Navbar } from "@/components/navbar";

interface Package {
  id: string;
  name: string;
  hestiaPackageName: string;
  diskQuota: string;
  bandwidth: string;
  webDomains: number;
  databases: number;
  webAliases: number;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    customDomain: "",
    packageId: "", // Will be set after packages load
    phpVersion: "8.1",
    needDatabase: false,
  });

  const [packageWarning, setPackageWarning] = useState<string>("");

  // Fetch packages from HestiaCP on component mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoadingPackages(true);
        const response = await fetch("/api/packages");
        const data = await response.json();

        if (data.success && data.data.packages.length > 0) {
          setPackages(data.data.packages);

          // Show warning if using default packages
          if (data.data.warning) {
            setPackageWarning(data.data.warning);
          }

          // Set first package as default
          setFormData((prev) => ({
            ...prev,
            packageId: data.data.packages[0].id,
          }));
        } else {
          setError("No packages available");
        }
      } catch (err: any) {
        console.error("Failed to fetch packages:", err);
        setError("Failed to load packages");
      } finally {
        setLoadingPackages(false);
      }
    };

    fetchPackages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/customers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Failed to create customer");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar
          user={{
            email: session?.user?.email,
            name: session?.user?.name,
            role: "Admin",
          }}
        />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Created Successfully!
            </h1>
            <p className="text-gray-600 mt-1">
              New customer account has been set up
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-l-4 border-green-500">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600 mr-4" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {result.customer.name}
                </h2>
                <p className="text-gray-600">{result.customer.email}</p>
                {result.customer.package && (
                  <div className="mt-1">
                    <span className="text-sm font-medium text-purple-600">
                      {result.customer.package} Package
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Resource Limits */}
            {result.resourceLimits && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-blue-600 mr-2">📦</span>
                  Resource Limits
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Disk Space</div>
                    <div className="font-semibold text-gray-900">
                      {result.resourceLimits.diskSpace}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Bandwidth</div>
                    <div className="font-semibold text-gray-900">
                      {result.resourceLimits.bandwidth}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Websites</div>
                    <div className="font-semibold text-gray-900">
                      {result.resourceLimits.websites}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Databases</div>
                    <div className="font-semibold text-gray-900">
                      {result.resourceLimits.databases}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Website Details */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Website Details
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Subdomain:{" "}
                  </span>
                  <a
                    href={result.website.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {result.customer.subdomain}
                  </a>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Status:{" "}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      result.website.sslEnabled
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {result.website.status}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    SSL:{" "}
                  </span>
                  <span>
                    {result.website.sslEnabled ? "✅ Enabled" : "⏳ Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* HestiaCP Credentials */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                HestiaCP Access
              </h3>
              <div className="bg-gray-50 p-4 rounded space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    URL:{" "}
                  </span>
                  <a
                    href={result.credentials.hestiaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {result.credentials.hestiaUrl}
                  </a>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Username:{" "}
                  </span>
                  <code className="bg-white px-2 py-1 rounded text-sm">
                    {result.credentials.hestiaUsername}
                  </code>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Password:{" "}
                  </span>
                  <code className="bg-white px-2 py-1 rounded text-sm">
                    {result.credentials.hestiaPassword}
                  </code>
                </div>
              </div>
            </div>

            {/* Database Details */}
            {result.database && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Database Details
                </h3>
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Database Name:{" "}
                    </span>
                    <code className="bg-white px-2 py-1 rounded text-sm">
                      {result.database.name}
                    </code>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Username:{" "}
                    </span>
                    <code className="bg-white px-2 py-1 rounded text-sm">
                      {result.database.username}
                    </code>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Password:{" "}
                    </span>
                    <code className="bg-white px-2 py-1 rounded text-sm">
                      {result.database.password}
                    </code>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Host:{" "}
                    </span>
                    <code className="bg-white px-2 py-1 rounded text-sm">
                      {result.database.host}
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            {result.nextSteps && result.nextSteps.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Next Steps</h3>
                <div className="bg-blue-50 p-4 rounded">
                  {result.nextSteps.map((step: string, index: number) => (
                    <p key={index} className="text-sm text-blue-900">
                      {step}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => router.push("/dashboard/customers")}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                View All Customers
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    customDomain: "",
                    packageId: packages.length > 0 ? packages[0].id : "",
                    phpVersion: "8.1",
                    needDatabase: false,
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Add Another Customer
              </button>
            </div>
          </div>
        </main>
      </div>
    );
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/customers"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Customers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
          <p className="text-gray-600 mt-1">Create a new hosting account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 space-y-6"
        >
          {/* Customer Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+62 812 3456 7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Company Name"
                />
              </div>
            </div>
          </div>

          {/* Hosting Configuration */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Hosting Package
            </h2>

            {/* Loading State */}
            {loadingPackages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-2 text-gray-600">
                  Loading packages from HestiaCP...
                </span>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-red-600">
                No packages available. Please create packages in HestiaCP first.
              </div>
            ) : (
              <>
                {/* Package Warning */}
                {packageWarning && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <h3 className="font-medium text-yellow-900 text-sm">
                          Package Information
                        </h3>
                        <p className="text-yellow-700 text-sm mt-1">
                          {packageWarning}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Package Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {packages.map((pkg) => {
                    const isSelected = formData.packageId === pkg.id;
                    const diskSpace =
                      pkg.diskQuota === "unlimited"
                        ? "Unlimited"
                        : `${pkg.diskQuota} MB`;
                    const bandwidth =
                      pkg.bandwidth === "unlimited"
                        ? "Unlimited"
                        : `${pkg.bandwidth} MB`;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() =>
                          setFormData({ ...formData, packageId: pkg.id })
                        }
                        className={`relative border-2 rounded-lg p-5 cursor-pointer transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                          {pkg.name}
                        </h3>

                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{diskSpace} Disk Space</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{bandwidth} Bandwidth</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>
                              {pkg.webDomains === 0
                                ? "Unlimited"
                                : pkg.webDomains}{" "}
                              Website
                              {pkg.webDomains !== 1 ? "s" : ""}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>
                              {pkg.databases === 0
                                ? "Unlimited"
                                : pkg.databases}{" "}
                              Database
                              {pkg.databases !== 1 ? "s" : ""}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>
                              {pkg.webAliases === 0
                                ? "Unlimited"
                                : pkg.webAliases}{" "}
                              Domain Alias
                              {pkg.webAliases !== 1 ? "es" : ""}
                            </span>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Free SSL Certificate</span>
                          </li>
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PHP Version
                </label>
                <select
                  value={formData.phpVersion}
                  onChange={(e) =>
                    setFormData({ ...formData, phpVersion: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7.4">PHP 7.4</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.2">PHP 8.2</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Domain (Optional)
                </label>
                <input
                  type="text"
                  value={formData.customDomain}
                  onChange={(e) =>
                    setFormData({ ...formData, customDomain: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Customer will need to point their domain to the subdomain
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.needDatabase}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        needDatabase: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Create MySQL database for this customer
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Customer...
                </>
              ) : (
                "Create Customer"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";

export default function DNSPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "A",
    name: "",
    value: "",
    priority: "",
    ttl: "3600",
  });

  useEffect(() => {
    loadDNS();
  }, []);

  const loadDNS = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/panel/dns");
      const data = await res.json();
      if (data.success) {
        setDomain(data.data.domain);
        setRecords(Array.isArray(data.data.records) ? data.data.records : []);
      }
    } catch (error) {
      console.error("Error loading DNS:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setCreating(true);
      const res = await fetch("/api/panel/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, domain }),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setFormData({
          type: "A",
          name: "",
          value: "",
          priority: "",
          ttl: "3600",
        });
        loadDNS();
        alert("DNS record added successfully!");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating DNS record:", error);
      alert("Failed to create DNS record");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (recordId: number) => {
    if (!confirm("Are you sure you want to delete this DNS record?")) return;

    try {
      const res = await fetch(
        `/api/panel/dns?domain=${domain}&id=${recordId}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      if (data.success) {
        loadDNS();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error deleting DNS record:", error);
      alert("Failed to delete DNS record");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DNS Management</h1>
            <p className="text-gray-600 mt-2">
              Manage DNS records for {domain}
            </p>
          </div>
          <button
            onClick={() => router.push("/panel")}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Panel
          </button>
        </div>

        {/* Create DNS Record Form */}
        {showForm ? (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add DNS Record</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A">A</option>
                    <option value="AAAA">AAAA</option>
                    <option value="CNAME">CNAME</option>
                    <option value="MX">MX</option>
                    <option value="TXT">TXT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="@ or subdomain"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="IP address or target"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.type === "MX" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="10"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TTL (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.ttl}
                    onChange={(e) =>
                      setFormData({ ...formData, ttl: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Add Record"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add DNS Record
          </button>
        )}

        {/* DNS Records List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Cloud className="w-5 h-5 mr-2 text-green-600" />
              DNS Records
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
              <p className="text-gray-600 mt-3">Loading DNS records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Cloud className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No DNS records yet</p>
              <p className="text-sm mt-1">Add your first DNS record above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TTL
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.name || "@"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.ttl}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DNS Info */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">
            ⚠️ Important Notes
          </h4>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>DNS changes can take 5-60 minutes to propagate globally</li>
            <li>Be careful when modifying existing records</li>
            <li>
              Some system records are managed automatically and cannot be
              deleted
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

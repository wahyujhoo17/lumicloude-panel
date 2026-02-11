"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function EmailPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ account: "", password: "" });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/panel/email");
      const data = await res.json();
      if (data.success) {
        setEmails(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Error loading emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account || !formData.password) return;

    try {
      setCreating(true);
      const res = await fetch("/api/panel/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setFormData({ account: "", password: "" });
        loadEmails();
        alert("Email account created successfully!");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating email:", error);
      alert("Failed to create email account");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (account: string, domain: string) => {
    if (!confirm(`Are you sure you want to delete ${account}@${domain}?`))
      return;

    try {
      const res = await fetch(
        `/api/panel/email?account=${account}&domain=${domain}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      if (data.success) {
        loadEmails();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error deleting email:", error);
      alert("Failed to delete email account");
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Accounts</h1>
            <p className="text-gray-600 mt-2">
              Manage email accounts for your domains
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

        {/* Create Email Form */}
        {showForm ? (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create Email Account</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="text"
                  value={formData.account}
                  onChange={(e) =>
                    setFormData({ ...formData, account: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="info"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter account name only (e.g., "info" for info@yourdomain.com)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Account"}
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
            Create Email Account
          </button>
        )}

        {/* Email List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-cyan-50 to-cyan-100 border-b border-cyan-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-cyan-600" />
              Email Accounts
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-600" />
              <p className="text-gray-600 mt-3">Loading email accounts...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No email accounts yet</p>
              <p className="text-sm mt-1">
                Create your first email account above
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {emails.map((email, index) => (
                <div
                  key={index}
                  className="px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {email.account}@{email.domain}
                      </h4>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>
                          <span className="text-gray-600">Quota:</span>
                          <span className="ml-2 text-gray-900">
                            {email.quota || "Unlimited"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className="ml-2 text-green-600 font-medium">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(email.account, email.domain)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Client Settings */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            Email Client Settings
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>Incoming (IMAP):</strong> mail.yourdomain.com, Port 993
              (SSL)
            </p>
            <p>
              <strong>Outgoing (SMTP):</strong> mail.yourdomain.com, Port 465
              (SSL)
            </p>
            <p>
              <strong>Username:</strong> Full email address (e.g.,
              info@yourdomain.com)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

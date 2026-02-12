"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Database,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  X,
} from "lucide-react";

export default function DatabasesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );
  const [customer, setCustomer] = useState<any>(null);
  const [phpMyAdminUrl, setPhpMyAdminUrl] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDatabases();
    loadCustomer();
  }, []);

  const loadCustomer = async () => {
    try {
      const res = await fetch("/api/customers/me");
      const data = await res.json();
      if (data.success) {
        setCustomer(data.data);

        // Set user data for Navbar
        setUser({
          name: data.data.name,
          email: data.data.email,
          role: "USER", // Customer role
        });

        // Get customer's first website subdomain for phpMyAdmin access
        if (data.data.websites && data.data.websites.length > 0) {
          const subdomain = data.data.websites[0].subdomain;
          setPhpMyAdminUrl(`https://${subdomain}/phpmyadmin/`);
        }
      }
    } catch (error) {
      console.error("Error loading customer:", error);
    }
  };

  const loadDatabases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/panel/databases");
      const data = await res.json();
      if (data.success) {
        setDatabases(data.data.local);
      }
    } catch (error) {
      console.error("Error loading databases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName) return;

    try {
      setCreating(true);
      const res = await fetch("/api/panel/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDbName }),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setNewDbName("");
        loadDatabases();
        toast({
          title: "Success!",
          description: "Database created successfully",
          variant: "success",
        });
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error creating database:", error);
      toast({
        title: "Error",
        description: "Failed to create database",
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ show: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/panel/databases?id=${deleteModal.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        loadDatabases();
        toast({
          title: "Success!",
          description: "Database deleted successfully",
          variant: "success",
        });
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting database:", error);
      toast({
        title: "Error",
        description: "Failed to delete database",
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openPhpMyAdmin = (db: any) => {
    if (!phpMyAdminUrl || !customer) {
      toast({
        title: "Error",
        description: "phpMyAdmin information not available",
        variant: "error",
      });
      return;
    }

    // Create a form to submit credentials to phpMyAdmin
    const form = document.createElement("form");
    form.method = "POST";
    form.action = phpMyAdminUrl;
    form.target = "_blank";

    // Add phpMyAdmin login credentials
    const fields = {
      pma_username: db.username,
      pma_password: db.password,
      server: "1",
      target: "index.php",
      token: "",
    };

    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <>
      <Navbar user={user} />
      <Toaster />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Database Management
              </h1>
              <p className="text-gray-600 mt-2">
                Create and manage MySQL databases
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

          {/* Create Database Form */}
          {showForm ? (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                Create New Database
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Name
                  </label>
                  <input
                    type="text"
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="myapp"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Name will be prefixed with your username
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create Database"}
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
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Create Database
              </button>
              {phpMyAdminUrl && (
                <a
                  href={phpMyAdminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  title="Open phpMyAdmin"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  phpMyAdmin
                </a>
              )}
            </div>
          )}

          {/* Databases List */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Database className="w-5 h-5 mr-2 text-purple-600" />
                Your Databases
              </h3>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                <p className="text-gray-600 mt-3">Loading databases...</p>
              </div>
            ) : databases.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No databases yet</p>
                <p className="text-sm mt-1">Create your first database above</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {databases.map((db) => (
                  <div
                    key={db.id}
                    className="px-6 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {db.name}
                        </h4>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-gray-600">Username:</span>
                              <code className="ml-2 bg-gray-100 px-2 py-1 rounded">
                                {db.username}
                              </code>
                            </div>
                            <div>
                              <span className="text-gray-600">Host:</span>
                              <code className="ml-2 bg-gray-100 px-2 py-1 rounded">
                                {db.host}:{db.port}
                              </code>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Password:</span>
                            <code className="ml-2 bg-gray-100 px-2 py-1 rounded">
                              {showPasswords[db.id]
                                ? db.password
                                : "••••••••••••"}
                            </code>
                            <button
                              onClick={() => togglePasswordVisibility(db.id)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              {showPasswords[db.id] ? (
                                <EyeOff className="w-4 h-4 inline" />
                              ) : (
                                <Eye className="w-4 h-4 inline" />
                              )}
                            </button>
                          </div>
                          <div>
                            <span className="text-gray-600">Size:</span>
                            <span className="ml-2 text-gray-900">
                              {db.size.toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openPhpMyAdmin(db)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1"
                          title="Open in phpMyAdmin"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(db.id, db.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete database"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection Info */}
          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Connection Information
              </h4>
              <p className="text-sm text-blue-800">
                Use these credentials to connect your application to the
                database. For security, never commit database passwords to your
                code repository.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                phpMyAdmin Access
              </h4>

              <p className="text-sm text-green-800 mb-3">
                Click the <ExternalLink className="w-3 h-3 inline" /> icon next
                to any database to open it in phpMyAdmin. Your credentials will
                be automatically filled in.
              </p>
              {phpMyAdminUrl ? (
                <div className="text-sm bg-white rounded p-3 border border-green-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-green-700 font-medium block mb-1">
                        phpMyAdmin URL:
                      </span>
                      <a
                        href={phpMyAdminUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all text-sm"
                      >
                        {phpMyAdminUrl}
                      </a>
                    </div>
                    <a
                      href={phpMyAdminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1 whitespace-nowrap text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-orange-700 bg-orange-50 rounded p-3 border border-orange-300">
                  ⚠️ No website configured yet. Create a website first to access
                  phpMyAdmin.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Database
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete database{" "}
                  <span className="font-semibold text-gray-900">
                    {deleteModal.name}
                  </span>
                  ? This action cannot be undone and all data will be
                  permanently lost.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteModal(null)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

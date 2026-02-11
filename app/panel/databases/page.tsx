"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function DatabasesPage() {
  const router = useRouter();
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    loadDatabases();
  }, []);

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
        alert("Database created successfully!");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating database:", error);
      alert("Failed to create database");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete database "${name}"?`)) return;

    try {
      const res = await fetch(`/api/panel/databases?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        loadDatabases();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error deleting database:", error);
      alert("Failed to delete database");
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
            <h3 className="text-lg font-semibold mb-4">Create New Database</h3>
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
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Database
          </button>
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
                      <h4 className="font-semibold text-gray-900">{db.name}</h4>
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
                    <button
                      onClick={() => handleDelete(db.id, db.name)}
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

        {/* Connection Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            Connection Information
          </h4>
          <p className="text-sm text-blue-800">
            Use these credentials to connect your application to the database.
            For security, never commit database passwords to your code
            repository.
          </p>
        </div>
      </div>
    </div>
  );
}

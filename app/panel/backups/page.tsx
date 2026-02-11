"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  HardDrive,
  Plus,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Download,
} from "lucide-react";

export default function BackupsPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/panel/backups");
      const data = await res.json();
      if (data.success) {
        setBackups(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Error loading backups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (
      !confirm("Create a backup of your account? This may take a few minutes.")
    )
      return;

    try {
      setCreating(true);
      const res = await fetch("/api/panel/backups", {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        alert("Backup created successfully!");
        loadBackups();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      alert("Failed to create backup");
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupName: string) => {
    if (
      !confirm(
        `Are you sure you want to restore from "${backupName}"? This will replace your current data.`,
      )
    ) {
      return;
    }

    try {
      setRestoring(true);
      const res = await fetch("/api/panel/backups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: backupName }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Backup restored successfully!");
        loadBackups();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error restoring backup:", error);
      alert("Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Backup Management
            </h1>
            <p className="text-gray-600 mt-2">
              Create and restore backups of your account
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

        {/* Create Backup Button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Backup
              </>
            )}
          </button>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Backups List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <HardDrive className="w-5 h-5 mr-2 text-orange-600" />
              Available Backups
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600" />
              <p className="text-gray-600 mt-3">Loading backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <HardDrive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No backups available</p>
              <p className="text-sm mt-1">
                Create your first backup using the button above
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {backups.map((backup, index) => (
                <div
                  key={index}
                  className="px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {backup.name}
                      </h4>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Created:</span>{" "}
                          {new Date(backup.date).toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Size:</span>{" "}
                          {(backup.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p>
                          <span className="font-medium">Type:</span>{" "}
                          {backup.type || "Full Backup"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(backup.name)}
                        disabled={restoring}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backup Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            📦 Backup Information
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              Backups include all your files, databases, and email accounts
            </li>
            <li>
              Creating a backup may take several minutes depending on your data
              size
            </li>
            <li>
              Restoring a backup will replace all current data with backup data
            </li>
            <li>Keep regular backups to protect against data loss</li>
          </ul>
        </div>

        {/* Warning */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">
            ⚠️ Important Warning
          </h4>
          <p className="text-sm text-yellow-800">
            Restoring a backup will overwrite all your current files, databases,
            and settings. Make sure you have a recent backup before performing
            any restore operation. This action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

interface Props {
  existingUsername?: string | null;
}

export default function LinkHestiaClient({ existingUsername }: Props) {
  const [username, setUsername] = useState(existingUsername || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/customers/link-hestia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: username || undefined, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Failed to link account");
        return;
      }

      setMessage(
        json?.message ||
          "Hestia account linked — you can now sign in with your Hestia password.",
      );
      setPassword("");
      // optionally reload to reflect new local user
      setTimeout(() => location.reload(), 900);
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && (
        <div className="text-sm text-green-700 bg-green-50 p-3 rounded">
          {message}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="text-xs text-gray-600">
          Hestia username (optional)
        </label>
        <input
          className="w-full mt-1 px-3 py-2 border rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. customer1"
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-xs text-gray-600">Hestia password</label>
        <input
          type="password"
          className="w-full mt-1 px-3 py-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Hestia password"
          required
          disabled={loading}
        />
      </div>

      <div className="flex items-center space-x-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? "Linking..." : "Link Hestia account"}
        </button>
        <p className="text-xs text-gray-500">
          Linking will verify credentials without storing your Hestia password.
        </p>
      </div>

      <div className="text-xs text-gray-400">
        If you see a Hestia API error (401) ask your admin to whitelist this
        server's IP for Hestia API access.
      </div>
    </form>
  );
}

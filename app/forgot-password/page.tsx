"use client";

import { useState } from "react";
import { Loader2, Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send reset link");
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo width={140} height={50} />
            </div>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              Reset Link Sent!
            </h1>
            <p className="text-gray-600 mt-2">
              Check your email for reset instructions. The link will expire in 1
              hour.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Email sent to:</strong> {email}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-600">
                Didn't receive the email? Check your spam folder or try again.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Try Again
                </button>
                <Link
                  href="/login"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo width={140} height={50} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600 mt-2">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your email address"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 text-center">
                <strong>Security Note:</strong> For security reasons, we don't
                reveal whether an email exists in our system. If you don't
                receive an email, the address may not be registered.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </Link>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          LumiCloud Panel © 2026
        </p>
      </div>
    </div>
  );
}

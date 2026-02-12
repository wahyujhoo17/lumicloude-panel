"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6)
      return { strength: 0, text: "Too short", color: "bg-red-500" };
    if (password.length < 8)
      return { strength: 1, text: "Weak", color: "bg-orange-500" };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      return { strength: 2, text: "Fair", color: "bg-yellow-500" };
    return { strength: 3, text: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

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
              Password Reset Successful!
            </h1>
            <p className="text-gray-600 mt-2">
              Your password has been updated. Redirecting to login...
            </p>
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
            Reset Your Password
          </h1>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        {/* Reset Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!token ? (
            <div className="text-center">
              <p className="text-red-600 mb-4">Invalid reset link</p>
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Password strength indicator */}
                {formData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{
                            width: `${(passwordStrength.strength + 1) * 25}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Password match indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2">
                    {formData.newPassword === formData.confirmPassword ? (
                      <p className="text-xs text-green-600">Passwords match</p>
                    ) : (
                      <p className="text-xs text-red-600">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  loading || formData.newPassword !== formData.confirmPassword
                }
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Update Password
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Remember your password? Back to Login
          </Link>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          LumiCloud Panel © 2026
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

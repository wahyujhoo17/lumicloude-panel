"use client";

import { useState } from "react";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

interface ChangePasswordProps {
  className?: string;
}

export default function ChangePasswordForm({
  className = "",
}: ChangePasswordProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from current password");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess(true);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
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

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Change Password
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Update your password and sync with all hosting accounts
          </p>
        </div>
        <Lock className="w-6 h-6 text-gray-400" />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-sm text-green-700">
              Password updated successfully! Your hosting account passwords have
              also been synchronized.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              required
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter current password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
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
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showNewPassword ? (
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
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
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
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={
              loading ||
              formData.newPassword !== formData.confirmPassword ||
              !formData.currentPassword
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
        </div>
      </form>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>Important:</strong> Changing your password will also update
          the password for all your hosting accounts in HestiaCP. This ensures
          your panel and hosting credentials remain synchronized.
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = user?.role === "ADMIN";

  const isActive = (path: string) => {
    if (path === "/dashboard" || path === "/panel") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Logo
              width={55}
              height={20}
              href={isAdmin ? "/dashboard" : "/panel"}
            />
            <div className="h-6 w-px bg-gray-300 hidden lg:block"></div>
            <nav className="hidden lg:flex items-center gap-1.5">
              {isAdmin ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      isActive("/dashboard")
                        ? "text-white bg-blue-600 hover:bg-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/customers"
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      isActive("/dashboard/customers")
                        ? "text-white bg-blue-600 hover:bg-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Customers
                  </Link>
                  <Link
                    href="/dashboard/activity"
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      isActive("/dashboard/activity")
                        ? "text-white bg-blue-600 hover:bg-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Activity
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/panel"
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      isActive("/panel")
                        ? "text-white bg-blue-600 hover:bg-blue-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    My Panel
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                <div className="flex flex-col items-end">
                  <p className="text-xs text-gray-500 leading-tight">
                    {isAdmin ? "Admin" : "Customer"}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
                    {user.name || user.email?.split("@")[0]}
                  </p>
                </div>
              </div>
            )}
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

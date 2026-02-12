import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/api/auth",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // If not authenticated and trying to access protected route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated
  if (token) {
    // Redirect from login page to appropriate dashboard
    if (pathname === "/login") {
      const dashboardUrl = new URL(
        token.role === "ADMIN" ? "/dashboard" : "/panel",
        request.url,
      );
      return NextResponse.redirect(dashboardUrl);
    }

    // Redirect based on role when accessing root dashboard
    if (pathname === "/dashboard" && token.role !== "ADMIN") {
      const panelUrl = new URL("/panel", request.url);
      return NextResponse.redirect(panelUrl);
    }

    // Prevent customers from accessing admin routes
    if (
      token.role !== "ADMIN" &&
      (pathname.startsWith("/dashboard/customers") ||
        pathname.startsWith("/dashboard/activity"))
    ) {
      const panelUrl = new URL("/panel", request.url);
      return NextResponse.redirect(panelUrl);
    }

    // Redirect admin from /panel to /dashboard
    if (pathname === "/panel" && token.role === "ADMIN") {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Redirect admin from /account to /dashboard
    if (pathname === "/account" && token.role === "ADMIN") {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Redirect customer from old /account to new /panel
    if (pathname === "/account" && token.role === "USER") {
      const panelUrl = new URL("/panel", request.url);
      return NextResponse.redirect(panelUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username: providedUsername, password } = body || {};

    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
    const session = await getServerSession(authOptions as any);
    const sess = session as any;

    if (!sess || !sess.user || !sess.user.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 },
      );
    }

    const prisma = (await import("@/lib/prisma")).default;
    const customer = await prisma.customer.findUnique({
      where: { email: sess.user.email as string },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer record not found" },
        { status: 404 },
      );
    }

    const hestiaUsername = providedUsername || customer.hestiaUsername;
    if (!hestiaUsername) {
      return NextResponse.json(
        {
          success: false,
          error: "Hestia username not available; please provide it",
        },
        { status: 400 },
      );
    }

    const { HestiaAPI } = await import("@/lib/hestia-api");
    const HESTIA_HOST = process.env.HESTIA_HOST || "100.86.108.93";
    const HESTIA_PORT = process.env.HESTIA_PORT || "8083";

    try {
      const h = new HestiaAPI({
        host: HESTIA_HOST,
        port: HESTIA_PORT,
        user: hestiaUsername,
        password,
      });
      const result = await h.listDomains(hestiaUsername);

      if (!result.success) {
        // Surface Hestia error to the client with guidance
        if (
          result.returncode === 10 ||
          /forbidden|401/i.test(String(result.error || ""))
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Hestia API rejected authentication (401). Ask admin to whitelist application server IP or use admin access-key.",
            },
            { status: 403 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: `Hestia: ${String(result.error || "authentication failed")}`,
          },
          { status: 400 },
        );
      }

      // Success: create/ensure a local user so customer can sign in here going forward
      const { hash } = await import("bcryptjs");
      const randomPass = Math.random().toString(36) + Date.now();
      const hashed = await hash(randomPass, 10);

      const upserted = await prisma.user.upsert({
        where: { email: sess.user.email as string },
        update: {
          name: customer.name || (sess.user.email as string),
          password: hashed,
          role: "USER",
        },
        create: {
          email: sess.user.email as string,
          name: customer.name || (sess.user.email as string),
          password: hashed,
          role: "USER",
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "Hestia account verified and linked. You can now sign in using your Hestia password.",
      });
    } catch (err: any) {
      console.error("Hestia connectivity error (link):", err?.message || err);
      return NextResponse.json(
        {
          success: false,
          error: "Unable to contact Hestia (connectivity or TLS issue).",
        },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error("POST /api/customers/link-hestia error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

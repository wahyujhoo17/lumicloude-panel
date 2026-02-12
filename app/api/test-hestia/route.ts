import { NextResponse } from "next/server";
import { HestiaAPI } from "@/lib/hestia-api";

/**
 * Test endpoint untuk manual testing HestiaCP commands
 * GET /api/test-hestia?action=test-db&user=custlalaaliyajo6&dbname=testdb
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const username = searchParams.get("user");
    const dbname = searchParams.get("dbname");

    if (!action) {
      return NextResponse.json({
        success: false,
        error:
          "Action required. Available actions: test-db, list-db, test-connection",
      });
    }

    // Initialize Hestia client with admin credentials
    const hestia = new HestiaAPI({
      host: process.env.HESTIA_HOST!,
      port: process.env.HESTIA_PORT!,
      user: process.env.HESTIA_USER!,
      password: process.env.HESTIA_PASSWORD!,
    });

    console.log(`[TestHestia] Action: ${action}`);
    console.log(`[TestHestia] Config:`, {
      host: process.env.HESTIA_HOST,
      port: process.env.HESTIA_PORT,
      user: process.env.HESTIA_USER,
      hasPassword: !!process.env.HESTIA_PASSWORD,
    });

    let result: any;

    switch (action) {
      case "test-connection":
        // Test basic connection with v-list-sys-info
        console.log(`[TestHestia] Testing connection with v-list-sys-info...`);
        result = await hestia.request("v-list-sys-info", ["json"]);
        break;

      case "list-db":
        // List databases for user
        if (!username) {
          return NextResponse.json({
            success: false,
            error: "username parameter required",
          });
        }
        console.log(`[TestHestia] Listing databases for user: ${username}`);
        result = await hestia.listDatabases(username);
        break;

      case "test-db":
        // Test create database
        if (!username || !dbname) {
          return NextResponse.json({
            success: false,
            error: "user and dbname parameters required",
          });
        }

        const fullDbName = `${username}_${dbname}`;
        const dbUser = `${username}_${dbname}`;
        const dbPassword = hestia.generatePassword(16);

        console.log(`[TestHestia] Creating test database...`);
        console.log(`[TestHestia] User: ${username}`);
        console.log(`[TestHestia] DB Name: ${fullDbName}`);
        console.log(`[TestHestia] DB User: ${dbUser}`);
        console.log(`[TestHestia] DB Pass: ${dbPassword}`);

        result = await hestia.createDatabase({
          user: username,
          database: fullDbName,
          dbuser: dbUser,
          dbpass: dbPassword,
          charset: "utf8mb4",
        });

        console.log(`[TestHestia] Create result:`, result);

        // If successful, also list to verify
        if (result.success) {
          console.log(`[TestHestia] Verifying database creation...`);
          const listResult = await hestia.listDatabases(username);
          console.log(`[TestHestia] List result:`, listResult);

          return NextResponse.json({
            success: true,
            data: {
              createResult: result,
              listResult: listResult,
              credentials: {
                database: fullDbName,
                username: dbUser,
                password: dbPassword,
                host: "localhost",
                port: 3306,
              },
            },
          });
        }
        break;

      case "delete-db":
        // Delete test database
        if (!username || !dbname) {
          return NextResponse.json({
            success: false,
            error: "user and dbname parameters required",
          });
        }

        const delDbName = `${username}_${dbname}`;
        console.log(`[TestHestia] Deleting database: ${delDbName}`);
        result = await hestia.deleteDatabase(username, delDbName);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Available: test-db, list-db, delete-db, test-connection`,
        });
    }

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error("[TestHestia] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

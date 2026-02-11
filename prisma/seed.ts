import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@lumicloud.id" },
    update: {},
    create: {
      email: "admin@lumicloud.id",
      name: "Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", {
    email: admin.email,
    role: admin.role,
  });

  console.log("\n📝 Login credentials:");
  console.log("Email: admin@lumicloud.id");
  console.log("Password: admin123");
  console.log("\n⚠️  Please change the password after first login!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

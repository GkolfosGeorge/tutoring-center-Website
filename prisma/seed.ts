import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function randomPassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

async function main() {
  const generatedAdminPassword = randomPassword();
  const adminPlain = process.env.SEED_ADMIN_PASSWORD || generatedAdminPassword;
  const adminPassword = await bcrypt.hash(adminPlain, 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { password: adminPassword },
    create: {
      name: "Διαχειριστής",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log("✓ Admin seeded (password reset to the value below on every run).");
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`  Admin: admin / ${adminPlain}`);
  }
  console.log("⚠  Save this now — it is not stored anywhere else. Change on first login.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

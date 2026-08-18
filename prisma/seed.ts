import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function randomPassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

async function main() {
  const generatedAdminPassword = randomPassword();
  const generatedSecretaryPassword = randomPassword();

  const adminPlain = process.env.SEED_ADMIN_PASSWORD || generatedAdminPassword;
  const secretaryPlain = process.env.SEED_SECRETARY_PASSWORD || generatedSecretaryPassword;

  const adminPassword = await bcrypt.hash(adminPlain, 10);
  const secretaryPassword = await bcrypt.hash(secretaryPlain, 10);

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

  await prisma.user.upsert({
    where: { username: "grammateas" },
    update: { password: secretaryPassword },
    create: {
      name: "Γραμματεία",
      username: "grammateas",
      password: secretaryPassword,
      role: "SECRETARY",
    },
  });

  console.log("✓ Users seeded (password reset to the value below on every run).");
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`  Admin:     admin / ${adminPlain}`);
  }
  if (!process.env.SEED_SECRETARY_PASSWORD) {
    console.log(`  Secretary: grammateas / ${secretaryPlain}`);
  }
  console.log("⚠  Save these now — they are not stored anywhere else. Change on first login.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

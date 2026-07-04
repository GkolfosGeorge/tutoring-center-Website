import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const secretaryPassword = await bcrypt.hash("secretary123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Διαχειριστής",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "grammateas" },
    update: {},
    create: {
      name: "Γραμματεία",
      username: "grammateas",
      password: secretaryPassword,
      role: "SECRETARY",
    },
  });

  console.log("✓ Admin (admin / admin123) and Secretary (grammateas / secretary123) created");
  console.log("⚠  Change these passwords after first login!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

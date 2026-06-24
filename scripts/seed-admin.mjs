/**
 * Creates or promotes a SUPER_ADMIN user.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret ADMIN_NAME=You \
 *     node scripts/seed-admin.mjs
 *
 * Requires DATABASE_URL in the environment (loaded from .env automatically
 * by Prisma). Uses the same scrypt hashing scheme as src/lib/password.ts.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LEN);
  return `${salt}:${derived.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "").trim() || null;
  const role = process.env.ADMIN_ROLE || "SUPER_ADMIN";

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        role,
        ...(name ? { name } : {}),
        passwordHash: await hashPassword(password),
      },
      select: { id: true, email: true, name: true, role: true },
    });
    console.log("Updated existing user →", updated);
  } else {
    const created = await prisma.user.create({
      data: { email, name, role, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true, role: true },
    });
    console.log("Created new user →", created);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

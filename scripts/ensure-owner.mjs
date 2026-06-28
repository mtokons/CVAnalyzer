/**
 * Ensures the permanent platform owner exists and is SUPER_ADMIN.
 * Idempotent — safe to run on every deploy.
 *
 *   node scripts/ensure-owner.mjs
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;
const OWNER_EMAIL = "mhasnainn@gmail.com";
const OWNER_PASSWORD = "Htokon@12";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LEN);
  return `${salt}:${derived.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { email: OWNER_EMAIL },
      data: { role: "SUPER_ADMIN", passwordHash: await hashPassword(OWNER_PASSWORD) },
    });
    console.log("Owner ensured (SUPER_ADMIN):", OWNER_EMAIL);
  } else {
    await prisma.user.create({
      data: {
        email: OWNER_EMAIL,
        name: "Platform Owner",
        role: "SUPER_ADMIN",
        passwordHash: await hashPassword(OWNER_PASSWORD),
      },
    });
    console.log("Owner created (SUPER_ADMIN):", OWNER_EMAIL);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

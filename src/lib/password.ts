import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

/**
 * Hashes a plaintext password using scrypt with a random salt.
 * Output format: "<saltHex>:<hashHex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored "<salt>:<hash>" value.
 * Uses a constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const storedHash = Buffer.from(hashHex, "hex");
  if (storedHash.length !== derived.length) return false;
  return timingSafeEqual(storedHash, derived);
}

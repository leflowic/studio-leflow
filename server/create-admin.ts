import { db } from "./db";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const username = "leflow";
  const password = "aleksa123";
  const email = "aleksacomorinsta@gmail.com";

  const hashed = await hashPassword(password);

  const existing = await db.select().from(users).where(eq(users.username, username));

  if (existing.length > 0) {
    await db.update(users)
      .set({ password: hashed, role: "admin", emailVerified: true })
      .where(eq(users.username, username));
    console.log(`Updated existing user '${username}' — password reset, role=admin.`);
  } else {
    await db.insert(users).values({
      username,
      email,
      password: hashed,
      role: "admin",
      emailVerified: true,
    });
    console.log(`Created admin user '${username}'.`);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

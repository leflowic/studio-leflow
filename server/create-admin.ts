import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db.js";
import { users } from "../shared/schema.js";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  const hashedPassword = await hashPassword("aleksa123");

  await db.insert(users).values({
    username: "leflow",
    email: "aleksacomorinsta@gmail.com",
    password: hashedPassword,
    role: "admin",
    emailVerified: true,
  } as any);

  console.log("✅ Admin account created! Username: leflow");
  process.exit(0);
}

createAdmin().catch((e) => { console.error(e); process.exit(1); });

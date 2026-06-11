// Blueprint reference: blueprint:javascript_auth_all_persistance
import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendEmail } from "./resend-client";
import { verificationEmail, passwordResetEmail } from "./email-templates";
import { generateToken, verifyToken, jwtAuthMiddleware } from "./jwt-auth";
import rateLimit from "express-rate-limit";

// Rate limiter za login endpoint
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // max 5 pokušaja prijave po IP
  message: { error: "Previše pokušaja prijave. Pokušajte ponovo za 15 minuta." },
  standardHeaders: true,
  legacyHeaders: false,
});

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      jwtUser?: SelectUser;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    throw new Error("Invalid password format");
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  app.use(jwtAuthMiddleware);

  app.post("/api/register", async (req, res, next) => {
    try {
      // Get IP address and user agent for rate limiting and fraud detection
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || undefined;

      // IP RATE LIMITING: Check if this IP has made too many registration attempts recently
      const recentAttempts = await storage.getRecentRegistrationAttempts(ipAddress, 15); // Last 15 minutes
      if (recentAttempts.length >= 3) {
        console.log(`[AUTH] IP rate limit exceeded for ${ipAddress}: ${recentAttempts.length} attempts in last 15 minutes`);
        return res.status(429).json({ 
          error: "Previše pokušaja registracije. Molimo sačekajte 15 minuta i pokušajte ponovo." 
        });
      }

      // Validate with Zod schema from shared/schema.ts
      const { insertUserSchema } = await import("@shared/schema");
      const validatedData = insertUserSchema.parse(req.body);
      
      // Normalize email and username to lowercase for consistency
      const normalizedEmail = validatedData.email.toLowerCase();
      const normalizedUsername = validatedData.username.toLowerCase();

      // Log registration attempt for rate limiting
      await storage.createRegistrationAttempt({
        ipAddress,
        email: normalizedEmail,
        userAgent,
      });
      
      // Check if email or username already exists in USERS table (verified users)
      const existingUser = await storage.getUserByUsername(normalizedUsername);
      if (existingUser) {
        return res.status(400).send("Korisničko ime već postoji");
      }

      const existingEmail = await storage.getUserByEmail(normalizedEmail);
      if (existingEmail) {
        return res.status(400).send("Email adresa već postoji");
      }

      // Check if email or username already exists in PENDING_USERS table (awaiting verification)
      const pendingUserByEmail = await storage.getPendingUserByEmail(normalizedEmail);
      if (pendingUserByEmail) {
        return res.status(400).json({ 
          error: "Email adresa već postoji. Molimo proverite vaš inbox za verifikacioni kod ili sačekajte da prethodni zahtev istekne." 
        });
      }

      const pendingUserByUsername = await storage.getPendingUserByUsername(normalizedUsername);
      if (pendingUserByUsername) {
        return res.status(400).json({ 
          error: "Korisničko ime već postoji. Molimo odaberite drugo korisničko ime ili sačekajte da prethodni zahtev istekne." 
        });
      }

      // Generate verification code
      const verificationCode = generateVerificationCode();

      // Hash password BEFORE storing in pending_users
      const hashedPassword = await hashPassword(validatedData.password);

      // Create PENDING user (NOT in users table yet!)
      // User will be moved to users table only after email verification
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours
      const pendingUser = await storage.createPendingUser({
        email: normalizedEmail,
        username: normalizedUsername,
        password: hashedPassword, // Already hashed
        verificationCode,
        ipAddress,
        userAgent,
        termsAccepted: validatedData.termsAccepted,
        expiresAt,
      });

      console.log(`[AUTH] Created pending user (id: ${pendingUser.id}) for ${normalizedEmail}`);
      console.log(`[AUTH] Attempting to send verification email to: ${validatedData.email}`);
      console.log(`[AUTH] Verification code generated: ${verificationCode}`);

      try {
        const result = await sendEmail({
          to: validatedData.email,
          subject: 'Potvrdite Vašu Email Adresu — Studio LeFlow',
          html: verificationEmail(verificationCode, validatedData.username),
        });
        console.log(`[AUTH] Verification email sent successfully to ${validatedData.email}. Message ID: ${result.messageId}`);
      } catch (emailError: any) {
        console.error("[AUTH] Failed to send verification email:", emailError);
        console.error("[AUTH] Email error details:", emailError.message);
        
        // Delete the pending user since we couldn't send the verification email
        await storage.deletePendingUser(pendingUser.id);
        
        return res.status(500).json({ 
          error: "Greška pri slanju verifikacionog email-a. Molimo proverite da li je email adresa ispravna i pokušajte ponovo." 
        });
      }

      // Return success response WITHOUT sensitive data
      // User is NOT logged in yet - they must verify email first
      res.status(201).json({ 
        message: "Registracija uspešna! Proverite vaš email za verifikacioni kod.",
        email: normalizedEmail,
        username: normalizedUsername,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      }
      console.error("[AUTH] Registration error:", error);
      res.status(500).send(error.message);
    }
  });

  // Login with JWT
  const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
    rememberMe: z.boolean().optional().default(false),
  });

  app.post("/api/login", loginRateLimiter, async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { username, password } = validatedData;

      console.log('[AUTH] Login attempt for username/email:', username);

      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }

      if (!user) {
        console.log('[AUTH] User not found:', username);
        return res.status(401).json({ 
          error: "Pogrešno korisničko ime ili lozinka" 
        });
      }

      const passwordMatch = await comparePasswords(password, user.password);
      console.log('[AUTH] Password match:', passwordMatch);

      if (!passwordMatch) {
        console.log('[AUTH] Password mismatch for user:', username);
        return res.status(401).json({ 
          error: "Pogrešno korisničko ime ili lozinka" 
        });
      }

      if (user.banned) {
        console.log('[AUTH] User is banned:', username);
        return res.status(401).json({ 
          error: "Vaš nalog je banovan" 
        });
      }

      console.log('[AUTH] Login successful for user:', user.username);

      const token = generateToken(user.id);
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({
        ...userWithoutPassword,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći format podataka" });
      }
      console.error("[AUTH] Login error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/logout", (_req, res) => {
    res.sendStatus(200);
  });

  app.get("/api/user", (req, res) => {
    if (!req.jwtUser) return res.sendStatus(401);
    
    const { password, ...userWithoutPassword } = req.jwtUser;
    res.json(userWithoutPassword);
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email je obavezan" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent user enumeration
      if (!user) {
        console.log(`[AUTH] Password reset requested for non-existent email: ${email}`);
        return res.json({ success: true, message: "Ako email postoji, kod za reset lozinke je poslat" });
      }

      // Generate 6-digit reset code
      const resetToken = generateVerificationCode();
      await storage.setPasswordResetToken(user.id, resetToken);

      console.log(`[AUTH] Password reset requested for: ${email}`);
      console.log(`[AUTH] Reset code generated: ${resetToken}`);

      try {
        await sendEmail({
          to: email,
          subject: 'Resetovanje Lozinke — Studio LeFlow',
          html: passwordResetEmail(resetToken),
        });
        console.log(`[AUTH] Password reset email sent successfully to ${email}`);
      } catch (emailError: any) {
        console.error("[AUTH] Failed to send password reset email:", emailError);
        // Don't reveal if email exists - return generic error
        return res.status(500).json({ 
          error: "Greška pri slanju email-a. Molimo pokušajte ponovo." 
        });
      }

      // Don't reveal user ID or any identifying information
      res.json({ success: true, message: "Ako email postoji, kod za reset lozinke je poslat" });
    } catch (error: any) {
      console.error("[AUTH] Forgot password error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;

      if (!email || !token || !newPassword) {
        return res.status(400).json({ error: "Svi parametri su obavezni" });
      }

      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Lozinka mora imati najmanje 8 karaktera" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: "Nevažeći ili istekao kod za reset lozinke" });
      }

      // Verify reset token
      const isValid = await storage.verifyPasswordResetToken(user.id, token);
      if (!isValid) {
        return res.status(400).json({ error: "Nevažeći ili istekao kod za reset lozinke" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updatePassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);

      console.log(`[AUTH] Password successfully reset for user: ${email}`);

      res.json({ success: true, message: "Lozinka je uspešno promenjena" });
    } catch (error: any) {
      console.error("[AUTH] Reset password error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });
}

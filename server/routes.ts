import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { wsHelpers, notifyUser, broadcastToUser, getOnlineUsersSnapshot } from "./websocket-helpers";
import { insertContactSubmissionSchema, insertCmsContentSchema, insertCmsMediaSchema, insertVideoSpotSchema, insertUserSongSchema, insertNewsletterSubscriberSchema, insertInvoiceSchema, insertCommunityMessageSchema, insertSiteAnnouncementSchema, mixMasterContractDataSchema, copyrightTransferContractDataSchema, instrumentalSaleContractDataSchema, insertSmartLinkSchema, type CmsContent, type CmsMedia, type VideoSpot, type UserSong } from "@shared/schema";
import { sendEmail, getLastVerificationCode } from "./resend-client";
import { resendVerificationEmail, adminLoginEmail, contactFormEmail, newsletterConfirmEmail, licenseDeliveryEmail, customEmail } from "./email-templates";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import multer from "multer";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { randomBytes, createHmac } from "crypto";
import { upload, uploadImageToCloudinary, uploadRawImageToCloudinary, uploadAudioToCloudinary } from "./cloudinary";
import { generateMixMasterPDF, generateCopyrightTransferPDF, generateInstrumentalSalePDF, type MixMasterContract, type CopyrightTransferContract, type InstrumentalSaleContract } from "./pdf-generators";
import rateLimit from "express-rate-limit";
import { fileTypeFromBuffer } from "file-type";

// Rate limiters for security
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // max 5 pokušaja prijave po IP
  message: { error: "Previše pokušaja prijave. Pokušajte ponovo za 15 minuta." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 sat
  max: 30, // max 30 upload-a po satu po IP
  message: { error: "Previše upload zahteva. Pokušajte ponovo kasnije." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 sat
  max: 3, // max 3 registracije po satu po IP
  message: { error: "Previše registracija. Pokušajte ponovo za sat vremena." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for CMS media uploads (disk storage for images)
const multerUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'attached_assets', 'temp');
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for images
  },
  fileFilter: (_req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Samo slike su dozvoljene'));
    }
  },
});

// HTML escape funkcija za bezbednost
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

// Simple in-memory cache for analytics (30-60s TTL)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const analyticsCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 45000; // 45 seconds

function getCachedData<T>(key: string): T | null {
  const entry = analyticsCache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    analyticsCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData<T>(key: string, data: T): void {
  analyticsCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// Sanitize user object by removing sensitive fields
function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'password' | 'verificationCode' | 'passwordResetToken' | 'passwordResetExpiry' | 'adminLoginToken' | 'adminLoginExpiry'> {
  const {
    password,
    verificationCode,
    passwordResetToken,
    passwordResetExpiry,
    adminLoginToken,
    adminLoginExpiry,
    ...sanitized
  } = user;
  return sanitized;
}

// Rate limiting za kontakt formu - čuva IP adrese i timestamps
const contactRateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 sat u milisekundama
const MAX_REQUESTS_PER_HOUR = 10;

// Per-user lock to prevent concurrent giveaway uploads bypassing monthly limit
const giveawayUploadLocks = new Set<number>();

// Rate limiting za community chat - 10 sekundi između poruka
const communityMessageRateLimits = new Map<number, number>();
const COMMUNITY_MESSAGE_COOLDOWN = 10 * 1000; // 10 sekundi u milisekundama

// Funkcija za dobijanje prave IP adrese klijenta (koristi Express req.ip koji je siguran)
function getClientIp(req: any): string | null {
  // req.ip je automatski popunjen od Express-a kada je trust proxy omogućen
  // Express ispravno parsira X-Forwarded-For i vraća pravu IP adresu
  const ip = req.ip;
  
  // Ignoriši localhost adrese
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    return null;
  }
  
  return ip;
}

function checkContactRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const timestamps = contactRateLimits.get(ip) || [];
  
  // Ukloni stare timestamps (starije od 1 sata)
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    // Izračunaj kada će najstariji timestamp isteći
    const oldestTimestamp = Math.min(...recentTimestamps);
    const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 60000); // u minutima
    return { allowed: false, remainingTime };
  }
  
  // Dodaj novi timestamp
  recentTimestamps.push(now);
  contactRateLimits.set(ip, recentTimestamps);
  
  return { allowed: true };
}

// Funkcija za proveru rate limita za community chat poruke
function canUserSendMessage(userId: number): boolean {
  const now = Date.now();
  const lastMessageTime = communityMessageRateLimits.get(userId);
  
  if (!lastMessageTime) {
    communityMessageRateLimits.set(userId, now);
    return true;
  }
  
  const timeSinceLastMessage = now - lastMessageTime;
  
  if (timeSinceLastMessage < COMMUNITY_MESSAGE_COOLDOWN) {
    return false;
  }
  
  communityMessageRateLimits.set(userId, now);
  return true;
}

// Middleware to check if user is banned
function requireNotBanned(req: any, res: any, next: any) {
  if (!req.jwtUser) {
    return res.status(401).json({ error: "Niste prijavljeni. Osvežite stranicu i prijavite se ponovo." });
  }
  
  if (req.jwtUser.banned) {
    return res.status(403).json({ 
      error: "Vaš nalog je suspendovan. Kontaktirajte administratora za više informacija.",
      banned: true 
    });
  }
  
  next();
}

// Middleware to check if user is admin
function requireAdmin(req: any, res: any, next: any) {
  if (!req.jwtUser) {
    return res.status(401).json({ error: "Niste prijavljeni. Osvežite stranicu i prijavite se ponovo." });
  }
  
  if (req.jwtUser.banned) {
    return res.status(403).json({ 
      error: "Vaš nalog je suspendovan. Kontaktirajte administratora za više informacija.",
      banned: true 
    });
  }
  
  if (req.jwtUser.role !== 'admin') {
    return res.status(403).json({ error: "Samo administratori mogu pristupiti ovoj funkcionalnosti" });
  }
  
  next();
}

// Middleware: VIP, Legend, or Admin rank required
function requireVip(req: any, res: any, next: any) {
  if (!req.jwtUser) {
    return res.status(401).json({ error: "Niste prijavljeni. Prijavite se da biste pristupili ovom sadržaju." });
  }
  if (req.jwtUser.banned) {
    return res.status(403).json({ error: "Vaš nalog je suspendovan.", banned: true });
  }
  const allowed = ["vip", "legend", "admin"];
  if (!allowed.includes(req.jwtUser.rank)) {
    return res.status(403).json({ error: "Ovaj sadržaj je dostupan samo VIP korisnicima i višim rangovima.", requiresVip: true });
  }
  next();
}

// Middleware to check if email is verified
function requireVerifiedEmail(req: any, res: any, next: any) {
  if (!req.jwtUser) {
    return res.status(401).json({ error: "Niste prijavljeni. Osvežite stranicu i prijavite se ponovo." });
  }
  
  if (req.jwtUser.banned) {
    return res.status(403).json({ 
      error: "Vaš nalog je suspendovan. Kontaktirajte administratora za više informacija.",
      banned: true 
    });
  }
  
  if (!req.jwtUser.emailVerified) {
    return res.status(403).json({ 
      error: "Morate verifikovati email adresu da biste pristupili ovoj funkcionalnosti",
      requiresVerification: true 
    });
  }
  
  next();
}

// Middleware to check if site is in maintenance mode (for API routes only)
async function checkMaintenanceMode(req: any, res: any, next: any) {
  // Allow access to maintenance check, auth routes, and admin routes
  // NOTE: Paths do NOT include /api prefix because middleware is mounted on /api
  const allowedPaths = [
    '/maintenance',
    '/login',
    '/logout',
    '/user',
    '/register',
    '/verify-email',
    '/verify',
    '/forgot-password',
    '/reset-password',
    '/admin',
    '/admin-login-request',
    '/admin-login-verify',
    '/portal',    // Public client portal links must work even in maintenance
    '/l/',        // Public smart link pages must work even in maintenance
    '/messages',  // Messaging must work in maintenance
    '/ws',        // WebSocket auth must work in maintenance
  ];
  
  // Check if the request is for an allowed path
  const isAllowedPath = allowedPaths.some(path => req.path.startsWith(path));
  
  if (isAllowedPath) {
    return next();
  }
  
  // If user is admin, allow access
  if (req.jwtUser && req.jwtUser.role === "admin") {
    return next();
  }
  
  // Check if maintenance mode is active
  const isMaintenanceMode = await storage.getMaintenanceMode();
  
  if (isMaintenanceMode) {
    return res.status(503).json({ 
      error: "Sajt je trenutno u pripremi",
      maintenanceMode: true 
    });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes: /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Maintenance mode API routes
  // GET is public (anyone can check if site is in maintenance)
  app.get("/api/maintenance", async (_req, res) => {
    try {
      const isActive = await storage.getMaintenanceMode();
      res.json({ maintenanceMode: isActive });
    } catch (error) {
      console.error("Error getting maintenance mode:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Admin custom email via Resend
  app.post("/api/admin/send-email", requireAdmin, async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Sva polja su obavezna (to, subject, body)" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ error: "Neispravna email adresa" });
      }
      const html = customEmail(body);
      await sendEmail({ to, subject, html, replyTo: 'podrska@studioleflow.com' });
      console.log(`[ADMIN EMAIL] ${req.jwtUser!.username} → ${to} | ${subject}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[ADMIN EMAIL] Error:", error);
      res.status(500).json({ error: `Slanje nije uspelo: ${error.message}` });
    }
  });

  // POST is admin only (only admins can toggle maintenance mode)
  app.post("/api/maintenance", requireAdmin, async (req, res) => {
    try {
      const { maintenanceMode } = req.body;
      
      if (typeof maintenanceMode !== "boolean") {
        return res.status(400).json({ error: "maintenanceMode mora biti boolean" });
      }
      
      await storage.setMaintenanceMode(maintenanceMode);
      
      console.log(`[ADMIN] Maintenance mode ${maintenanceMode ? 'aktiviran' : 'deaktiviran'} od strane ${req.jwtUser!.username}`);
      
      res.json({ success: true, maintenanceMode });
    } catch (error) {
      console.error("Error setting maintenance mode:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Development debug endpoint for verification codes (only in development mode)
  app.get("/api/debug/verification-code", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ error: "Nije pronađeno" });
    }

    const lastCode = getLastVerificationCode();
    
    if (!lastCode) {
      return res.json({ 
        message: "No verification code available yet. Register a new user to generate one." 
      });
    }

    return res.json({
      email: lastCode.email,
      code: lastCode.code,
      subject: lastCode.subject,
      timestamp: new Date(lastCode.timestamp).toISOString(),
      age: Math.round((Date.now() - lastCode.timestamp) / 1000) + ' seconds ago'
    });
  });

  // Avatar upload
  app.post("/api/upload/avatar", uploadRateLimiter, requireVerifiedEmail, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fajl nije pronađen" });
      const detectedType = await fileTypeFromBuffer(req.file.buffer);
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!detectedType || !allowed.includes(detectedType.mime)) return res.status(400).json({ error: "Dozvoljeni su samo JPG, PNG i WebP fajlovi" });
      const url = await uploadImageToCloudinary(req.file.buffer, "studioleflow/avatars", `user_${req.jwtUser!.id}`);
      res.json({ url });
    } catch (e: any) {
      console.error("[UPLOAD] Avatar error:", e.message);
      res.status(500).json({ error: "Greška pri otpremanju slike" });
    }
  });

  // Message image upload (chat attachments — separate from avatar to avoid overwriting it)
  app.post("/api/upload/message-image", uploadRateLimiter, requireNotBanned, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fajl nije pronađen" });
      const detectedType = await fileTypeFromBuffer(req.file.buffer);
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!detectedType || !allowed.includes(detectedType.mime))
        return res.status(400).json({ error: "Dozvoljeni su samo JPG, PNG i WebP fajlovi" });
      const uid = `msg_${req.jwtUser!.id}_${Date.now()}`;
      const url = await uploadImageToCloudinary(req.file.buffer, "studioleflow/messages", uid);
      res.json({ url });
    } catch (e: any) {
      console.error("[UPLOAD] Message image error:", e.message);
      res.status(500).json({ error: "Greška pri otpremanju slike" });
    }
  });

  // Audio upload (giveaway MP3)
  app.post("/api/upload/audio", uploadRateLimiter, requireVerifiedEmail, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fajl nije pronađen" });
      if (req.file.size > 16 * 1024 * 1024) return res.status(400).json({ error: "Fajl ne sme biti veći od 16MB" });
      // Validate actual file content, not just MIME type claimed by client
      const detectedType = await fileTypeFromBuffer(req.file.buffer);
      if (!detectedType || detectedType.mime !== "audio/mpeg") {
        return res.status(400).json({ error: "Dozvoljeni su samo MP3 fajlovi" });
      }
      const url = await uploadAudioToCloudinary(req.file.buffer, "studioleflow/audio", req.file.originalname);
      res.json({ url });
    } catch (e: any) {
      console.error("[UPLOAD] Audio error:", e.message);
      res.status(500).json({ error: "Greška pri otpremanju audio fajla" });
    }
  });

  // Game clip upload (admin only, MP3 for daily challenge)
  app.post("/api/upload/game-clip", uploadRateLimiter, requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fajl nije pronađen" });
      if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "Clip ne sme biti veći od 5MB" });
      const detectedType = await fileTypeFromBuffer(req.file.buffer);
      const allowedMimes = ["audio/mpeg", "audio/mp3", "audio/x-mpeg", "audio/mpeg3"];
      if (!detectedType || !allowedMimes.includes(detectedType.mime)) {
        return res.status(400).json({ error: "Dozvoljeni su samo MP3 fajlovi" });
      }
      const url = await uploadAudioToCloudinary(req.file.buffer, "studioleflow/game-clips", req.file.originalname);
      res.json({ url });
    } catch (e: any) {
      console.error("[UPLOAD] Game clip error:", e.message);
      res.status(500).json({ error: "Greška pri otpremanju klipa" });
    }
  });

  // Apply maintenance mode middleware to all API routes (except allowed paths)
  // This allows static files and index.html to load, but blocks API calls when in maintenance mode
  app.use('/api', checkMaintenanceMode);

  // Image upload endpoint for CMS
  app.post("/api/upload-image", requireAdmin, multerUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fajl nije priložen" });
      }

      // Move file from temp to permanent location
      const tempPath = req.file.path;
      const fileName = req.file.filename;
      const permanentDir = path.join(process.cwd(), 'attached_assets', 'cms_images');
      fs.mkdirSync(permanentDir, { recursive: true });
      const permanentPath = path.join(permanentDir, fileName);

      fs.renameSync(tempPath, permanentPath);

      // Return relative URL
      const url = `/attached_assets/cms_images/${fileName}`;
      res.json({ url });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Greška pri upload-u slike" });
    }
  });

  // Email verification endpoint
  // This endpoint verifies email for PENDING users and moves them to the users table
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Verifikacioni kod je obavezan" });
      }
      
      // Find pending user by verification code
      const pendingUser = await storage.getPendingUserByCode(code);
      
      if (!pendingUser) {
        return res.status(400).json({ error: "Nevažeći verifikacioni kod" });
      }
      
      // Check if pending user has expired (24 hours)
      if (new Date() > new Date(pendingUser.expiresAt)) {
        // Delete expired pending user
        await storage.deletePendingUser(pendingUser.id);
        return res.status(400).json({ 
          error: "Verifikacioni kod je istekao. Molimo registrujte se ponovo." 
        });
      }
      
      // Move pending user to users table (atomic transaction with race condition protection)
      let user;
      try {
        user = await storage.movePendingToUsers(pendingUser.id);
      } catch (moveError: any) {
        console.error("[VERIFY] Failed to move pending user to users:", moveError);
        
        // Check if error is due to duplicate email/username
        if (moveError.message.includes("already")) {
          return res.status(400).json({ error: moveError.message });
        }
        
        return res.status(500).json({ error: "Greška pri kreiranju naloga" });
      }
      
      console.log(`[VERIFY] Successfully created and verified user ${user.username} (id: ${user.id})`);
      
      // SECURITY: Check if user is banned before logging them in (paranoid check)
      if (user.banned) {
        return res.status(403).json({ error: "Vaš nalog je banovan" });
      }
      
      // Generate JWT token for automatic login after verification
      const { generateToken } = await import("./jwt-auth");
      const token = generateToken(user.id);
      
      // SECURITY: Don't expose password hash
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword, token });
    } catch (error) {
      console.error("[VERIFY] Verification error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Resend verification code
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email je obavezan" });
      }
      
      const pendingUser = await storage.getPendingUserByEmail(email);
      if (!pendingUser) {
        return res.status(404).json({ error: "Korisnik sa ovim emailom nije pronađen ili je već verifikovan" });
      }

      if (new Date() > new Date(pendingUser.expiresAt)) {
        await storage.deletePendingUser(pendingUser.id);
        return res.status(400).json({ error: "Prethodni zahtev za registraciju je istekao. Molimo registrujte se ponovo." });
      }

      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.updatePendingUserCode(pendingUser.id, verificationCode);
      
      // Send verification email
      try {
        await sendEmail({
          to: email,
          subject: 'Novi Verifikacioni Kod — Studio LeFlow',
          html: resendVerificationEmail(verificationCode),
        });
        return res.json({ success: true, message: "Novi verifikacioni kod je poslat" });
      } catch (emailError) {
        console.error("Greška pri slanju emaila:", emailError);
        return res.status(500).json({ error: "Greška pri slanju emaila" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Admin login request - sends verification code to admin email (2FA)
  app.post("/api/admin-login-request", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Korisničko ime ili email i lozinka su obavezni" });
      }
      
      // Get user by username OR email (check if input contains @)
      const isEmail = username.includes('@');
      const user = isEmail 
        ? await storage.getUserByEmail(username)
        : await storage.getUserByUsername(username);
      
      // Generic error message to prevent user enumeration
      if (!user) {
        console.log(`[Admin Login] Failed: User not found (${username})`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Verify password
      const validPassword = await comparePasswords(password, user.password);
      if (!validPassword) {
        console.log(`[Admin Login] Failed: Invalid password for user ${user.username}`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check if user is admin - return same generic error
      if (user.role !== 'admin') {
        console.log(`[Admin Login] Failed: User ${user.username} is not admin (role: ${user.role})`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check if user is banned - return same generic error
      if (user.banned) {
        console.log(`[Admin Login] Failed: User ${user.username} is banned`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.setAdminLoginToken(user.id, verificationCode);
      
      // Send verification email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Admin Prijava — Verifikacioni Kod — Studio LeFlow',
          html: adminLoginEmail(verificationCode),
        });
        
        return res.json({ 
          success: true, 
          message: "Verifikacioni kod je poslat na Vaš email",
          userId: user.id 
        });
      } catch (emailError) {
        console.error("Greška pri slanju emaila:", emailError);
        return res.status(500).json({ error: "Greška pri slanju emaila" });
      }
    } catch (error) {
      console.error("Admin login request error:", error);
      return res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Admin login verify - verifies code and logs in user
  app.post("/api/admin-login-verify", async (req, res) => {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ error: "Svi podaci su obavezni" });
      }
      
      // Verify code
      const isValid = await storage.verifyAdminLoginToken(userId, code);
      
      if (!isValid) {
        return res.status(401).json({ error: "Neispravan ili istekao kod" });
      }
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      // Final security checks
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Nemate admin privilegije" });
      }
      
      if (user.banned) {
        return res.status(403).json({ error: "Vaš nalog je banovan" });
      }
      
      // Clear the admin login token
      await storage.clearAdminLoginToken(userId);
      
      // Generate JWT token for admin login
      const { generateToken } = await import("./jwt-auth");
      const token = generateToken(user.id);
      
      const { password, verificationCode, adminLoginToken, ...userWithoutSensitiveData } = user;
      res.json({ success: true, user: userWithoutSensitiveData, token });
    } catch (error) {
      console.error("Admin login verify error:", error);
      return res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      // Proveri rate limit samo ako možemo da odredimo IP adresu
      const clientIp = getClientIp(req);
      if (clientIp) {
        const rateLimitCheck = checkContactRateLimit(clientIp);
        
        if (!rateLimitCheck.allowed) {
          return res.status(429).json({ 
            error: `Poslali ste previše upita. Molimo pokušajte ponovo za ${rateLimitCheck.remainingTime} minuta.` 
          });
        }
      }
      
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);
      
      // Šalji email notifikaciju
      try {
        await sendEmail({
          to: 'podrska@studioleflow.com',
          subject: `Novi Upit — ${escapeHtml(validatedData.service)} — Studio LeFlow`,
          html: contactFormEmail({
            service: escapeHtml(validatedData.service),
            name: escapeHtml(validatedData.name),
            email: escapeHtml(validatedData.email),
            phone: escapeHtml(validatedData.phone),
            message: escapeHtml(validatedData.message),
            preferredDate: validatedData.preferredDate ? escapeHtml(validatedData.preferredDate) : undefined,
          }),
        });
      } catch (emailError) {
        console.error("Greška pri slanju email-a:", emailError);
        // Nastavi sa odgovorom čak i ako email ne uspe
      }
      
      res.json(submission);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  app.get("/api/contact", async (_req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ==================== NEWSLETTER API ROUTES ====================

  // Subscribe to newsletter (public)
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = insertNewsletterSubscriberSchema.parse(req.body);

      // Check if email already exists
      const existingSubscriber = await storage.getNewsletterSubscriberByEmail(email);

      if (existingSubscriber) {
        if (existingSubscriber.status === 'confirmed') {
          return res.status(400).json({ error: "Email je već prijavljen na newsletter" });
        } else if (existingSubscriber.status === 'pending') {
          return res.status(400).json({ error: "Email već postoji - proverite inbox za link za potvrdu" });
        } else if (existingSubscriber.status === 'unsubscribed') {
          // Resubscribe - generate new token
          const confirmationToken = randomBytes(32).toString('hex');
          
          await storage.createNewsletterSubscriber(email, confirmationToken);
          
          // Send confirmation email
          try {
            const baseUrl = process.env.APP_URL || 'http://localhost:5000';
            const confirmUrl = `${baseUrl}/newsletter/potvrda/${confirmationToken}`;
            
            await sendEmail({
              to: email,
              subject: 'Potvrdite Prijavu na Newsletter — Studio LeFlow',
              html: newsletterConfirmEmail(confirmUrl),
            });
          } catch (emailError) {
            console.error("Greška pri slanju confirmation email-a:", emailError);
            return res.status(500).json({ error: "Greška pri slanju email-a za potvrdu" });
          }

          return res.json({ message: "Uspešno! Proverite email za link za potvrdu" });
        }
      }

      // Create new subscriber with confirmation token
      const confirmationToken = randomBytes(32).toString('hex');
      await storage.createNewsletterSubscriber(email, confirmationToken);

      // Send confirmation email
      try {
        const baseUrl = process.env.APP_URL || 'http://localhost:5000';
        const confirmUrl = `${baseUrl}/newsletter/potvrda/${confirmationToken}`;
        
        await sendEmail({
          to: email,
          subject: 'Potvrdite Prijavu na Newsletter — Studio LeFlow',
          html: newsletterConfirmEmail(confirmUrl),
        });
      } catch (emailError) {
        console.error("Greška pri slanju confirmation email-a:", emailError);
        return res.status(500).json({ error: "Greška pri slanju email-a za potvrdu" });
      }

      res.json({ message: "Uspešno! Proverite email za link za potvrdu" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Unesite validnu email adresu" });
      } else {
        console.error("Newsletter subscribe error:", error);
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // Confirm newsletter subscription (public)
  app.get("/api/newsletter/confirm/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const success = await storage.confirmNewsletterSubscription(token);

      if (!success) {
        return res.status(400).json({ error: "Link za potvrdu je nevažeći ili je već iskorišćen" });
      }

      res.json({ message: "Email uspešno potvrđen! Hvala što ste se prijavili na naš newsletter" });
    } catch (error) {
      console.error("Newsletter confirm error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Unsubscribe from newsletter (public)
  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email je obavezan" });
      }

      const success = await storage.unsubscribeNewsletter(email);

      if (!success) {
        return res.status(400).json({ error: "Email nije pronađen u listi pretplatnika" });
      }

      res.json({ message: "Uspešno ste se odjavili sa newslettera" });
    } catch (error) {
      console.error("Newsletter unsubscribe error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get newsletter subscribers list (admin only)
  app.get("/api/newsletter/subscribers", requireAdmin, async (_req, res) => {
    try {
      const subscribers = await storage.getAllNewsletterSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error("Newsletter subscribers error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get newsletter statistics (admin only)
  app.get("/api/newsletter/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getNewsletterStats();
      res.json(stats);
    } catch (error) {
      console.error("Newsletter stats error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Delete newsletter subscriber (admin only)
  app.delete("/api/newsletter/subscribers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }

      const success = await storage.deleteNewsletterSubscriber(id);
      
      if (!success) {
        return res.status(404).json({ error: "Pretplatnik nije pronađen" });
      }

      res.json({ message: "Pretplatnik je uspešno uklonjen" });
    } catch (error) {
      console.error("Delete newsletter subscriber error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Send newsletter campaign (admin only)
  app.post("/api/newsletter/send", requireAdmin, async (req, res) => {
    try {
      const { subject, htmlContent } = req.body;

      if (!subject || !htmlContent) {
        return res.status(400).json({ error: "Subject i sadržaj su obavezni" });
      }

      // Get all confirmed subscribers
      const subscribers = await storage.getConfirmedNewsletterSubscribers();

      if (subscribers.length === 0) {
        return res.status(400).json({ error: "Nema potvrđenih pretplatnika" });
      }

      // Send email to all confirmed subscribers
      const emailPromises = subscribers.map(subscriber => 
        sendEmail({
          to: subscriber.email,
          subject: subject,
          html: htmlContent,
        })
      );

      await Promise.all(emailPromises);

      res.json({ 
        message: `Newsletter uspešno poslat na ${subscribers.length} email adresa`,
        count: subscribers.length 
      });
    } catch (error) {
      console.error("Send newsletter error:", error);
      res.status(500).json({ error: "Greška pri slanju newslettera" });
    }
  });

  // ==================== GIVEAWAY API ROUTES ====================
  
  // Accept terms of service
  app.post("/api/user/accept-terms", requireVerifiedEmail, async (req, res) => {
    
    try {
      await storage.acceptTerms(req.jwtUser!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Update user profile (username, email)
  app.put("/api/user/update-profile", requireVerifiedEmail, async (req, res) => {
    try {
      let { username, email } = req.body;
      const userId = req.jwtUser!.id;

      // Normalize email and username to lowercase for consistency
      if (email) email = email.toLowerCase();
      if (username) username = username.toLowerCase();

      // Validation
      if (username && username.trim().length < 3) {
        return res.status(400).json({ error: "Korisničko ime mora imati najmanje 3 karaktera" });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Unesite validnu email adresu" });
      }

      // Check if username can be changed (once per month)
      if (username && username !== req.jwtUser!.username.toLowerCase()) {
        const user = await storage.getUser(userId);
        if (user?.usernameLastChanged) {
          const daysSinceLastChange = Math.floor(
            (Date.now() - new Date(user.usernameLastChanged).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastChange < 30) {
            return res.status(400).json({ 
              error: `Možete promeniti korisničko ime tek za ${30 - daysSinceLastChange} dana` 
            });
          }
        }

        // Check if username is already taken
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Korisničko ime je već zauzeto" });
        }
      }

      // Check if email is already taken
      if (email && email !== req.jwtUser!.email.toLowerCase()) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email adresa je već zauzeta" });
        }
      }

      // Update profile
      await storage.updateUserProfile(userId, { username, email });
      
      // Return updated user (sanitized)
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: error.message || "Greška na serveru" });
    }
  });

  // Change password
  app.put("/api/user/change-password", requireVerifiedEmail, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.jwtUser!.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Trenutna i nova lozinka su obavezne" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Nova lozinka mora imati najmanje 8 karaktera" });
      }

      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }

      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Trenutna lozinka nije tačna" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ message: "Lozinka je uspešno promenjena" });
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ error: error.message || "Greška na serveru" });
    }
  });

  // Update user avatar
  app.put("/api/user/avatar", async (req, res) => {
    try {
      const { avatarUrl } = req.body;
      const userId = req.jwtUser?.id;

      if (!userId) {
        return res.status(401).json({ error: "Neautorizovan pristup" });
      }

      if (!avatarUrl || typeof avatarUrl !== 'string') {
        return res.status(400).json({ error: "Avatar URL je obavezan" });
      }

      // Update avatar
      await storage.updateUserAvatar(userId, avatarUrl);
      
      // Return updated user (sanitized)
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      console.error("Update avatar error:", error);
      res.status(500).json({ error: error.message || "Greška na serveru" });
    }
  });

  // Remove user avatar
  app.delete("/api/user/avatar", async (req, res) => {
    try {
      const userId = req.jwtUser?.id;

      if (!userId) {
        return res.status(401).json({ error: "Neautorizovan pristup" });
      }

      // Remove avatar by setting it to null
      await storage.updateUserAvatar(userId, null);
      
      // Return updated user (sanitized)
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      console.error("Remove avatar error:", error);
      res.status(500).json({ error: error.message || "Greška na serveru" });
    }
  });

  // Get giveaway settings
  app.get("/api/giveaway/settings", async (_req, res) => {
    try {
      const settings = await storage.getGiveawaySettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all projects
  app.get("/api/giveaway/projects", async (_req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/giveaway/projects", requireVerifiedEmail, async (req, res) => {
    // SECURITY: Enforce terms acceptance on server side
    if (!req.jwtUser!.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre učešća u giveaway-u" });
    }

    try {
      if (!req.body.mp3Url) {
        return res.status(400).json({ error: "MP3 URL je obavezan" });
      }

      const userId = req.jwtUser!.id;

      // Prevent race condition: block concurrent uploads from same user
      if (giveawayUploadLocks.has(userId)) {
        return res.status(429).json({ error: "Vaš upload je već u toku. Sačekajte." });
      }
      giveawayUploadLocks.add(userId);

      try {
      // Check if user has already uploaded this month
      const currentMonth = new Date().toISOString().substring(0, 7);
      const userProjects = await storage.getUserProjectsForMonth(userId, currentMonth);

      if (userProjects.length > 0) {
        giveawayUploadLocks.delete(userId);
        return res.status(400).json({ error: "Već ste uploadovali projekat ovog meseca. Možete uploadovati samo 1 projekat mesečno." });
      }
      
      // Parse and validate project data from request body
      const { insertProjectSchema } = await import("@shared/schema");
      const validatedData = insertProjectSchema.parse({
        title: req.body.title,
        description: req.body.description || '',
        genre: req.body.genre,
        mp3Url: req.body.mp3Url,
      });
      
      const project = await storage.createProject({
        ...validatedData,
        userId,
        currentMonth,
      });
      
      // Notify user about successful upload
      notifyUser(
        req.jwtUser!.id,
        "Projekat uploadovan! 🎉",
        `Vaš projekat "${project.title}" je uspešno poslat. Sada možete glasati za druge projekte.`
      );
      
      // Notify all admins about new project submission
      const admins = await storage.getAdminUsers();
      admins.forEach(admin => {
        notifyUser(
          admin.id,
          "Novi projekat uploadovan",
          `${req.jwtUser!.username} je uploadovao projekat "${project.title}"`
        );
      });
      
      res.status(201).json(project);
      } finally {
        giveawayUploadLocks.delete(userId);
      }
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        console.error("Project upload error:", error);
        res.status(500).json({ error: error.message || "Greška na serveru" });
      }
    }
  });

  // Vote on a project (toggle functionality - add or remove vote)
  app.post("/api/giveaway/vote", requireVerifiedEmail, async (req, res) => {
    // SECURITY: Enforce terms acceptance on server side
    if (!req.jwtUser!.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre glasanja" });
    }
    
    try {
      const { projectId } = req.body;
      
      if (!projectId || typeof projectId !== "number") {
        return res.status(400).json({ error: "ID projekta je obavezan" });
      }
      
      // SECURITY: Get IP address
      const ipAddress = req.socket.remoteAddress || 'unknown';
      
      // Check if user already voted - if yes, remove vote (toggle off)
      const userAlreadyVoted = await storage.hasUserVoted(req.jwtUser!.id, projectId);
      
      if (userAlreadyVoted) {
        // Remove vote (toggle off)
        await storage.deleteVote(req.jwtUser!.id, projectId);
        return res.json({ action: 'removed' });
      } else {
        // Check if a DIFFERENT user from this IP has voted
        // This prevents multiple accounts from same IP, but allows same user to toggle
        const votes = await storage.getProjectVotes(projectId);
        const ipVoteByDifferentUser = votes.find(
          vote => vote.ipAddress === ipAddress && vote.userId !== req.jwtUser!.id
        );
        
        if (ipVoteByDifferentUser) {
          return res.status(400).json({ error: "Sa ove IP adrese je već glasano za ovaj projekat (drugi korisnik)" });
        }
        
        // Add vote (toggle on)
        await storage.createVote({
          userId: req.jwtUser!.id,
          projectId,
          ipAddress,
        });
        return res.json({ action: 'added' });
      }
    } catch (error: any) {
      console.error("Vote toggle error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get comments for a project
  app.get("/api/giveaway/projects/:id/comments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Nevažeći ID projekta" });
      }
      
      const comments = await storage.getProjectComments(projectId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Add a comment to a project
  app.post("/api/giveaway/comments", requireVerifiedEmail, async (req, res) => {
    // SECURITY: Enforce terms acceptance on server side
    if (!req.jwtUser!.termsAccepted) {
      return res.status(403).json({ error: "Morate prihvatiti pravila pre komentarisanja" });
    }
    
    try {
      const { insertCommentSchema } = await import("@shared/schema");
      const validatedData = insertCommentSchema.parse(req.body);
      
      const comment = await storage.createComment({
        ...validatedData,
        userId: req.jwtUser!.id,
      });
      
      res.status(201).json(comment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // ==================== ADMIN API ROUTES ====================
  
  // Get dashboard statistics
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all users
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(({ password, adminLoginToken, adminLoginExpiry, ...safe }) => safe));
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Search users for admin (used in dropdowns/assignments)
  app.get("/api/admin/users/search", requireAdmin, async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || query.trim().length === 0) {
        return res.json({ users: [] });
      }

      const users = await storage.adminSearchUsers(query.trim(), limit);
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Ban a user
  app.post("/api/admin/users/:id/ban", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      await storage.banUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Unban a user
  app.post("/api/admin/users/:id/unban", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      await storage.unbanUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Delete a user
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      // Don't allow deleting yourself
      if (userId === req.jwtUser!.id) {
        return res.status(400).json({ error: "Ne možete obrisati sami sebe" });
      }
      
      await storage.deleteUser(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Toggle admin role
  app.post("/api/admin/users/:id/toggle-admin", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      // Don't allow removing your own admin role
      if (userId === req.jwtUser!.id) {
        return res.status(400).json({ error: "Ne možete ukloniti sebi admin privilegije" });
      }
      
      await storage.toggleAdminRole(userId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Update user rank (user, vip, legend, admin)
  app.patch("/api/users/:userId/rank", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      // Validate rank
      const rankSchema = z.object({ 
        rank: z.enum(['user', 'vip', 'legend', 'admin']) 
      });
      const validated = rankSchema.parse(req.body);
      
      // Get user to notify them
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      // Update rank
      await storage.updateUserRank(userId, validated.rank);
      
      // Notify user about rank change
      const rankNames: Record<string, string> = {
        user: 'Korisnik',
        vip: 'VIP',
        legend: 'Legenda',
        admin: 'Administrator'
      };
      notifyUser(
        userId,
        "Rank ažuriran",
        `Vaš rank je promenjen na: ${rankNames[validated.rank]}`
      );
      
      res.json({ success: true, message: "Rank uspešno ažuriran" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      }
      console.error("Error updating user rank:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all projects (approved and pending) for admin
  app.get("/api/admin/all-projects", requireAdmin, async (_req, res) => {
    try {
      const projects = await storage.getAllProjectsForAdmin();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get pending (unapproved) projects
  app.get("/api/admin/pending-projects", requireAdmin, async (_req, res) => {
    try {
      const projects = await storage.getPendingProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Approve a project
  app.post("/api/admin/projects/:id/approve", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Nevažeći ID projekta" });
      }
      
      await storage.approveProject(projectId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Delete a project
  app.delete("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Nevažeći ID projekta" });
      }
      
      await storage.deleteProject(projectId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Get all comments
  app.get("/api/admin/comments", requireAdmin, async (_req, res) => {
    try {
      const comments = await storage.getAllComments();
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Delete a comment
  app.delete("/api/admin/comments/:id", requireAdmin, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Nevažeći ID komentara" });
      }
      
      await storage.deleteComment(commentId);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Toggle giveaway active status
  app.post("/api/admin/giveaway/toggle", requireAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive mora biti boolean" });
      }
      
      await storage.setSetting('giveaway_active', isActive.toString());
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ==================== CMS API ROUTES ====================

  // GET /api/cms/content?page=home - PUBLIC (for Home/Team pages to read content)
  app.get("/api/cms/content", async (req, res) => {
    try {
      const page = req.query.page as string | undefined;
      const content = await storage.listCmsContent(page);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/cms/content - batch upsert multiple content entries
  app.post("/api/cms/content", requireAdmin, async (req, res) => {
    try {
      const schema = z.array(insertCmsContentSchema);
      const validated = schema.parse(req.body);
      
      const results = [];
      for (const item of validated) {
        const result = await storage.upsertCmsContent(item);
        results.push(result);
      }
      res.json(results);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // PUT /api/cms/content/single - update single content item
  app.put("/api/cms/content/single", requireAdmin, async (req, res) => {
    try {
      const validated = insertCmsContentSchema.parse(req.body);
      const result = await storage.upsertCmsContent(validated);
      res.json(result);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // DELETE /api/cms/team-member/:memberIndex - delete team member
  app.delete("/api/cms/team-member/:memberIndex", requireAdmin, async (req, res) => {
    try {
      const memberIndex = parseInt(req.params.memberIndex);
      if (isNaN(memberIndex)) {
        return res.status(400).json({ error: "Nevažeći member index" });
      }

      // Delete all entries for this team member
      await storage.deleteCmsContentByPattern("team", "members", `member_${memberIndex}_`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Greška pri brisanju člana tima" });
    }
  });

  // GET /api/cms/media?page=home - PUBLIC (for frontend to read media paths)
  app.get("/api/cms/media", async (req, res) => {
    try {
      const page = req.query.page as string | undefined;
      const media = await storage.listCmsMedia(page);
      res.json(media);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/cms/media - upload image and save to database
  app.post("/api/cms/media", requireAdmin, multerUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fajl nije priložen" });
      }

      // Validacija metadata iz req.body
      const metadata = insertCmsMediaSchema.omit({ filePath: true }).parse({
        page: req.body.page,
        section: req.body.section,
        assetKey: req.body.assetKey,
      });

      // Create CMS directory if doesn't exist
      const cmsDir = path.join(process.cwd(), "attached_assets", "cms", metadata.page);
      await fs.promises.mkdir(cmsDir, { recursive: true });

      // Generate filename: page-section-assetKey-timestamp.ext
      const ext = path.extname(req.file.originalname);
      const filename = `${metadata.page}-${metadata.section}-${metadata.assetKey}-${Date.now()}${ext}`;
      const filePath = `attached_assets/cms/${metadata.page}/${filename}`;
      const fullPath = path.join(process.cwd(), filePath);

      // Move uploaded file to CMS directory
      await fs.promises.rename(req.file.path, fullPath);

      // Save to database
      const mediaEntry = await storage.upsertCmsMedia({
        ...metadata,
        filePath,
      });

      res.json(mediaEntry);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // DELETE /api/cms/media/:id
  app.delete("/api/cms/media/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }
      await storage.deleteCmsMedia(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ============================================================================
  // VIDEO SPOTS API ROUTES
  // ============================================================================

  // GET /api/video-spots - PUBLIC (get all video spots ordered)
  app.get("/api/video-spots", async (_req, res) => {
    try {
      const spots = await storage.getVideoSpots();
      res.json(spots);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/video-spots - ADMIN (create new video spot)
  app.post("/api/video-spots", requireAdmin, async (req, res) => {
    try {
      const validated = insertVideoSpotSchema.parse(req.body);
      const newSpot = await storage.createVideoSpot(validated);
      res.json(newSpot);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // PUT /api/video-spots/:id - ADMIN (update video spot)
  app.put("/api/video-spots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }
      const validated = insertVideoSpotSchema.parse(req.body);
      const updated = await storage.updateVideoSpot(id, validated);
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      } else {
        res.status(500).json({ error: "Greška na serveru" });
      }
    }
  });

  // DELETE /api/video-spots/:id - ADMIN (delete video spot)
  app.delete("/api/video-spots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }
      await storage.deleteVideoSpot(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // PUT /api/video-spots/:id/order - ADMIN (update spot order)
  app.put("/api/video-spots/:id/order", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { order } = req.body;
      if (isNaN(id) || typeof order !== 'number') {
        return res.status(400).json({ error: "Nevažeći parametri" });
      }
      const updated = await storage.updateVideoSpotOrder(id, order);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ============================================================================
  // USER SONGS ENDPOINTS (User-submitted YouTube songs with 36h rate limit)
  // ============================================================================

  // POST /api/user-songs - PROTECTED (create new user song with rate limiting)
  app.post("/api/user-songs", requireVerifiedEmail, async (req, res) => {
    try {
      const userId = req.jwtUser!.id;
      
      // 1. Validate input
      const validated = insertUserSongSchema.parse(req.body);
      
      // 2. Check 36-hour rate limit
      const lastSubmissionTime = await storage.getUserLastSongSubmissionTime(userId);
      if (lastSubmissionTime) {
        const hoursSinceLastSubmission = (Date.now() - lastSubmissionTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSubmission < 36) {
          const hoursRemaining = Math.ceil(36 - hoursSinceLastSubmission);
          return res.status(429).json({ 
            error: `Možete postaviti novu pesmu za ${hoursRemaining} ${hoursRemaining === 1 ? 'sat' : hoursRemaining < 5 ? 'sata' : 'sati'}`,
            hoursRemaining 
          });
        }
      }
      
      // 3. Create song (duplicate URL check is handled by DB unique constraint)
      const newSong = await storage.createUserSong({
        userId,
        songTitle: validated.songTitle,
        artistName: validated.artistName,
        youtubeUrl: validated.youtubeUrl,
      });
      
      // Notify all admins about new song submission
      const admins = await storage.getAdminUsers();
      admins.forEach(admin => {
        notifyUser(
          admin.id,
          "Nova pesma za odobrenje",
          `${req.jwtUser!.username} je poslao pesmu "${newSong.songTitle}" - ${newSong.artistName}`
        );
      });
      
      res.json(newSong);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      }
      // Check for duplicate YouTube URL error
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return res.status(409).json({ error: "Ova pesma je već postavljena" });
      }
      console.error("Error creating user song:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // GET /api/user-songs - PROTECTED (get current user's songs)
  app.get("/api/user-songs", requireVerifiedEmail, async (req, res) => {
    try {
      const userId = req.jwtUser!.id;
      const songs = await storage.getUserSongs(userId);
      res.json(songs);
    } catch (error) {
      console.error("Error fetching user songs:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // GET /api/user-songs/all - ADMIN (get all user songs with usernames)
  app.get("/api/user-songs/all", requireAdmin, async (req, res) => {
    try {
      const songs = await storage.getAllUserSongs();
      res.json(songs);
    } catch (error) {
      console.error("Error fetching all user songs:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // DELETE /api/user-songs/:id - PROTECTED (delete own song)
  app.delete("/api/user-songs/:id", requireVerifiedEmail, async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const userId = req.jwtUser!.id;
      const isAdmin = req.jwtUser!.role === 'admin';
      
      if (isNaN(songId)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }
      
      // Verify ownership before deletion (admins can delete any)
      if (!isAdmin) {
        const song = await storage.getUserSongById(songId);
        if (!song) {
          return res.status(404).json({ error: "Pesma nije pronađena" });
        }
        if (song.userId !== userId) {
          return res.status(403).json({ error: "Nemate dozvolu da obrišete ovu pesmu" });
        }
      }
      
      await storage.deleteUserSong(songId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user song:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/user-songs/:id/approve - ADMIN (approve a song)
  app.post("/api/user-songs/:id/approve", requireAdmin, async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      
      if (isNaN(songId)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }
      
      // Get song details to notify the user
      const song = await storage.getUserSongById(songId);
      if (!song) {
        return res.status(404).json({ error: "Pesma nije pronađena" });
      }
      
      await storage.approveUserSong(songId);
      
      // Notify the user that their song was approved
      notifyUser(
        song.userId, 
        "Pesma odobrena! 🎵",
        `Vaša pesma "${song.songTitle}" je odobrena i sada je vidljiva svima.`
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving user song:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // GET /api/user-songs/public - PUBLIC (get all approved songs with voting info)
  app.get("/api/user-songs/public", async (req, res) => {
    try {
      const userId = req.jwtUser?.id;
      const songs = await storage.getApprovedUserSongs(userId);
      res.json(songs);
    } catch (error) {
      console.error("Error fetching public user songs:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/user-songs/:id/vote - PROTECTED (toggle vote for a song)
  app.post("/api/user-songs/:id/vote", requireVerifiedEmail, async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const userId = req.jwtUser!.id;
      
      if (isNaN(songId)) {
        return res.status(400).json({ error: "Nevažeći ID" });
      }
      
      const result = await storage.toggleUserSongVote(userId, songId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling song vote:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ============================================================================
  // COMMUNITY CHAT ENDPOINTS
  // ============================================================================

  // GET /api/community-chat - Get community messages
  app.get("/api/community-chat", requireNotBanned, async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 100);
      const messages = await storage.getCommunityMessages(limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching community messages:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/community-chat - Send a community message
  app.post("/api/community-chat", requireVerifiedEmail, async (req, res) => {
    try {
      // Rate limit check using storage (persisted check)
      const canSend = await storage.canUserSendMessage(req.jwtUser!.id);
      if (!canSend) {
        return res.status(429).json({ 
          error: "Možete slati poruke samo jednom na 10 sekundi", 
          retryAfterSeconds: 10 
        });
      }

      // Validate message
      const validated = insertCommunityMessageSchema.parse(req.body);
      
      // Create message
      const createdMessage = await storage.createCommunityMessage(req.jwtUser!.id, validated.message);
      
      // Fetch enriched message data with username, rank, avatarUrl
      const messages = await storage.getCommunityMessages(1);
      const enrichedMessage = messages.find(m => m.id === createdMessage.id);
      
      if (!enrichedMessage) {
        throw new Error("Failed to fetch enriched message data");
      }
      
      // Broadcast to all online users
      const onlineUsers = getOnlineUsersSnapshot();
      if (wsHelpers.broadcastToUser) {
        onlineUsers.forEach(userId => {
          wsHelpers.broadcastToUser!(userId, {
            type: "community-chat:new",
            message: enrichedMessage
          });
        });
      }
      
      res.json(enrichedMessage);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      }
      if (error.message?.includes("10 sekundi")) {
        return res.status(429).json({ 
          error: error.message, 
          retryAfterSeconds: 10 
        });
      }
      console.error("Error creating community message:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // DELETE /api/community-chat/clear - Clear all community messages (ADMIN only)
  // NOTE: This route MUST come BEFORE /:id to avoid "clear" being matched as an ID
  app.delete("/api/community-chat/clear", requireAdmin, async (req, res) => {
    try {
      await storage.clearAllCommunityMessages();
      
      // Broadcast clear to all online users
      const onlineUsers = getOnlineUsersSnapshot();
      if (wsHelpers.broadcastToUser) {
        onlineUsers.forEach(userId => {
          wsHelpers.broadcastToUser!(userId, {
            type: "community-chat:clear"
          });
        });
      }
      
      res.json({ success: true, message: "Sve poruke su obrisane" });
    } catch (error) {
      console.error("Error clearing community messages:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // DELETE /api/community-chat/:id - Delete a community message
  app.delete("/api/community-chat/:id", requireNotBanned, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ error: "Nevažeći ID poruke" });
      }
      
      const success = await storage.deleteCommunityMessage(messageId, req.jwtUser!.id);
      
      if (!success) {
        return res.status(403).json({ error: "Nemate dozvolu da obrišete ovu poruku" });
      }
      
      // Broadcast deletion to all online users
      const onlineUsers = getOnlineUsersSnapshot();
      if (wsHelpers.broadcastToUser) {
        onlineUsers.forEach(userId => {
          wsHelpers.broadcastToUser!(userId, {
            type: "community-chat:delete",
            payload: { id: messageId }
          });
        });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting community message:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ============================================================================
  // SITE ANNOUNCEMENT ENDPOINTS
  // ============================================================================

  // GET /api/announcement - Get site announcement (PUBLIC)
  app.get("/api/announcement", async (req, res) => {
    try {
      const announcement = await storage.getSiteAnnouncement();
      res.json(announcement);
    } catch (error) {
      console.error("Error fetching site announcement:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // PATCH /api/announcement - Update site announcement (ADMIN only)
  app.patch("/api/announcement", requireAdmin, async (req, res) => {
    try {
      const validated = insertSiteAnnouncementSchema.parse(req.body);
      const updated = await storage.upsertSiteAnnouncement(validated);
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validacija nije uspela", details: error.errors });
      }
      console.error("Error updating site announcement:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ==================== CALENDAR API ROUTES ====================

  // GET /api/admin/calendar?year=2026&month=6
  app.get("/api/admin/calendar", requireAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      if (month < 1 || month > 12) return res.status(400).json({ error: "Neispravan mesec" });
      const days = await storage.getCalendarMonth(year, month);
      res.json(days);
    } catch (error) {
      console.error("Calendar fetch error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // PUT /api/admin/calendar/:date
  app.put("/api/admin/calendar/:date", requireAdmin, async (req, res) => {
    try {
      const { date } = req.params;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Neispravan format datuma" });
      const { status, note } = req.body;
      const validStatuses = ["green", "red", "yellow", "blue", null, ""];
      if (!validStatuses.includes(status ?? null)) return res.status(400).json({ error: "Neispravani status" });
      const day = await storage.upsertCalendarDay(date, status || null, note || null, req.jwtUser!.id);
      res.json(day);
    } catch (error) {
      console.error("Calendar update error:", error);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // SEO routes - robots.txt
  app.get("/robots.txt", (req, res) => {
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'https';
    const siteUrl = `${protocol}://${host}`;
    
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /inbox

Sitemap: ${siteUrl}/sitemap.xml
`;
    res.type("text/plain");
    res.send(robotsTxt);
  });

  // SEO routes - sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'https';
    const siteUrl = `${protocol}://${host}`;
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/kontakt</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/tim</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/giveaway</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/pravila</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/usluge</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
    res.type("application/xml");
    res.send(sitemap);
  });

  // ===== MESSAGING ENDPOINTS =====
  
  // Lookup by username — MUST BE BEFORE /api/users/:id
  app.get("/api/users/by-username/:username", requireNotBanned, async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(404).json({ error: "Korisnik nije pronađen" });
      res.json({ id: user.id, username: user.username, avatarUrl: user.avatarUrl, createdAt: user.createdAt });
    } catch (e) {
      console.error("[Users] by-username error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Search users (verified users only) - MUST BE BEFORE /api/users/:id
  app.get("/api/users/search", requireVerifiedEmail, async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.status(400).json({ error: "Query mora imati najmanje 2 karaktera" });
      }
      
      const results = await storage.searchUsers(q.trim(), req.jwtUser!.id);
      res.json(results);
    } catch (error: any) {
      console.error("[MESSAGING] User search error:", error);
      res.status(500).json({ error: "Greška pri pretrazi korisnika" });
    }
  });
  
  // Get user by ID (verified users only)
  app.get("/api/users/:id", requireVerifiedEmail, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      // Only expose public profile fields — never email to other users
      res.json({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        lastSeen: user.lastSeen,
        role: user.role,
        emailVerified: user.emailVerified,
      });
    } catch (error: any) {
      console.error("[MESSAGING] Get user error:", error);
      res.status(500).json({ error: "Greška pri učitavanju korisnika" });
    }
  });

  // Get all user conversations
  app.get("/api/conversations", requireVerifiedEmail, async (req, res) => {
    try {
      const conversations = await storage.getUserConversations(req.jwtUser!.id);
      res.json(conversations);
    } catch (error: any) {
      console.error("[MESSAGING] Get conversations error:", error);
      res.status(500).json({ error: "Greška pri učitavanju konverzacija" });
    }
  });

  // Get messages for specific conversation
  app.get("/api/messages/conversation/:userId", requireVerifiedEmail, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      
      if (isNaN(otherUserId)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      const conversation = await storage.getConversation(req.jwtUser!.id, otherUserId);
      
      if (!conversation) {
        return res.json([]);
      }
      
      const messages = await storage.getConversationMessages(conversation.id, req.jwtUser!.id);
      
      await storage.markMessagesAsRead(conversation.id, req.jwtUser!.id);

      if (wsHelpers.broadcastToUser) {
        const readEvent = {
          type: 'message_read',
          conversationId: conversation.id,
          readBy: req.jwtUser!.id,
        };
        // Notify the sender their messages were read
        wsHelpers.broadcastToUser(otherUserId, readEvent);
        // Also notify the reader so their own unread badge clears immediately
        wsHelpers.broadcastToUser(req.jwtUser!.id, readEvent);
      }
      
      res.json(messages);
    } catch (error: any) {
      console.error("[MESSAGING] Get messages error:", error);
      res.status(500).json({ error: "Greška pri učitavanju poruka" });
    }
  });

  // Send a message
  app.post("/api/messages/send", requireVerifiedEmail, async (req, res) => {
    try {
      const { receiverId, content, imageUrl, replyToId } = req.body;
      
      if (!receiverId || typeof receiverId !== 'number') {
        return res.status(400).json({ error: "receiverId je obavezan" });
      }
      
      if (receiverId === req.jwtUser!.id) {
        return res.status(400).json({ error: "Ne možete slati poruke samom sebi" });
      }
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "Poruka ne može biti prazna" });
      }
      
      if (content.length > 5000) {
        return res.status(400).json({ error: "Poruka može imati najviše 5000 karaktera" });
      }
      
      // Check if receiver exists and is not banned
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Korisnik ne postoji" });
      }
      
      if (receiver.banned) {
        return res.status(403).json({ error: "Ne možete slati poruke banovanom korisniku" });
      }
      
      const message = await storage.sendMessage(
        req.jwtUser!.id,
        receiverId,
        content.trim(),
        imageUrl,
        typeof replyToId === 'number' ? replyToId : undefined,
      );
      
      // Broadcast new_message event to receiver via WebSocket
      if (wsHelpers.broadcastToUser) {
        wsHelpers.broadcastToUser(receiverId, {
          type: 'new_message',
          message,
        });
        
        // Also broadcast to sender to update their own conversation list
        wsHelpers.broadcastToUser(req.jwtUser!.id, {
          type: 'new_message',
          message,
        });
      }
      
      res.json(message);
    } catch (error: any) {
      console.error("[MESSAGING] Send message error:", error);
      res.status(500).json({ error: "Greška pri slanju poruke" });
    }
  });

  // Delete own messages in a conversation (soft-delete)
  app.delete("/api/messages/conversation/:userId", requireVerifiedEmail, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) return res.status(400).json({ error: "Nevažeći ID" });
      await storage.deleteConversation(req.jwtUser!.id, otherUserId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Greška pri brisanju" });
    }
  });

  // DEPRECATED - Messages are now auto-marked as read when fetched (GET /api/messages/conversation/:userId)
  // This endpoint is kept for backward compatibility with cached JavaScript
  app.put("/api/messages/mark-read", requireVerifiedEmail, async (req, res) => {
    console.warn("[DEPRECATED] PUT /api/messages/mark-read called - browser cache issue! User needs hard refresh (Ctrl+F5)");
    res.json({ 
      success: true,
      deprecated: true,
      message: "Please perform a hard refresh of your browser (Ctrl+F5 or Ctrl+Shift+R)" 
    });
  });

  // Get unread message count
  app.get("/api/messages/unread-count", requireVerifiedEmail, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.jwtUser!.id);
      res.json({ count });
    } catch (error: any) {
      console.error("[MESSAGING] Get unread count error:", error);
      res.status(500).json({ error: "Greška pri učitavanju broja nepročitanih poruka" });
    }
  });

  // Delete a message (user can only delete their own messages)
  app.delete("/api/messages/:id", requireVerifiedEmail, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ error: "Nevažeći ID poruke" });
      }
      
      // Get message details before deletion for WebSocket broadcast
      const message = await storage.getMessageById(messageId);
      
      const success = await storage.deleteMessage(messageId, req.jwtUser!.id);
      
      if (!success) {
        return res.status(403).json({ error: "Ne možete obrisati ovu poruku" });
      }
      
      // Broadcast message deletion to both sender and receiver via WebSocket
      if (message && wsHelpers.broadcastToUser) {
        const deletedMessageEvent = {
          type: 'message_deleted',
          messageId,
        };
        
        wsHelpers.broadcastToUser(message.senderId, deletedMessageEvent);
        wsHelpers.broadcastToUser(message.receiverId, deletedMessageEvent);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[MESSAGING] Delete message error:", error);
      res.status(500).json({ error: "Greška pri brisanju poruke" });
    }
  });

  // Edit a message (own messages only)
  app.patch("/api/messages/:id", requireVerifiedEmail, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) return res.status(400).json({ error: "Nevažeći ID" });
      const { content } = req.body;
      if (!content || typeof content !== "string" || !content.trim())
        return res.status(400).json({ error: "Poruka ne može biti prazna" });
      if (content.length > 5000) return res.status(400).json({ error: "Poruka predugačka" });
      const updated = await storage.editMessage(messageId, req.jwtUser!.id, content.trim());
      if (!updated) return res.status(403).json({ error: "Nije moguće izmeniti ovu poruku" });
      if (wsHelpers.broadcastToUser) {
        const otherUserId = updated.receiverId === req.jwtUser!.id ? updated.senderId : updated.receiverId;
        wsHelpers.broadcastToUser(otherUserId, { type: "message_edited", message: updated });
        wsHelpers.broadcastToUser(req.jwtUser!.id, { type: "message_edited", message: updated });
      }
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: "Greška pri izmeni poruke" });
    }
  });

  // Toggle emoji reaction on a message
  app.post("/api/messages/:id/react", requireVerifiedEmail, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) return res.status(400).json({ error: "Nevažeći ID" });
      const { emoji } = req.body;
      if (!emoji || typeof emoji !== "string") return res.status(400).json({ error: "Emoji je obavezan" });
      const ALLOWED = ["❤️","👍","😂","😮","😢","🔥","👎","🎉"];
      if (!ALLOWED.includes(emoji)) return res.status(400).json({ error: "Emoji nije dozvoljen" });
      const result = await storage.toggleReaction(messageId, req.jwtUser!.id, emoji);
      const msg = await storage.getMessageById(messageId);
      if (msg && wsHelpers.broadcastToUser) {
        const otherUserId = msg.receiverId === req.jwtUser!.id ? msg.senderId : msg.receiverId;
        const event = { type: "message_reaction", messageId, userId: req.jwtUser!.id, emoji, added: result.added };
        wsHelpers.broadcastToUser(otherUserId, event);
        wsHelpers.broadcastToUser(req.jwtUser!.id, event);
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: "Greška pri reakciji" });
    }
  });

  // Link preview proxy
  app.get("/api/link-preview", requireVerifiedEmail, async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url || !url.startsWith("http")) return res.status(400).json({ error: "Nevažeći URL" });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)" },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (!response.ok) return res.status(400).json({ error: "Nije moguće učitati URL" });
      const html = await response.text();
      const getMeta = (prop: string, name?: string) => {
        const ogMatch = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
          ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"));
        if (ogMatch) return ogMatch[1];
        if (name) {
          const nm = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))
            ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"));
          if (nm) return nm[1];
        }
        return null;
      };
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = getMeta("og:title") ?? titleMatch?.[1]?.trim() ?? null;
      const description = getMeta("og:description", "description");
      const image = getMeta("og:image") ?? getMeta("twitter:image");
      const siteName = getMeta("og:site_name");
      res.json({ url, title, description, image, siteName });
    } catch (e: any) {
      res.status(400).json({ error: "Nije moguće učitati preview" });
    }
  });

  // ===== DASHBOARD ENDPOINTS =====

  // Get dashboard overview for logged-in user
  app.get("/api/dashboard/overview", requireVerifiedEmail, async (req, res) => {
    try {
      const overview = await storage.getDashboardOverview(req.jwtUser!.id);
      res.json(overview);
    } catch (error: any) {
      console.error("[DASHBOARD] Get overview error:", error);
      res.status(500).json({ error: "Greška pri učitavanju dashboard pregleda" });
    }
  });

  // Get user's projects
  app.get("/api/user/projects", requireVerifiedEmail, async (req, res) => {
    try {
      const projects = await storage.getUserProjects(req.jwtUser!.id);
      res.json(projects);
    } catch (error: any) {
      console.error("[DASHBOARD] Get user projects error:", error);
      res.status(500).json({ error: "Greška pri učitavanju projekata" });
    }
  });

  // Get user's contracts
  app.get("/api/user/contracts", requireVerifiedEmail, async (req, res) => {
    try {
      const contracts = await storage.getUserContracts(req.jwtUser!.id);
      res.json(contracts);
    } catch (error: any) {
      console.error("[DASHBOARD] Get user contracts error:", error);
      res.status(500).json({ error: "Greška pri učitavanju licenci" });
    }
  });

  // Get user's invoices
  app.get("/api/user/invoices", requireVerifiedEmail, async (req, res) => {
    try {
      const invoices = await storage.getUserInvoices(req.jwtUser!.id);
      res.json(invoices);
    } catch (error: any) {
      console.error("[DASHBOARD] Get user invoices error:", error);
      res.status(500).json({ error: "Greška pri učitavanju faktura" });
    }
  });

  // Update project status (admin only)
  app.put("/api/admin/projects/:id/status", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Nevažeći ID projekta" });
      }

      if (!status || !['waiting', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Nevažeći status. Dozvoljeni: waiting, in_progress, completed, cancelled" });
      }

      await storage.updateProjectStatus(projectId, status);
      
      // Get project info for notification
      const project = await storage.getProject(projectId);
      if (project) {
        // Notify the user about status change
        notifyUser(
          project.userId,
          "Status projekta ažuriran",
          `Status vašeg projekta "${project.title}" je promenjen na: ${status}`
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[ADMIN] Update project status error:", error);
      res.status(500).json({ error: "Greška pri ažuriranju statusa projekta" });
    }
  });

  // ===== ADMIN KATASTAR ENDPOINTS =====

  // Get full client profile for Katastar (projects + contracts + invoices)
  app.get("/api/admin/katastar/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ error: "Nevažeći ID korisnika" });

      const [user, userProjects, userContracts, userInvoices] = await Promise.all([
        storage.getUser(userId),
        storage.getUserProjects(userId),
        storage.getUserContracts(userId),
        storage.getUserInvoices(userId),
      ]);

      if (!user) return res.status(404).json({ error: "Korisnik nije pronađen" });

      res.json({ user, projects: userProjects, contracts: userContracts, invoices: userInvoices });
    } catch (error: any) {
      console.error("[KATASTAR] Get client profile error:", error);
      res.status(500).json({ error: "Greška pri učitavanju profila klijenta" });
    }
  });

  // ===== ADMIN MESSAGING ENDPOINTS =====
  
  // Get all conversations (admin only)
  app.get("/api/admin/messages/conversations", requireAdmin, async (req, res) => {
    try {
      const conversations = await storage.adminGetAllConversations();
      res.json(conversations);
    } catch (error: any) {
      console.error("[ADMIN MESSAGING] Get all conversations error:", error);
      res.status(500).json({ error: "Greška pri učitavanju konverzacija" });
    }
  });

  // Get messages between two users (admin only)
  app.get("/api/admin/messages/conversation/:user1Id/:user2Id", requireAdmin, async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      
      if (isNaN(user1Id) || isNaN(user2Id)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }
      
      // Log admin viewing this conversation
      await storage.adminLogConversationView(req.jwtUser!.id, user1Id, user2Id);
      
      const messages = await storage.adminGetConversationMessages(user1Id, user2Id);
      res.json(messages);
    } catch (error: any) {
      console.error("[ADMIN MESSAGING] Get conversation messages error:", error);
      res.status(500).json({ error: "Greška pri učitavanju poruka" });
    }
  });

  // Delete any message (admin only)
  app.delete("/api/admin/messages/:id", requireAdmin, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ error: "Nevažeći ID poruke" });
      }
      
      await storage.adminDeleteMessage(messageId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[ADMIN MESSAGING] Delete message error:", error);
      res.status(500).json({ error: "Greška pri brisanju poruke" });
    }
  });

  // Get admin audit logs
  app.get("/api/admin/messages/audit-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.adminGetAuditLogs();
      res.json(logs);
    } catch (error: any) {
      console.error("[ADMIN MESSAGING] Get audit logs error:", error);
      res.status(500).json({ error: "Greška pri učitavanju audit logova" });
    }
  });

  // Export conversation to TXT file
  app.get("/api/admin/messages/export/:user1Id/:user2Id", requireAdmin, async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);

      if (isNaN(user1Id) || isNaN(user2Id)) {
        return res.status(400).json({ error: "Nevažeći ID korisnika" });
      }

      const txtContent = await storage.adminExportConversation(user1Id, user2Id);

      const user1 = await storage.getUser(user1Id);
      const user2 = await storage.getUser(user2Id);
      const filename = `konverzacija_${user1?.username}_${user2?.username}_${Date.now()}.txt`;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(txtContent);
    } catch (error: any) {
      console.error("[ADMIN MESSAGING] Export conversation error:", error);
      res.status(500).json({ error: "Greška pri izvozu konverzacije" });
    }
  });

  // Get messaging statistics
  app.get("/api/admin/messages/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.adminGetMessagingStats();
      res.json(stats);
    } catch (error: any) {
      console.error("[ADMIN MESSAGING] Get stats error:", error);
      res.status(500).json({ error: "Greška pri učitavanju statistike" });
    }
  });

  // ========== CONTRACTS ==========

  // Helper function to sanitize client name for filename
  function sanitizeNameForFilename(name: string): string {
    return name
      .replace(/\s+/g, '') // Remove all spaces
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .substring(0, 30); // Limit to 30 characters
  }

  // Generate contract PDF
  app.post("/api/admin/contracts/generate", requireAdmin, async (req, res) => {
    try {
      const { contractType, contractData } = req.body;

      if (!contractType || !contractData) {
        return res.status(400).json({ error: "Tip licence i podaci su obavezni" });
      }

      // Validate contractData based on contract type
      let validatedData: any;
      try {
        switch (contractType) {
          case "mix_master":
            validatedData = mixMasterContractDataSchema.parse(contractData);
            break;
          case "copyright_transfer":
            validatedData = copyrightTransferContractDataSchema.parse(contractData);
            break;
          case "instrumental_sale":
            validatedData = instrumentalSaleContractDataSchema.parse(contractData);
            break;
          default:
            return res.status(400).json({ error: "Nevažeći tip licence" });
        }
      } catch (validationError: any) {
        console.error("[CONTRACTS] Validation error:", validationError);
        return res.status(400).json({ 
          error: "Validacija podataka nije uspela", 
          details: validationError.errors || validationError.message 
        });
      }

      // Get next license number
      const contractNumber = await storage.getNextContractNumber();

      // Generate HMAC-SHA256 verification hash (anti-falsification)
      const verificationHash = createHmac('sha256', process.env.SESSION_SECRET || 'leflow-license-secret')
        .update(`${contractNumber}|${contractType}|${Date.now()}`)
        .digest('hex');

      // Generate PDF based on contract type
      let pdfBuffer: Buffer;
      switch (contractType) {
        case "mix_master":
          pdfBuffer = await generateMixMasterPDF(validatedData as MixMasterContract, contractNumber, verificationHash);
          break;
        case "copyright_transfer":
          pdfBuffer = await generateCopyrightTransferPDF(validatedData as CopyrightTransferContract, contractNumber, verificationHash);
          break;
        case "instrumental_sale":
          pdfBuffer = await generateInstrumentalSalePDF(validatedData as InstrumentalSaleContract, contractNumber, verificationHash);
          break;
        default:
          return res.status(400).json({ error: "Nevažeći tip licence" });
      }

      // Save PDF to disk
      const contractsDir = path.join(process.cwd(), 'attached_assets', 'contracts');
      fs.mkdirSync(contractsDir, { recursive: true });

      // Extract client/buyer name based on contract type
      let clientName = '';
      if (contractType === 'mix_master') {
        clientName = validatedData.clientName || '';
      } else {
        clientName = validatedData.buyerName || '';
      }
      const sanitizedName = sanitizeNameForFilename(clientName);

      // Build filename
      const filename = sanitizedName
        ? `licenca_${contractNumber.replace(/-/g, '_')}_${sanitizedName}.pdf`
        : `licenca_${contractNumber.replace(/-/g, '_')}.pdf`;
      const pdfPath = path.join(contractsDir, filename);
      fs.writeFileSync(pdfPath, pdfBuffer);

      // Save license to database
      const contract = await storage.createContract({
        contractNumber,
        contractType,
        contractData,
        pdfPath: `attached_assets/contracts/${filename}`,
        clientEmail: contractData.clientEmail || null,
        verificationHash,
        createdBy: req.jwtUser!.id,
      });

      // Auto-send license email if client email provided
      if (contractData.clientEmail) {
        try {
          const pdfBase64 = pdfBuffer.toString('base64');
          const emailHtml = licenseDeliveryEmail({
            contractNumber: contract.contractNumber,
            contractType: contract.contractType,
            createdAt: new Date(contract.createdAt),
            verificationHash: contract.verificationHash,
          });
          await sendEmail({
            to: contractData.clientEmail,
            subject: `Studio LeFlow — Licenca ${contract.contractNumber}`,
            html: emailHtml,
            attachments: [{
              filename,
              content: pdfBase64,
              encoding: 'base64',
              contentType: 'application/pdf',
            }],
          });
          console.log(`[CONTRACTS] License email auto-sent to ${contractData.clientEmail}`);
        } catch (emailError: any) {
          console.error("[CONTRACTS] Auto email failed:", emailError.message);
          // Don't fail the request if email fails — license is already saved
        }
      }

      res.json({
        success: true,
        contract: {
          id: contract.id,
          contractNumber: contract.contractNumber,
          contractType: contract.contractType,
          verificationHash: contract.verificationHash,
        }
      });
    } catch (error: any) {
      console.error("[CONTRACTS] Generate error:", error);
      res.status(500).json({ error: "Greška pri generisanju licence", detail: error?.message });
    }
  });

  // Get all contracts
  app.get("/api/admin/contracts", requireAdmin, async (req, res) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error: any) {
      console.error("[CONTRACTS] Get all error:", error);
      res.status(500).json({ error: "Greška pri učitavanju licenci" });
    }
  });

  // Download contract PDF — regenerated on-the-fly from DB data (Railway filesystem is ephemeral)
  app.get("/api/admin/contracts/:id/download", requireAdmin, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        return res.status(400).json({ error: "Nevažeći ID licence" });
      }

      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Licenca nije pronađena" });
      }

      let pdfBuffer: Buffer;
      switch (contract.contractType) {
        case "mix_master":
          pdfBuffer = await generateMixMasterPDF(contract.contractData as MixMasterContract, contract.contractNumber, contract.verificationHash || "");
          break;
        case "copyright_transfer":
          pdfBuffer = await generateCopyrightTransferPDF(contract.contractData as CopyrightTransferContract, contract.contractNumber, contract.verificationHash || "");
          break;
        case "instrumental_sale":
          pdfBuffer = await generateInstrumentalSalePDF(contract.contractData as InstrumentalSaleContract, contract.contractNumber, contract.verificationHash || "");
          break;
        default:
          return res.status(400).json({ error: "Nepoznat tip licence" });
      }

      const filename = `licenca_${contract.contractNumber.replace(/[\/\\]/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("[CONTRACTS] Download error:", error);
      res.status(500).json({ error: "Greška pri preuzimanju licence" });
    }
  });

  // Send contract via email
  app.post("/api/admin/contracts/:id/send-email", requireAdmin, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { email } = req.body;

      if (isNaN(contractId)) {
        return res.status(400).json({ error: "Nevažeći ID licence" });
      }

      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({ error: "Nevažeća email adresa" });
      }

      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Licenca nije pronađena" });
      }

      // Regenerate PDF from DB data (filesystem is ephemeral on Railway)
      let pdfBuffer: Buffer;
      switch (contract.contractType) {
        case "mix_master":
          pdfBuffer = await generateMixMasterPDF(contract.contractData as MixMasterContract, contract.contractNumber, contract.verificationHash || "");
          break;
        case "copyright_transfer":
          pdfBuffer = await generateCopyrightTransferPDF(contract.contractData as CopyrightTransferContract, contract.contractNumber, contract.verificationHash || "");
          break;
        case "instrumental_sale":
          pdfBuffer = await generateInstrumentalSalePDF(contract.contractData as InstrumentalSaleContract, contract.contractNumber, contract.verificationHash || "");
          break;
        default:
          return res.status(400).json({ error: "Nepoznat tip licence" });
      }

      const emailFilename = `licenca_${contract.contractNumber.replace(/[\/\\]/g, '_')}.pdf`;
      const emailHtml = licenseDeliveryEmail({
        contractNumber: contract.contractNumber,
        contractType: contract.contractType,
        createdAt: new Date(contract.createdAt),
        verificationHash: contract.verificationHash,
      });

      await sendEmail({
        to: email,
        subject: `Studio LeFlow - Licenca ${contract.contractNumber}`,
        html: emailHtml,
        attachments: [{ filename: emailFilename, content: pdfBuffer.toString('base64'), encoding: 'base64', contentType: 'application/pdf' }],
      });

      res.json({ success: true, message: "Email uspešno poslat" });
    } catch (error: any) {
      console.error("[CONTRACTS] Send email error:", error);
      res.status(500).json({ error: "Greška pri slanju email-a" });
    }
  });

  // Assign contract to user (or remove assignment with null)
  app.patch("/api/admin/contracts/:id/assign-user", requireAdmin, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { userId } = req.body;

      if (isNaN(contractId)) {
        return res.status(400).json({ error: "Nevažeći ID licence" });
      }

      // userId can be null to remove assignment
      let parsedUserId: number | null = null;
      
      if (userId !== null && userId !== undefined) {
        parsedUserId = parseInt(userId);
        if (isNaN(parsedUserId)) {
          return res.status(400).json({ error: "Nevažeći userId" });
        }

        // Check if user exists (only if userId is provided)
        const user = await storage.getUser(parsedUserId);
        if (!user) {
          return res.status(404).json({ error: "Korisnik nije pronađen" });
        }
      }

      // Update contract userId (can be null to remove assignment)
      await storage.updateContractUser(contractId, parsedUserId);

      // Auto-send license email to user's registered email when assigning
      if (parsedUserId !== null) {
        try {
          const user = await storage.getUser(parsedUserId);
          const contract = await storage.getContractById(contractId);
          if (user?.email && contract) {
            // Regenerate PDF from DB data (filesystem is ephemeral on Railway)
            let autoPdfBuffer: Buffer;
            switch (contract.contractType) {
              case "mix_master":
                autoPdfBuffer = await generateMixMasterPDF(contract.contractData as MixMasterContract, contract.contractNumber, contract.verificationHash || "");
                break;
              case "copyright_transfer":
                autoPdfBuffer = await generateCopyrightTransferPDF(contract.contractData as CopyrightTransferContract, contract.contractNumber, contract.verificationHash || "");
                break;
              case "instrumental_sale":
                autoPdfBuffer = await generateInstrumentalSalePDF(contract.contractData as InstrumentalSaleContract, contract.contractNumber, contract.verificationHash || "");
                break;
              default:
                throw new Error("Unknown contract type");
            }
            const autoFilename = `licenca_${contract.contractNumber.replace(/[\/\\]/g, '_')}.pdf`;
            const emailHtml = licenseDeliveryEmail({
              contractNumber: contract.contractNumber,
              contractType: contract.contractType,
              createdAt: new Date(contract.createdAt),
              verificationHash: contract.verificationHash,
            });
            await sendEmail({
              to: user.email,
              subject: `Studio LeFlow — Licenca ${contract.contractNumber}`,
              html: emailHtml,
              attachments: [{ filename: autoFilename, content: autoPdfBuffer.toString('base64'), encoding: 'base64', contentType: 'application/pdf' }],
            });
            console.log(`[CONTRACTS] License auto-sent to user ${user.email} on assignment`);
          }
        } catch (emailError: any) {
          console.error("[CONTRACTS] Auto email on assign failed:", emailError.message);
          // Don't fail the request if email fails
        }
      }

      const message = parsedUserId === null
        ? "Dodela licence uspešno uklonjena"
        : "Licenca uspešno dodeljena korisniku";

      res.json({ success: true, message });
    } catch (error: any) {
      console.error("[CONTRACTS] Assign user error:", error);
      res.status(500).json({ error: "Greška pri dodeljivanju licence" });
    }
  });

  // Delete contract
  app.delete("/api/admin/contracts/:id", requireAdmin, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      if (isNaN(contractId)) {
        return res.status(400).json({ error: "Nevažeći ID licence" });
      }

      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Licenca nije pronađena" });
      }

      // Delete PDF file
      if (contract.pdfPath) {
        const pdfPath = path.join(process.cwd(), contract.pdfPath);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }

      // Delete from database
      await storage.deleteContract(contractId);

      res.json({ success: true, message: "Licenca uspešno obrisana" });
    } catch (error: any) {
      console.error("[CONTRACTS] Delete error:", error);
      res.status(500).json({ error: "Greška pri brisanju licence" });
    }
  });

  // ============================================================================
  // PUBLIC LICENSE VERIFICATION ENDPOINT
  // ============================================================================

  // Verify license by hash (public, no auth required)
  app.get("/api/verify/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      if (!hash || hash.length < 32) {
        return res.json({ valid: false });
      }
      const contract = await storage.getContractByHash(hash);
      if (!contract) {
        return res.json({ valid: false });
      }
      const contractData = contract.contractData as any;
      const issuedTo = contract.contractType === 'mix_master'
        ? contractData.clientName
        : contractData.buyerName;
      const typeLabel = contract.contractType === 'mix_master'
        ? 'Mix & Master'
        : contract.contractType === 'copyright_transfer'
          ? 'Prenos autorskih prava'
          : 'Prodaja instrumentala';
      const subject = contract.contractType === 'mix_master'
        ? contractData.projectName
        : contract.contractType === 'copyright_transfer'
          ? contractData.songTitle
          : contractData.instrumentalName;
      res.json({
        valid: true,
        licenseNumber: contract.contractNumber,
        licenseType: typeLabel,
        issuedTo: issuedTo || 'N/A',
        subject: subject || 'N/A',
        issuedAt: contract.createdAt,
      });
    } catch (error) {
      res.status(500).json({ valid: false });
    }
  });

  // ============================================================================
  // INVOICE MANAGEMENT ENDPOINTS (Admin only)
  // ============================================================================

  // Create invoice
  app.post("/api/admin/invoices", requireAdmin, async (req, res) => {
    try {
      // Generate invoice number (will be done automatically in storage)
      const invoiceNumber = await storage.getNextInvoiceNumber();
      
      // Validate and prepare invoice data
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        invoiceNumber,
        createdBy: req.jwtUser!.id,
        currency: req.body.currency || "RSD",
        status: req.body.status || "pending",
      });

      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error: any) {
      console.error("[INVOICES] Create error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Nevažeći podaci", details: error.errors });
      }
      res.status(500).json({ error: "Greška pri kreiranju fakture" });
    }
  });

  // Get all invoices
  app.get("/api/admin/invoices", requireAdmin, async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error: any) {
      console.error("[INVOICES] Get all error:", error);
      res.status(500).json({ error: "Greška pri učitavanju faktura" });
    }
  });

  // Update invoice status
  app.patch("/api/admin/invoices/:id/status", requireAdmin, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Nevažeći ID fakture" });
      }

      if (!status || !["pending", "paid", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Nevažeći status fakture" });
      }

      const paidDate = status === "paid" ? new Date() : undefined;
      await storage.updateInvoiceStatus(invoiceId, status, paidDate);

      res.json({ success: true, message: "Status fakture ažuriran" });
    } catch (error: any) {
      console.error("[INVOICES] Update status error:", error);
      res.status(500).json({ error: "Greška pri ažuriranju statusa fakture" });
    }
  });

  // Delete invoice
  app.delete("/api/admin/invoices/:id", requireAdmin, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Nevažeći ID fakture" });
      }

      await storage.deleteInvoice(invoiceId);
      res.json({ success: true, message: "Faktura uspešno obrisana" });
    } catch (error: any) {
      console.error("[INVOICES] Delete error:", error);
      res.status(500).json({ error: "Greška pri brisanju fakture" });
    }
  });

  // ============================================================================
  // ANALYTICS ENDPOINTS (Admin only, with caching)
  // ============================================================================

  // GET /api/admin/analytics/summary - Cached analytics summary
  app.get("/api/admin/analytics/summary", requireAdmin, async (_req, res) => {
    try {
      const cacheKey = 'analytics:summary';
      const cached = getCachedData<any>(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      // Gather all metrics in parallel
      const [
        newUsersToday,
        newUsersWeek,
        newUsersMonth,
        topProjects,
        approvedSongsToday,
        approvedSongsWeek,
        approvedSongsMonth,
        contractStats,
        unreadConversations,
      ] = await Promise.all([
        storage.getNewUsersCount('today'),
        storage.getNewUsersCount('week'),
        storage.getNewUsersCount('month'),
        storage.getTopProjects(10),
        storage.getApprovedSongsCount('today'),
        storage.getApprovedSongsCount('week'),
        storage.getApprovedSongsCount('month'),
        storage.getContractStats(),
        storage.getUnreadConversationsCount(),
      ]);

      const summary = {
        newUsers: {
          today: newUsersToday,
          week: newUsersWeek,
          month: newUsersMonth,
        },
        approvedSongs: {
          today: approvedSongsToday,
          week: approvedSongsWeek,
          month: approvedSongsMonth,
        },
        topProjects: topProjects.slice(0, 5),
        contracts: contractStats,
        unreadConversations,
        activeUsers: getOnlineUsersSnapshot().length,
      };

      setCachedData(cacheKey, summary);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ error: "Greška pri učitavanju analitike" });
    }
  });

  // GET /api/admin/analytics/active-users - Current active users
  app.get("/api/admin/analytics/active-users", requireAdmin, async (_req, res) => {
    try {
      const onlineUserIds = getOnlineUsersSnapshot();
      
      // Fetch user details for online users
      const onlineUsers = await Promise.all(
        onlineUserIds.map(async (userId) => {
          const user = await storage.getUser(userId);
          if (!user) return null;
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
          };
        })
      );

      const validUsers = onlineUsers.filter(u => u !== null);
      res.json({ count: validUsers.length, users: validUsers });
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ error: "Greška pri učitavanju aktivnih korisnika" });
    }
  });

  // ========== ANALYTICS ==========

  // GET /api/admin/analytics/top-projects - Top projects with optional limit
  app.get("/api/admin/analytics/top-projects", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const cacheKey = `analytics:top-projects:${limit}`;
      
      const cached = getCachedData<any>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const topProjects = await storage.getTopProjects(limit);
      setCachedData(cacheKey, topProjects);
      
      res.json(topProjects);
    } catch (error) {
      console.error("Error fetching top projects:", error);
      res.status(500).json({ error: "Greška pri učitavanju top projekata" });
    }
  });

  // ─── Daily Game ─────────────────────────────────────────────────────────────

  // GET /api/game/upcoming — public, returns next scheduled challenge date+time (no song info)
  app.get("/api/game/upcoming", async (_req, res) => {
    try {
      const next = await storage.getNextUpcomingChallenge();
      if (!next) return res.json(null);
      // Compute whether it's already open
      const belgNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
      const belgHour = belgNow.getHours();
      const belgMin = belgNow.getMinutes();
      const todayStr = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Belgrade' }).format(new Date());
      const isToday = next.challengeDate === todayStr;
      const nowMins = belgHour * 60 + belgMin;
      const openMins = next.openHour * 60 + next.openMinute;
      const isOpen = isToday && nowMins >= openMins;
      const minutesUntil = isToday && !isOpen ? openMins - nowMins : 0;
      res.json({ challengeDate: next.challengeDate, openHour: next.openHour, openMinute: next.openMinute, isToday, isOpen, minutesUntil });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // In-memory clip fetch counter (resets on deploy, which is acceptable)
  // Limits how many times a user can download today's clip — prevents refresh-to-replay abuse
  const clipFetchCounts = new Map<string, number>();

  // GET /api/game/clip — proxy today's audio clip through the server to avoid browser CORS on Cloudinary
  app.get("/api/game/clip", requireNotBanned, async (req, res) => {
    try {
      const userId = req.jwtUser!.id;
      const today = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Belgrade' }).format(new Date());
      const trackKey = `${userId}_${today}`;
      const fetchCount = clipFetchCounts.get(trackKey) ?? 0;
      if (fetchCount >= 6) {
        return res.status(429).send("Limit reached");
      }
      clipFetchCounts.set(trackKey, fetchCount + 1);

      const challenge = await storage.getTodayChallenge();
      if (!challenge?.clipUrl) return res.status(404).send("No clip");

      const belgNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
      const nowMins = belgNow.getHours() * 60 + belgNow.getMinutes();
      if (nowMins < challenge.openHour * 60 + challenge.openMinute) {
        return res.status(403).send("Not open yet");
      }

      const upstream = await fetch(challenge.clipUrl);
      if (!upstream.ok) return res.status(502).send("Upstream error");

      const buffer = await upstream.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.send(Buffer.from(buffer));
    } catch (e) {
      res.status(500).send("Server error");
    }
  });

  // GET /api/game/today — challenge info for current user (no correct answers)
  app.get("/api/game/today", requireNotBanned, async (req, res) => {
    try {
      const today = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Belgrade' }).format(new Date());
      const challenge = await storage.getTodayChallenge();
      if (!challenge) return res.json({ available: false, reason: "no_challenge" });

      const belgNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
      const belgHour = belgNow.getHours();
      const belgMin = belgNow.getMinutes();
      const nowTotalMins = belgHour * 60 + belgMin;
      const openTotalMins = challenge.openHour * 60 + challenge.openMinute;
      if (nowTotalMins < openTotalMins) {
        const minutesUntil = openTotalMins - nowTotalMins;
        return res.json({ available: false, reason: "not_yet", minutesUntil, openHour: challenge.openHour, openMinute: challenge.openMinute });
      }

      const guess = await storage.getUserGuessForDate(req.jwtUser!.id as number, today);
      const { correctAnswers, clipUrl, ...safeChallenge } = challenge;
      res.json({
        available: true,
        challenge: { ...safeChallenge, hasClip: !!clipUrl },
        alreadyPlayed: !!guess,
        guess,
      });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // POST /api/game/guess
  app.post("/api/game/guess", requireNotBanned, async (req, res) => {
    try {
      const { answer } = req.body;
      if (!answer || typeof answer !== 'string' || !answer.trim()) {
        return res.status(400).json({ error: "Odgovor je obavezan" });
      }
      if (answer.trim().length > 200) {
        return res.status(400).json({ error: "Odgovor je predugačak" });
      }
      const today = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Belgrade' }).format(new Date());
      const challenge2 = await storage.getTodayChallenge();
      if (!challenge2) return res.status(404).json({ error: "Nema izazova za danas" });
      const belgNow2 = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
      if (belgNow2.getHours() * 60 + belgNow2.getMinutes() < challenge2.openHour * 60 + challenge2.openMinute) {
        return res.status(403).json({ error: "Igra još nije otvorena" });
      }

      const existing = await storage.getUserGuessForDate(req.jwtUser!.id as number, today);
      if (existing) return res.status(409).json({ error: "Već ste odigrali danas" });

      const result = await storage.submitGuess(req.jwtUser!.id as number, today, answer);
      res.json(result);
    } catch (e: any) {
      if (e.message === 'Challenge not found') return res.status(404).json({ error: "Nema izazova za danas" });
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // GET /api/game/leaderboard
  app.get("/api/game/leaderboard", requireNotBanned, async (req, res) => {
    try {
      const weekStart = getWeekStart();
      const [leaderboard, prize] = await Promise.all([
        storage.getWeeklyLeaderboard(weekStart),
        storage.getWeeklyPrize(weekStart),
      ]);
      res.json({ weekStart, leaderboard, prize });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Admin: GET /api/admin/game/challenges
  app.get("/api/admin/game/challenges", requireAdmin, async (_req, res) => {
    res.json(await storage.adminGetChallenges());
  });

  // Admin: POST /api/admin/game/challenges
  app.post("/api/admin/game/challenges", requireAdmin, async (req, res) => {
    try {
      const { challengeDate, clipUrl, correctAnswers, clipStartSeconds, openHour, openMinute } = req.body;
      if (!challengeDate || !correctAnswers) {
        return res.status(400).json({ error: "Datum i tačan odgovor su obavezni" });
      }
      await storage.adminUpsertChallenge({
        challengeDate,
        clipUrl: clipUrl || null,
        correctAnswers,
        clipStartSeconds: clipStartSeconds != null ? Number(clipStartSeconds) : 30,
        openHour: openHour != null ? parseInt(String(openHour), 10) : 17,
        openMinute: openMinute != null ? parseInt(String(openMinute), 10) : 0,
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Admin: DELETE /api/admin/game/challenges/:id
  app.delete("/api/admin/game/challenges/:id", requireAdmin, async (req, res) => {
    try {
      await storage.adminDeleteChallenge(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Greška pri brisanju izazova" });
    }
  });

  // Admin: DELETE /api/admin/game/reset-my-guess — reset admin's own guess for today (for testing)
  app.delete("/api/admin/game/reset-my-guess", requireAdmin, async (req, res) => {
    try {
      await storage.adminResetMyGuess(req.jwtUser!.id as number);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Greška pri resetovanju" });
    }
  });

  // Admin: GET /api/admin/game/prizes
  app.get("/api/admin/game/prizes", requireAdmin, async (_req, res) => {
    res.json(await storage.adminGetWeeklyPrizes());
  });

  // Admin: POST /api/admin/game/prizes
  app.post("/api/admin/game/prizes", requireAdmin, async (req, res) => {
    try {
      const { weekStart, discountPct, prizeDescription, promoCode } = req.body;
      if (!weekStart || !discountPct || !prizeDescription) {
        return res.status(400).json({ error: "Nedeljа, popust i opis su obavezni" });
      }
      await storage.adminUpsertWeeklyPrize({ weekStart, discountPct: Number(discountPct), prizeDescription, promoCode });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Admin: POST /api/admin/game/prizes/:weekStart/set-winner
  app.post("/api/admin/game/prizes/:weekStart/set-winner", requireAdmin, async (req, res) => {
    try {
      const result = await storage.adminSetPrizeWinner(req.params.weekStart);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ===== CLIENT PORTAL ROUTES =====

  // Multer instance for portal audio (50MB limit)
  const portalUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  // --- Admin Portal Routes ---

  app.get("/api/admin/portals", requireAdmin, async (_req, res) => {
    try {
      const portals = await storage.getAllPortals();
      res.json(portals);
    } catch (e) {
      console.error("[Portal] GET /api/admin/portals error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/admin/portals", requireAdmin, async (req, res) => {
    try {
      const { name, clientName } = req.body;
      if (!name?.trim() || !clientName?.trim()) return res.status(400).json({ error: "Naziv projekta i ime klijenta su obavezni" });
      const { randomBytes } = await import("crypto");
      const shareToken = randomBytes(16).toString("hex");
      const portal = await storage.createPortal({ name: name.trim(), clientName: clientName.trim(), shareToken, createdBy: req.jwtUser!.id });
      res.json(portal);
    } catch (e) {
      console.error("[Portal] POST /api/admin/portals error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.delete("/api/admin/portals/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Nevažeći ID" });
      await storage.deletePortal(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.get("/api/admin/portals/:id/versions", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Nevažeći ID" });
      const versions = await storage.getPortalVersions(id);
      res.json(versions);
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/admin/portals/:id/versions", requireAdmin, portalUpload.single("audio"), async (req, res) => {
    try {
      const portalId = parseInt(req.params.id ?? "");
      if (isNaN(portalId)) return res.status(400).json({ error: "Nevažeći ID" });
      if (!req.file) return res.status(400).json({ error: "Fajl nije priložen" });
      const { versionName } = req.body;
      if (!versionName?.trim()) return res.status(400).json({ error: "Naziv verzije je obavezan" });
      const portal = await storage.getPortalById(portalId);
      if (!portal) return res.status(404).json({ error: "Portal nije pronađen" });
      const audioUrl = await uploadAudioToCloudinary(req.file.buffer, "studioleflow/portal-versions", req.file.originalname);
      const version = await storage.createPortalVersion({ portalId, versionName: versionName.trim(), audioUrl });
      res.json(version);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Greška pri uploadu" });
    }
  });

  app.delete("/api/admin/portals/versions/:versionId", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.versionId);
      if (isNaN(id)) return res.status(400).json({ error: "Nevažeći ID" });
      await storage.deletePortalVersion(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.patch("/api/admin/portals/comments/:commentId/resolve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.commentId);
      if (isNaN(id)) return res.status(400).json({ error: "Nevažeći ID" });
      await storage.resolvePortalComment(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/admin/portals/versions/:versionId/comment", requireAdmin, async (req, res) => {
    try {
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) return res.status(400).json({ error: "Nevažeći ID" });
      const { text, timestampSeconds } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: "Tekst komentara je obavezan" });
      const comment = await storage.addPortalComment({
        versionId,
        authorName: "Studio LeFlow",
        authorType: "producer",
        timestampSeconds: parseInt(timestampSeconds) || 0,
        text: text.trim(),
      });
      res.json(comment);
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.get("/api/admin/portals/versions/:versionId/comments", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.versionId);
      if (isNaN(id)) return res.status(400).json({ error: "Nevažeći ID" });
      const comments = await storage.getPortalComments(id);
      res.json(comments);
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // --- Public Portal Routes (no auth, token-based) ---

  app.get("/api/portal/:token", async (req, res) => {
    try {
      const portal = await storage.getPortalByToken(req.params.token);
      if (!portal) return res.status(404).json({ error: "Portal nije pronađen" });
      const versions = await storage.getPortalVersions(portal.id);
      res.json({ portal, versions });
    } catch (e) {
      console.error("[Portal] GET /api/portal/:token error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.get("/api/portal/:token/versions/:versionId/comments", async (req, res) => {
    try {
      const portal = await storage.getPortalByToken(req.params.token);
      if (!portal) return res.status(404).json({ error: "Portal nije pronađen" });
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) return res.status(400).json({ error: "Nevažeći ID" });
      const comments = await storage.getPortalComments(versionId);
      res.json(comments);
    } catch (e) {
      console.error("[Portal] GET comments error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/portal/:token/versions/:versionId/comments", async (req, res) => {
    try {
      const portal = await storage.getPortalByToken(req.params.token);
      if (!portal) return res.status(404).json({ error: "Portal nije pronađen" });
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) return res.status(400).json({ error: "Nevažeći ID" });
      const { text, timestampSeconds } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: "Komentar ne može biti prazan" });
      const comment = await storage.addPortalComment({
        versionId,
        authorName: portal.clientName,
        authorType: "client",
        timestampSeconds: parseInt(timestampSeconds) || 0,
        text: text.trim(),
      });
      res.json(comment);
    } catch (e) {
      console.error("[Portal] POST comment error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // --- Smart Links ---

  app.post("/api/admin/smart-links/fetch-meta", requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL je obavezan" });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const r = await fetch(
        `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=RS`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!r.ok) return res.status(400).json({ error: "Pesma nije pronađena. Proveri link." });

      const data = await r.json() as any;
      const entity = data.entitiesByUniqueId?.[data.entityUniqueId];
      const links = data.linksByPlatform ?? {};

      res.json({
        title: entity?.title ?? "",
        artist: entity?.artistName ?? "",
        coverUrl: entity?.thumbnailUrl ?? "",
        spotifyUrl: links.spotify?.url ?? "",
        youtubeUrl: links.youtube?.url ?? links.youtubeMusic?.url ?? "",
        appleMusicUrl: links.appleMusic?.url ?? "",
        soundcloudUrl: links.soundcloud?.url ?? "",
        tidalUrl: links.tidal?.url ?? "",
        deezerUrl: links.deezer?.url ?? "",
      });
    } catch (e: any) {
      if (e.name === "AbortError") return res.status(408).json({ error: "Zahtev je predugo trajao. Pokušaj ponovo." });
      res.status(500).json({ error: "Greška pri pretrazi pesme" });
    }
  });

  app.get("/api/admin/smart-links", requireAdmin, async (_req, res) => {
    try {
      const links = await storage.getAllSmartLinks();
      res.json(links);
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/admin/smart-links", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSmartLinkSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Nevažeći podaci" });
      const link = await storage.createSmartLink(parsed.data);
      res.json(link);
    } catch (e: any) {
      if (e?.code === "23505") return res.status(409).json({ error: "Slug već postoji. Izaberite drugi." });
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.patch("/api/admin/smart-links/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Nevažeći ID" });
      const parsed = insertSmartLinkSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Nevažeći podaci" });
      const link = await storage.updateSmartLink(id, parsed.data);
      res.json(link);
    } catch (e: any) {
      if (e?.code === "23505") return res.status(409).json({ error: "Slug već postoji. Izaberite drugi." });
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.delete("/api/admin/smart-links/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Nevažeći ID" });
      await storage.deleteSmartLink(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // Upload cover image to Cloudinary for smart links
  app.post("/api/upload/smart-link-cover", requireAdmin, uploadRateLimiter, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fajl nije pronađen" });
      const buf = req.file.buffer;
      const type = await fileTypeFromBuffer(buf);
      if (!type || !type.mime.startsWith("image/")) return res.status(400).json({ error: "Samo slike su dozvoljene" });
      const url = await uploadImageToCloudinary(buf, "studioleflow/smart-links", `smart_cover_${Date.now()}`);
      res.json({ url });
    } catch {
      res.status(500).json({ error: "Greška pri uploadu slike" });
    }
  });

  // Public: get smart link by slug
  app.get("/api/l/:slug", async (req, res) => {
    try {
      const link = await storage.getSmartLinkBySlug(req.params.slug);
      if (!link) {
        console.log(`[SmartLink] 404 slug="${req.params.slug}"`);
        return res.status(404).json({ error: `Link nije pronađen (slug: ${req.params.slug})` });
      }
      res.json(link);
    } catch (e: any) {
      console.error(`[SmartLink] 500 slug="${req.params.slug}":`, e?.message);
      res.status(500).json({ error: `Greška na serveru: ${e?.message ?? "nepoznata greška"}` });
    }
  });

  // Public: record a click on a platform
  app.post("/api/l/:slug/click", async (req, res) => {
    try {
      const link = await storage.getSmartLinkBySlug(req.params.slug);
      if (!link) return res.status(404).json({ error: "Link nije pronađen" });
      const { platform } = req.body;
      const allowed = ["spotify", "youtube", "apple_music", "soundcloud", "tidal", "deezer"];
      if (!platform || !allowed.includes(platform)) return res.status(400).json({ error: "Nevažeća platforma" });
      await storage.recordSmartLinkClick(link.id, platform);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // OG meta tag handler for /l/:slug — returns server-rendered HTML to social crawlers
  // so Instagram/WhatsApp/Discord show a rich link preview with cover art.
  // Real users get next() → SPA handles rendering as normal.
  const CRAWLER_UA = /facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Instagram|Pinterest|Googlebot|bingbot|Discordbot|Applebot|vkShare|Iframely|Embedly/i;

  function escOg(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function ogImageUrl(coverUrl: string | null | undefined, appUrl: string): string {
    if (!coverUrl) return `${appUrl}/leflow-logo-white.png`;
    // Inject Cloudinary transformation for 1200×630 OG image
    if (coverUrl.includes("res.cloudinary.com")) {
      return coverUrl.replace("/upload/", "/upload/w_1200,h_630,c_fill,g_center,q_auto,f_auto/");
    }
    return coverUrl;
  }

  function platformList(link: any): string {
    const names: string[] = [];
    if (link.spotifyUrl) names.push("Spotify");
    if (link.appleMusicUrl) names.push("Apple Music");
    if (link.youtubeUrl) names.push("YouTube");
    if (link.soundcloudUrl) names.push("SoundCloud");
    if (link.tidalUrl) names.push("Tidal");
    if (link.deezerUrl) names.push("Deezer");
    if (!names.length) return "Slušaj na svim platformama";
    if (names.length === 1) return `Slušaj na ${names[0]}`;
    return `Slušaj na ${names.slice(0, -1).join(", ")} i ${names[names.length - 1]}`;
  }

  app.get("/l/:slug", async (req, res, next) => {
    if (!CRAWLER_UA.test(req.headers["user-agent"] ?? "")) return next();
    try {
      const link = await storage.getSmartLinkBySlug(req.params.slug);
      if (!link) return next();
      const appUrl = (process.env.APP_URL ?? "https://studioleflow.com").replace(/\/$/, "");
      const pageUrl = `${appUrl}/l/${link.slug}`;
      const title = escOg(`${link.title} — ${link.artist}`);
      const desc = escOg(`${platformList(link)} — Studio LeFlow`);
      const img = escOg(ogImageUrl(link.coverUrl, appUrl));
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(`<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="music.song">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escOg(pageUrl)}">
<meta property="og:site_name" content="Studio LeFlow">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
</head>
<body><script>location.replace(${JSON.stringify(pageUrl)})</script></body>
</html>`);
    } catch {
      next();
    }
  });

  app.post("/api/portal/:token/versions/:versionId/approve", async (req, res) => {
    try {
      const portal = await storage.getPortalByToken(req.params.token);
      if (!portal) return res.status(404).json({ error: "Portal nije pronađen" });
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) return res.status(400).json({ error: "Nevažeći ID" });
      await storage.approvePortalVersion(versionId, portal.clientName);
      res.json({ ok: true });
    } catch (e) {
      console.error("[Portal] POST approve error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ─── Community Feed ────────────────────────────────────────────────────────

  app.get("/api/posts", requireNotBanned, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 30, 50);
      const offset = Number(req.query.offset) || 0;
      const viewerId = req.jwtUser?.id;
      const feedPosts = await storage.getPosts(viewerId, limit, offset);
      res.json(feedPosts);
    } catch (e) {
      console.error("[Feed] GET /api/posts error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.get("/api/posts/user/:userId", requireNotBanned, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) return res.status(400).json({ error: "Nevažeći ID korisnika" });
      const viewerId = req.jwtUser?.id;
      const userPosts = await storage.getPostsByUser(userId, viewerId);
      res.json(userPosts);
    } catch (e) {
      console.error("[Feed] GET /api/posts/user/:userId error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/posts", requireNotBanned, async (req, res) => {
    try {
      const userId = req.jwtUser!.id;
      const { type, content, audioUrl, imageUrl, collabTag } = req.body;
      const validTypes = ["status", "audio", "image", "collab"];
      if (!type || !validTypes.includes(type)) return res.status(400).json({ error: "Nevažeći tip objave" });
      if (type === "status" && (!content || content.trim().length === 0)) return res.status(400).json({ error: "Status ne može biti prazan" });
      if (content && content.length > 1000) return res.status(400).json({ error: "Tekst ne može biti duži od 1000 karaktera" });
      const post = await storage.createPost({ userId, type, content: content?.trim(), audioUrl, imageUrl, collabTag });
      res.status(201).json(post);
    } catch (e) {
      console.error("[Feed] POST /api/posts error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.delete("/api/posts/:id", requireNotBanned, async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      if (isNaN(postId)) return res.status(400).json({ error: "Nevažeći ID objave" });
      const userId = req.jwtUser!.id;
      const deleted = await storage.deletePost(postId, userId);
      if (!deleted) return res.status(404).json({ error: "Objava nije pronađena ili nemate dozvolu" });
      res.json({ ok: true });
    } catch (e) {
      console.error("[Feed] DELETE /api/posts/:id error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/posts/:id/like", requireNotBanned, async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      if (isNaN(postId)) return res.status(400).json({ error: "Nevažeći ID objave" });
      const userId = req.jwtUser!.id;
      const result = await storage.togglePostLike(postId, userId);
      res.json(result);

      // Notify post owner (only on like, not unlike)
      if (result.liked) {
        const allPosts = await storage.getPosts(undefined, 1000, 0);
        const post = allPosts.find(p => p.id === postId);
        if (post && post.userId !== userId) {
          const liker = await storage.getUser(userId);
          const notif = await storage.createNotification({
            userId: post.userId,
            fromUserId: userId,
            type: "like",
            postId,
            message: `${liker?.username ?? "Neko"} je lajkovao tvoju objavu`,
          });
          broadcastToUser(post.userId, { type: "feed_notification", notification: { ...notif, fromUsername: liker?.username ?? null, fromAvatarUrl: liker?.avatarUrl ?? null } });
        }
      }
    } catch (e) {
      console.error("[Feed] POST /api/posts/:id/like error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.get("/api/posts/:id/comments", requireNotBanned, async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      if (isNaN(postId)) return res.status(400).json({ error: "Nevažeći ID objave" });
      const postComments = await storage.getPostComments(postId);
      res.json(postComments);
    } catch (e) {
      console.error("[Feed] GET /api/posts/:id/comments error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/posts/:id/comments", requireNotBanned, async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      if (isNaN(postId)) return res.status(400).json({ error: "Nevažeći ID objave" });
      const userId = req.jwtUser!.id;
      const { content } = req.body;
      if (!content || content.trim().length === 0) return res.status(400).json({ error: "Komentar ne može biti prazan" });
      if (content.length > 500) return res.status(400).json({ error: "Komentar ne može biti duži od 500 karaktera" });
      const comment = await storage.createPostComment({ postId, userId, content: content.trim() });
      res.status(201).json(comment);

      // Notify post owner + mentioned users
      const allPosts = await storage.getPosts(undefined, 1000, 0);
      const post = allPosts.find(p => p.id === postId);
      const commenter = await storage.getUser(userId);
      if (post && post.userId !== userId) {
        const notif = await storage.createNotification({
          userId: post.userId,
          fromUserId: userId,
          type: "comment",
          postId,
          message: `${commenter?.username ?? "Neko"} je komentarisao tvoju objavu`,
        });
        broadcastToUser(post.userId, { type: "feed_notification", notification: { ...notif, fromUsername: commenter?.username ?? null, fromAvatarUrl: commenter?.avatarUrl ?? null } });
      }
      // Mentions: @username
      const mentions = [...content.matchAll(/@(\w+)/g)].map(m => m[1]);
      for (const mentionedName of mentions) {
        const mentioned = await storage.getUserByUsername(mentionedName);
        if (mentioned && mentioned.id !== userId && mentioned.id !== post?.userId) {
          const notif = await storage.createNotification({
            userId: mentioned.id,
            fromUserId: userId,
            type: "mention",
            postId,
            message: `${commenter?.username ?? "Neko"} te pomenuo u komentaru`,
          });
          broadcastToUser(mentioned.id, { type: "feed_notification", notification: { ...notif, fromUsername: commenter?.username ?? null, fromAvatarUrl: commenter?.avatarUrl ?? null } });
        }
      }
    } catch (e) {
      console.error("[Feed] POST /api/posts/:id/comments error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.delete("/api/posts/:postId/comments/:commentId", requireNotBanned, async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      if (isNaN(commentId)) return res.status(400).json({ error: "Nevažeći ID komentara" });
      const userId = req.jwtUser!.id;
      const deleted = await storage.deletePostComment(commentId, userId);
      if (!deleted) return res.status(404).json({ error: "Komentar nije pronađen" });
      res.json({ ok: true });
    } catch (e) {
      console.error("[Feed] DELETE comment error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.delete("/api/admin/posts/:id", requireAdmin, async (req, res) => {
    try {
      const postId = parseInt(req.params.id, 10);
      if (isNaN(postId)) return res.status(400).json({ error: "Nevažeći ID objave" });
      const deleted = await storage.deletePostAdmin(postId);
      if (!deleted) return res.status(404).json({ error: "Objava nije pronađena" });
      res.json({ ok: true });
    } catch (e) {
      console.error("[Feed] DELETE admin post error:", e);
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/upload/post-image", uploadRateLimiter, requireNotBanned, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fajl nije priložen" });
      const buf = req.file.buffer;
      const ft = await fileTypeFromBuffer(buf);
      if (!ft || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(ft.mime)) {
        return res.status(400).json({ error: "Dozvoljena su samo JPEG, PNG, WebP i GIF fajlovi" });
      }
      const userId = req.jwtUser!.id;
      const url = await uploadRawImageToCloudinary(buf, "studioleflow/posts", `post_${userId}_${Date.now()}`);
      res.json({ url });
    } catch (e) {
      console.error("[Upload] post-image error:", e);
      res.status(500).json({ error: "Greška pri otpremanju slike" });
    }
  });

  app.post("/api/upload/post-audio", uploadRateLimiter, requireNotBanned, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fajl nije priložen" });
      const buf = req.file.buffer;
      const ft = await fileTypeFromBuffer(buf);
      if (!ft || !["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/flac"].includes(ft.mime)) {
        return res.status(400).json({ error: "Dozvoljena su samo MP3, WAV, OGG, AAC i FLAC fajlovi" });
      }
      const userId = req.jwtUser!.id;
      const url = await uploadAudioToCloudinary(buf, "studioleflow/posts", `post_audio_${userId}_${Date.now()}`);
      res.json({ url });
    } catch (e) {
      console.error("[Upload] post-audio error:", e);
      res.status(500).json({ error: "Greška pri otpremanju audio fajla" });
    }
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  app.get("/api/notifications", requireNotBanned, async (req, res) => {
    try {
      const notifs = await storage.getNotifications(req.jwtUser!.id);
      res.json(notifs);
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.get("/api/notifications/unread-count", requireNotBanned, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.jwtUser!.id);
      res.json({ count });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.post("/api/notifications/mark-read", requireNotBanned, async (req, res) => {
    try {
      await storage.markNotificationsRead(req.jwtUser!.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  // ─── Verified artist + collab ─────────────────────────────────────────────

  app.patch("/api/admin/users/:id/verified", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { value } = req.body;
      if (typeof value !== "boolean") return res.status(400).json({ error: "value mora biti boolean" });
      await storage.setVerifiedArtist(userId, value);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.patch("/api/me/collab", requireNotBanned, async (req, res) => {
    try {
      const { available } = req.body;
      if (typeof available !== "boolean") return res.status(400).json({ error: "available mora biti boolean" });
      await storage.setAvailableForCollab(req.jwtUser!.id, available);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  app.get("/api/collab-users", requireNotBanned, async (req, res) => {
    try {
      const collabUsers = await storage.getCollabUsers();
      res.json(collabUsers);
    } catch (e) {
      res.status(500).json({ error: "Greška na serveru" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

function getWeekStart(date?: Date): string {
  const belgrade = new Date((date ?? new Date()).toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
  const day = belgrade.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  belgrade.setDate(belgrade.getDate() + diff);
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Belgrade' }).format(belgrade);
}

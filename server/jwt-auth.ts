import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "fallback-secret-key";
const TOKEN_EXPIRY = "7d";

export interface JWTPayload {
  userId: number;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: SelectUser;
    }
  }
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return next();
  }

  try {
    const user = await storage.getUser(payload.userId);
    if (user && !user.banned) {
      req.jwtUser = user;
    }
  } catch (error) {
    console.error("[JWT] Error fetching user:", error);
  }

  next();
}

export function requireJWTAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.jwtUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireJWTAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.jwtUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.jwtUser.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

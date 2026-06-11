import { createUploadthing, type FileRouter } from "uploadthing/express";
import { verifyToken } from "./jwt-auth";
import { storage } from "./storage";

const f = createUploadthing();

async function getUserFromReq(req: any) {
  // Try req.jwtUser first (set by global middleware)
  if (req.jwtUser) return req.jwtUser;
  // Fall back to directly parsing the Authorization header
  const authHeader = req.headers?.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = verifyToken(authHeader.substring(7));
  if (!payload) return null;
  return await storage.getUser(payload.userId);
}

// Our file upload router
export const uploadRouter = {
  // Audio file uploader for giveaway submissions - Only MP3 files allowed
  audioUploader: f({
    "audio/mpeg": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    }
  })
    .middleware(async ({ req }) => {
      const user = await getUserFromReq(req);
      if (!user || user.banned) throw new Error("Neautorizovan pristup");
      if (!user.emailVerified) throw new Error("Morate verifikovati email adresu");
      return { userId: user.id, username: user.username };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("MP3 upload complete!");
      console.log("User ID:", metadata.userId);
      console.log("File URL:", file.url);
      console.log("File name:", file.name);
      console.log("File type:", file.type);
      
      // Extra validation: ensure it's actually an MP3 file
      if (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith('.mp3')) {
        throw new Error("Dozvoljeni su samo MP3 fajlovi");
      }
      
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileName: file.name
      };
    }),
  
  // Avatar image uploader - Only image files allowed
  avatarUploader: f({
    "image/png": { maxFileSize: "4MB", maxFileCount: 1 },
    "image/jpeg": { maxFileSize: "4MB", maxFileCount: 1 },
    "image/webp": { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      const user = await getUserFromReq(req);
      if (!user || user.banned) throw new Error("Neautorizovan pristup");
      return { userId: user.id, username: user.username };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Avatar upload complete!");
      console.log("User ID:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;

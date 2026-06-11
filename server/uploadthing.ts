import { createUploadthing, type FileRouter } from "uploadthing/express";
import type { Request, Response } from "express";

const f = createUploadthing();

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
      const user = (req as any).jwtUser;
      if (!user) throw new Error("Neautorizovan pristup");
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
      const user = (req as any).jwtUser;
      if (!user) throw new Error("Neautorizovan pristup");
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

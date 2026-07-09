import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import { randomBytes } from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store files in memory for direct Cloudinary upload
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Separate, much larger limit for arbitrary binary uploads (e.g. the desktop
// admin app installer, ~80MB) - the shared `upload` above stays at 20MB for
// every other (image/audio) upload route, so a stray misuse can't silently
// accept a huge file somewhere it shouldn't.
export const uploadLargeFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB
});

export async function uploadImageToCloudinary(buffer: Buffer, folder: string, publicId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export async function uploadRawImageToCloudinary(buffer: Buffer, folder: string, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image", overwrite: false },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// For arbitrary binaries (installer .exe, zip, etc.) that don't fit
// Cloudinary's image processing pipeline. This CLOUDINARY ACCOUNT has a
// hard ~10MB "Maximum file size" restriction configured account-wide
// (Settings -> Upload -> Media upload restrictions on the Cloudinary
// dashboard, or a plan-tier cap) - confirmed by ruling out every other
// explanation: the full file arrives at this server intact (verified via
// a temporary debug route), and neither chunked upload (upload_chunked_stream)
// nor file-based upload_large, nor switching resource_type from "raw" to
// "video", changed the outcome - all rejected at the same cumulative-size
// checkpoint. Chunked upload only works around HTTP transfer timeouts, not
// an account-level stored-file-size cap, so no code-side change here can
// bypass it. upload_large + chunking is kept anyway (harmless, and useful
// once the account's limit is raised for files that still exceed a single
// request's practical transfer size). See CLAUDE.md for the fix (raise the
// limit in the Cloudinary dashboard) before uploading anything over ~10MB
// through this function.
export async function uploadRawFileToCloudinary(buffer: Buffer, folder: string, publicId: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `upload_${randomBytes(8).toString("hex")}`);
  await fs.promises.writeFile(tmpPath, buffer);
  try {
    return await new Promise<string>((resolve, reject) => {
      cloudinary.uploader.upload_large(
        tmpPath,
        { folder, public_id: publicId, resource_type: "raw", overwrite: true, chunk_size: 6 * 1024 * 1024 },
        (error, result) => {
          if (error || !result) return reject(error || new Error("Upload failed"));
          resolve(result.secure_url);
        }
      );
    });
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

export async function uploadAudioToCloudinary(buffer: Buffer, folder: string, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const base = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uid = `${base}_${Date.now()}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: uid,
        resource_type: "video", // Cloudinary uses "video" type for audio
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

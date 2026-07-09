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
// Cloudinary's image processing pipeline. resource_type "raw" on this
// account has a hard ~10MB cap that chunked/upload_large upload does NOT
// bypass (that mechanism works around HTTP transfer timeouts, not an
// account-level per-resource-type size restriction - confirmed by two
// different chunking strategies both still getting rejected at the same
// ceiling). resource_type "video" is Cloudinary's bucket for large files
// on this account (already proven up to typical MP3 sizes by
// uploadAudioToCloudinary below) and allows much larger files - used here
// even though the file isn't actually video, which Cloudinary permits.
export async function uploadRawFileToCloudinary(buffer: Buffer, folder: string, publicId: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `upload_${randomBytes(8).toString("hex")}`);
  await fs.promises.writeFile(tmpPath, buffer);
  try {
    return await new Promise<string>((resolve, reject) => {
      cloudinary.uploader.upload_large(
        tmpPath,
        { folder, public_id: publicId, resource_type: "video", overwrite: true, chunk_size: 6 * 1024 * 1024 },
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

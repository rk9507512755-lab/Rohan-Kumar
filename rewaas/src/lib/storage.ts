import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Media storage. On Vercel (BLOB_READ_WRITE_TOKEN set) files go to Vercel Blob and the public Blob URL is stored;
// elsewhere they are written to UPLOAD_DIR and served by /api/media/*.
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function saveUpload(file: File): Promise<string> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Unsupported file type. Use JPG, PNG, WebP, AVIF, MP4 or WebM.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is larger than 10 MB.");
  const now = new Date();
  const sub = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const name = `${crypto.randomBytes(10).toString("hex")}${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${sub}/${name}`, file, { access: "public", contentType: file.type, addRandomSuffix: false });
    return blob.url;
  }
  const dir = path.join(UPLOAD_DIR, sub);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/api/media/${sub}/${name}`;
}

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(ALLOWED).map(([m, e]) => [e, m]));

import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { saveUpload } from "@/lib/storage";
import { rupeesToPaise } from "@/lib/money";
import type { FormState } from "./types";

export type { FormState };

/** Convert a ZodError into a friendly form state. */
export function fail(err: z.ZodError, message = "Please fix the highlighted fields."): FormState {
  const errors: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    if (!errors[k]) errors[k] = i.message;
  }
  return { ok: false, error: message, errors };
}

export function err(error: string, errors?: Record<string, string>): FormState {
  return { ok: false, error, errors };
}

export function ok(message = "Saved."): FormState {
  return { ok: true, message };
}

/** Plain (non-file) form entries as an object; checkbox groups collapse to arrays via `arrays`. */
export function fields(fd: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    if (k.startsWith("$ACTION")) continue;
    if (arrays.includes(k)) {
      const list = (out[k] as string[] | undefined) ?? [];
      list.push(v);
      out[k] = list;
    } else out[k] = v;
  }
  for (const a of arrays) if (!out[a]) out[a] = [];
  return out;
}

// ---- zod building blocks ----
export const zText = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
export const zOpt = (max = 500) =>
  z.string().trim().max(max, "Too long").optional().transform((v) => (v ? v : null));
export const zBool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const zInt = (label: string, min = 0, max = 1_000_000) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` }).int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} is too large`),
  );
export const zOptInt = (label: string, min = 0, max = 1_000_000) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number({ invalid_type_error: `${label} must be a number` }).int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} is too large`).nullable(),
  );
const RUPEE_RE = /^\d{1,9}(\.\d{1,2})?$/;
/** Rupee amount entered in the form → paise. */
export const zRupees = (label: string, opts: { min?: number } = {}) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[,₹\s]/g, ""))
    .refine((v) => RUPEE_RE.test(v), `Enter ${label.toLowerCase()} in rupees, e.g. 1499 or 1499.50`)
    .transform((v) => rupeesToPaise(v))
    .refine((p) => p >= (opts.min ?? 0), `${label} must be at least ₹${(opts.min ?? 0) / 100}`);
export const zOptRupees = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ?? "").replace(/[,₹\s]/g, ""))
    .refine((v) => v === "" || RUPEE_RE.test(v), `Enter ${label.toLowerCase()} in rupees`)
    .transform((v) => (v === "" ? null : rupeesToPaise(v)));
export const zSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only");
export const zUrlOrPath = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "Enter a full URL (https://…) or a site path starting with /")
  .optional()
  .transform((v) => (v ? v : null));
export const zDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Enter a valid date")
  .transform((v) => (v ? new Date(v) : null));

/**
 * Resolve an image field: an uploaded file (`<name>File`) wins over the URL text (`<name>Url`).
 * Returns null when both are empty. Throws an Error with a friendly message for bad uploads.
 */
export async function imageFrom(fd: FormData, name: string): Promise<string | null> {
  const file = fd.get(`${name}File`);
  if (file && typeof file !== "string" && file.size > 0) return saveUpload(file);
  const url = String(fd.get(`${name}Url`) ?? "").trim();
  if (!url) return null;
  if (!(url.startsWith("/") || /^https?:\/\//i.test(url))) throw new Error("Image URL must start with https:// or /");
  return url;
}

export function files(fd: FormData, name: string): File[] {
  return fd.getAll(name).filter((f): f is File => typeof f !== "string" && f.size > 0);
}

export function isUnique(e: unknown, field?: string): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  if (!field) return true;
  const t = (e.meta as { target?: string[] | string } | undefined)?.target;
  return !t || (Array.isArray(t) ? t.includes(field) : String(t).includes(field));
}

export function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

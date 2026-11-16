"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { fail, fields, ok, zRupees, type FormState } from "../../_lib/form";
import { MONEY_KEYS, PERCENT_KEYS } from "./keys";

const text = (max = 300) => z.string().trim().max(max, "Too long");
const url = z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\//i.test(v), "Enter a full URL starting with https://");
const pct = z.string().trim().regex(/^\d{1,2}$/, "Enter a whole percent from 0 to 99");

const schema = z.object({
  storeName: text(60).min(1, "Store name is required"),
  tagline: text(120),
  supportEmail: z.string().trim().email("Enter a valid email"),
  supportPhone: text(30).min(5, "Enter a phone number"),
  whatsappNumber: z.string().trim().regex(/^\d{10,15}$/, "Digits only, with country code, e.g. 919876543210"),
  address: text(300).min(5, "Enter the store address"),
  gstin: z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, "Enter a valid 15-character GSTIN"),
  ...Object.fromEntries(MONEY_KEYS.map((k) => [k, zRupees("Amount")])),
  ...Object.fromEntries(PERCENT_KEYS.map((k) => [k, pct])),
  instagramHandle: text(60).transform((v) => v.replace(/^@/, "")),
  instagramUrl: url,
  facebookUrl: url,
  pinterestUrl: url,
  youtubeUrl: url,
});

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = schema.safeParse(fields(fd));
  if (!parsed.success) return fail(parsed.error);
  const data = parsed.data as Record<string, string | number>;
  const keys = Object.keys(DEFAULT_SETTINGS);
  await db.$transaction(
    keys
      .filter((k) => k in data)
      .map((key) => {
        const value = String(data[key]);
        return db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
      }),
  );
  revalidatePath("/", "layout");
  return ok("Settings saved.");
}

import "server-only";
import { cache } from "react";
import { db } from "./db";

export const DEFAULT_SETTINGS = {
  storeName: "REWAAS",
  tagline: "The Beauty of Being You.",
  supportEmail: "care@rewaas.com",
  supportPhone: "+91 99999 99999",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999",
  address: "REWAAS Studio, Jaipur, Rajasthan 302001, India",
  gstin: "08ABCDE1234F1Z5",
  freeShippingThreshold: "199900", // paise
  shippingFee: "9900",
  codFee: "4900",
  codMaxOrder: "2500000",
  giftWrapFee: "14900",
  apparelGstThreshold: "250000", // apparel ≤ ₹2,500 → 5%, above → 18%
  apparelGstLow: "5",
  apparelGstHigh: "18",
  hamperGst: "18",
  instagramHandle: "rewaas.official",
  instagramUrl: "https://instagram.com/rewaas.official",
  facebookUrl: "https://facebook.com/rewaas",
  pinterestUrl: "https://pinterest.com/rewaas",
  youtubeUrl: "https://youtube.com/@rewaas",
};
export type Settings = typeof DEFAULT_SETTINGS;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  return out;
});

export function num(s: string): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

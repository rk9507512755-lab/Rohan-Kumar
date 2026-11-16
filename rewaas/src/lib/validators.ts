import { z } from "zod";

export const phoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s\-()]/g, "") : v),
  z.string().regex(/^(\+?91)?0?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
);
export const pincodeSchema = z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code");
export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(100);

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(5, "Enter house / flat and street").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  landmark: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.string().refine((s) => INDIAN_STATES.includes(s), "Select a state"),
  pincode: pincodeSchema,
});
export type AddressInput = z.infer<typeof addressSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  password: passwordSchema,
});

export function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  return d.slice(-10);
}

export function formErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

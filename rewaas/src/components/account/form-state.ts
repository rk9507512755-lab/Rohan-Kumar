/** Shared shape returned by account server actions used with `useActionState`. */
export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  /** Changes on every failed submit so forms can remount with the submitted values. */
  nonce?: number;
};

export type AddressValues = {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

export type TimelineStep = {
  key: string;
  label: string;
  date: string | null;
  note?: string | null;
  state: "done" | "current" | "upcoming" | "cancelled";
};

export const PAYMENT_PREFS = [
  { value: "UPI", label: "UPI", hint: "GPay, PhonePe, Paytm & any UPI app" },
  { value: "CARD", label: "Credit / Debit Card", hint: "Visa, Mastercard, RuPay, Amex" },
  { value: "NETBANKING", label: "Net Banking", hint: "All major Indian banks" },
  { value: "COD", label: "Cash on Delivery", hint: "On eligible orders, small handling fee" },
] as const;

export const RETURN_REASONS = [
  "Size doesn't fit",
  "Colour differs from photos",
  "Quality not as expected",
  "Received a damaged item",
  "Received the wrong item",
  "Changed my mind",
  "Other",
] as const;

export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Want to change size / colour",
  "Want to change the delivery address",
  "Other",
] as const;

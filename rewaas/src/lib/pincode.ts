// Delivery estimate by Indian PIN zone. Replace with a courier serviceability API (Shiprocket, Delhivery) when live.
const METRO_PREFIXES = ["110", "400", "560", "600", "700", "500", "411", "380", "302", "122", "201"];
const NON_SERVICEABLE = new Set<string>([]); // add blocked PIN codes here

export type PincodeResult =
  | { ok: true; pincode: string; zone: string; minDays: number; maxDays: number; cod: boolean; eta: string }
  | { ok: false; error: string };

function addBusinessDays(d: Date, n: number) {
  const out = new Date(d);
  let added = 0;
  while (added < n) {
    out.setDate(out.getDate() + 1);
    if (out.getDay() !== 0) added++;
  }
  return out;
}

export function checkPincode(raw: string, from = new Date()): PincodeResult {
  const pin = String(raw ?? "").trim();
  if (!/^[1-9][0-9]{5}$/.test(pin)) return { ok: false, error: "Please enter a valid 6-digit PIN code." };
  if (NON_SERVICEABLE.has(pin)) return { ok: false, error: "Sorry, we don't deliver to this PIN code yet." };
  const first = pin[0];
  let zone = "Rest of India";
  let minDays = 4, maxDays = 7;
  if (METRO_PREFIXES.some((p) => pin.startsWith(p))) { zone = "Metro"; minDays = 2; maxDays = 4; }
  else if (first === "3") { zone = "Regional"; minDays = 2; maxDays = 5; }
  else if (first === "7" && pin.startsWith("79")) { zone = "North East"; minDays = 6; maxDays = 10; }
  else if (pin.startsWith("744") || pin.startsWith("682 55")) { zone = "Islands"; minDays = 8; maxDays = 12; }
  else if (pin.startsWith("19")) { zone = "J&K / Ladakh"; minDays = 6; maxDays = 9; }
  const eta = addBusinessDays(from, maxDays).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return { ok: true, pincode: pin, zone, minDays, maxDays, cod: zone !== "Islands", eta };
}

export function estimatedDeliveryDate(pin: string, from = new Date()): Date | null {
  const r = checkPincode(pin, from);
  return r.ok ? addBusinessDays(from, r.maxDays) : null;
}

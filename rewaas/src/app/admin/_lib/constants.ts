export const OCCASIONS = ["wedding", "festive", "party", "everyday", "office", "traditional"] as const;
export const COLLECTIONS = ["festive", "bridal", "limited-edition"] as const;
export const SIZE_CHARTS = ["NONE", "SAREE", "SUIT", "LEHENGA", "KURTI"] as const;
export const SIZE_CHART_OPTIONS = SIZE_CHARTS.map((v) => ({ value: v, label: v === "NONE" ? "No size chart" : v.charAt(0) + v.slice(1).toLowerCase() }));
export const GST_OPTIONS = [
  { value: "", label: "Automatic (by price rule)" },
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];
export const HAMPER_GROUPS = ["Apparel", "Accessories", "Sweets & Treats", "Home & Fragrance", "Beauty"];
export const PER_PAGE = 20;

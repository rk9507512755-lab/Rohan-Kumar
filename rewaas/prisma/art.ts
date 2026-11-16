/**
 * REWAAS demo art generator.
 * Produces art-directed SVG placeholders (dress-form compositions inside a jharokha arch) so the demo store
 * is fully browsable before real photography is uploaded through the admin panel. Replace freely.
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

export type Silhouette = "saree" | "lehenga" | "suit" | "kurti" | "hamper" | "potli" | "dupatta" | "jewel";
export type Motif = "buti" | "stripe" | "jaal" | "check" | "plain" | "chevron";

const IVORY = "#FBF7F1";
const IVORY2 = "#F1E7DA";
const GOLD = "#C7A465";
const GOLD_D = "#A9824B";
const WINE = "#5E1A2E";
const INK = "#2A2120";

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
}

function pattern(id: string, base: string, motif: Motif, scale = 1) {
  const acc = isLight(base) ? GOLD_D : GOLD;
  const s = 36 * scale;
  const body =
    motif === "buti"
      ? `<path d="M${s / 2} ${s * 0.2} c ${s * 0.12} ${s * 0.12} ${s * 0.12} ${s * 0.32} 0 ${s * 0.42} c -${s * 0.12} -${s * 0.1} -${s * 0.12} -${s * 0.3} 0 -${s * 0.42}z" fill="${acc}" opacity=".85"/><circle cx="0" cy="${s}" r="${s * 0.06}" fill="${acc}"/><circle cx="${s}" cy="${s}" r="${s * 0.06}" fill="${acc}"/>`
      : motif === "stripe"
        ? `<rect x="0" y="0" width="${s * 0.12}" height="${s}" fill="${acc}" opacity=".7"/><rect x="${s * 0.5}" y="0" width="${s * 0.04}" height="${s}" fill="${acc}" opacity=".5"/>`
        : motif === "jaal"
          ? `<path d="M0 ${s / 2} Q ${s / 4} 0 ${s / 2} ${s / 2} T ${s} ${s / 2} M0 ${s / 2} Q ${s / 4} ${s} ${s / 2} ${s / 2} T ${s} ${s / 2}" stroke="${acc}" stroke-width="${1.4 * scale}" fill="none" opacity=".75"/><circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.07}" fill="${acc}"/>`
          : motif === "check"
            ? `<rect width="${s / 2}" height="${s / 2}" fill="${shade(base, -0.12)}"/><rect x="${s / 2}" y="${s / 2}" width="${s / 2}" height="${s / 2}" fill="${shade(base, -0.12)}"/><path d="M0 0H${s}" stroke="${acc}" stroke-width="1" opacity=".5"/>`
            : motif === "chevron"
              ? `<path d="M0 ${s * 0.7} L ${s / 2} ${s * 0.3} L ${s} ${s * 0.7}" stroke="${acc}" stroke-width="${2 * scale}" fill="none" opacity=".6"/>`
              : `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.02}" fill="${acc}" opacity=".35"/>`;
  return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="${base}"/>${body}</pattern>`;
}

/** Garment silhouette on a dress form, centred at cx, with ground at y=gy, scaled. */
function garment(kind: Silhouette, colour: string, fillId: string, cx = 400, gy = 930, k = 1, accent = GOLD) {
  const t = (x: number, y: number) => `${(cx + (x - 400) * k).toFixed(1)} ${(gy + (y - 930) * k).toFixed(1)}`;
  const dark = shade(colour, -0.28);
  const form = `<rect x="${cx - 18 * k}" y="${gy - 760 * k}" width="${36 * k}" height="${60 * k}" rx="${10 * k}" fill="${IVORY2}" stroke="${shade(IVORY2, -0.15)}"/>
  <ellipse cx="${cx}" cy="${gy - 770 * k}" rx="${22 * k}" ry="${10 * k}" fill="${shade(IVORY2, -0.1)}"/>`;
  const stand = `<line x1="${cx}" y1="${gy - 30 * k}" x2="${cx}" y2="${gy + 10 * k}" stroke="${GOLD_D}" stroke-width="${4 * k}"/><ellipse cx="${cx}" cy="${gy + 12 * k}" rx="${70 * k}" ry="${9 * k}" fill="${INK}" opacity=".18"/>`;
  switch (kind) {
    case "saree":
      return `${stand}${form}
      <path d="M${t(325, 245)} Q ${t(400, 222)} ${t(475, 245)} L ${t(505, 420)} Q ${t(530, 640)} ${t(575, 905)} L ${t(225, 905)} Q ${t(270, 640)} ${t(295, 420)} Z" fill="url(#${fillId})"/>
      <path d="M${t(225, 905)} L ${t(575, 905)} L ${t(571, 880)} L ${t(229, 880)} Z" fill="${accent}" opacity=".9"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${t(360 + i * 14, 640)} L ${t(345 + i * 20, 905)}" stroke="${dark}" stroke-width="${2 * k}" opacity=".45"/>`).join("")}
      <path d="M${t(322, 246)} L ${t(400, 232)} L ${t(545, 560)} L ${t(470, 600)} Z" fill="${shade(colour, -0.12)}"/>
      <path d="M${t(470, 600)} L ${t(545, 560)} L ${t(552, 578)} L ${t(478, 618)} Z" fill="${accent}"/>
      <path d="M${t(322, 246)} L ${t(400, 232)} L ${t(408, 250)} L ${t(334, 266)} Z" fill="${accent}" opacity=".8"/>
      <path d="M${t(352, 252)} L ${t(498, 590)}" stroke="${accent}" stroke-width="${3 * k}" opacity=".7"/>`;
    case "lehenga":
      return `${stand}${form}
      <path d="M${t(150, 915)} Q ${t(205, 700)} ${t(318, 405)} L ${t(482, 405)} Q ${t(595, 700)} ${t(650, 915)} Q ${t(400, 945)} ${t(150, 915)} Z" fill="url(#${fillId})"/>
      <path d="M${t(150, 915)} Q ${t(400, 945)} ${t(650, 915)} L ${t(640, 875)} Q ${t(400, 905)} ${t(160, 875)} Z" fill="${accent}"/>
      <path d="M${t(178, 820)} Q ${t(400, 850)} ${t(622, 820)}" stroke="${accent}" stroke-width="${5 * k}" fill="none" opacity=".75"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${t(340 + i * 20, 420)} Q ${t(320 + i * 27, 700)} ${t(230 + i * 57, 905)}" stroke="${dark}" stroke-width="${1.6 * k}" fill="none" opacity=".3"/>`).join("")}
      <path d="M${t(325, 248)} Q ${t(400, 228)} ${t(475, 248)} L ${t(488, 395)} L ${t(312, 395)} Z" fill="${shade(colour, -0.1)}"/>
      <path d="M${t(312, 395)} L ${t(488, 395)} L ${t(482, 412)} L ${t(318, 412)} Z" fill="${accent}"/>
      <path d="M${t(470, 250)} Q ${t(560, 420)} ${t(520, 700)} Q ${t(505, 820)} ${t(560, 900)} L ${t(610, 890)} Q ${t(560, 760)} ${t(585, 560)} Q ${t(590, 360)} ${t(478, 244)} Z" fill="${shade(colour, 0.35)}" opacity=".55"/>
      <path d="M${t(560, 900)} L ${t(610, 890)}" stroke="${accent}" stroke-width="${6 * k}"/>`;
    case "suit":
      return `${stand}${form}
      <path d="M${t(345, 800)} L ${t(330, 905)} L ${t(390, 905)} L ${t(398, 810)} Z M${t(402, 810)} L ${t(410, 905)} L ${t(470, 905)} L ${t(455, 800)} Z" fill="${shade(colour, -0.2)}"/>
      <path d="M${t(318, 252)} Q ${t(400, 226)} ${t(482, 252)} L ${t(540, 330)} L ${t(512, 350)} L ${t(495, 420)} Q ${t(540, 640)} ${t(575, 830)} L ${t(225, 830)} Q ${t(260, 640)} ${t(305, 420)} L ${t(288, 350)} L ${t(260, 330)} Z" fill="url(#${fillId})"/>
      <path d="M${t(225, 830)} L ${t(575, 830)} L ${t(571, 810)} L ${t(229, 810)} Z" fill="${accent}"/>
      <path d="M${t(360, 240)} Q ${t(400, 300)} ${t(440, 240)}" stroke="${accent}" stroke-width="${5 * k}" fill="none"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${(cx + (-56 + i * 16) * k).toFixed(1)}" cy="${(gy + (-610 + Math.abs(i - 3.5) * -6) * k).toFixed(1)}" r="${3 * k}" fill="${accent}"/>`).join("")}
      <path d="M${t(318, 252)} Q ${t(250, 420)} ${t(275, 640)} Q ${t(290, 760)} ${t(250, 880)} L ${t(205, 870)} Q ${t(240, 760)} ${t(222, 600)} Q ${t(215, 380)} ${t(312, 246)} Z" fill="${shade(colour, 0.4)}" opacity=".55"/>`;
    case "kurti":
      return `${stand}${form}
      <path d="M${t(350, 760)} L ${t(345, 905)} L ${t(395, 905)} L ${t(398, 770)} Z M${t(402, 770)} L ${t(405, 905)} L ${t(455, 905)} L ${t(450, 760)} Z" fill="${IVORY2}" stroke="${shade(IVORY2, -0.12)}"/>
      <path d="M${t(322, 252)} Q ${t(400, 228)} ${t(478, 252)} L ${t(530, 345)} L ${t(505, 360)} L ${t(488, 420)} Q ${t(505, 600)} ${t(520, 780)} L ${t(280, 780)} Q ${t(295, 600)} ${t(312, 420)} L ${t(295, 360)} L ${t(270, 345)} Z" fill="url(#${fillId})"/>
      <path d="M${t(280, 780)} L ${t(520, 780)} L ${t(518, 762)} L ${t(282, 762)} Z" fill="${accent}" opacity=".85"/>
      <path d="M${t(400, 238)} L ${t(400, 330)}" stroke="${accent}" stroke-width="${4 * k}"/>
      ${[0, 1, 2, 3].map((i) => `<circle cx="${cx}" cy="${(gy + (-680 + i * 20) * k).toFixed(1)}" r="${3 * k}" fill="${accent}"/>`).join("")}`;
    case "hamper":
      return `<ellipse cx="${cx}" cy="${gy + 8 * k}" rx="${250 * k}" ry="${16 * k}" fill="${INK}" opacity=".16"/>
      <rect x="${cx - 205 * k}" y="${gy - 330 * k}" width="${50 * k}" height="${210 * k}" rx="${8 * k}" fill="${shade(colour, 0.5)}"/>
      <rect x="${cx - 140 * k}" y="${gy - 380 * k}" width="${70 * k}" height="${260 * k}" rx="${30 * k}" fill="${GOLD}" opacity=".85"/>
      <circle cx="${cx + 60 * k}" cy="${gy - 300 * k}" r="${62 * k}" fill="${shade(colour, 0.25)}"/>
      <circle cx="${cx + 60 * k}" cy="${gy - 300 * k}" r="${40 * k}" fill="none" stroke="${GOLD}" stroke-width="${3 * k}"/>
      <rect x="${cx + 130 * k}" y="${gy - 350 * k}" width="${70 * k}" height="${230 * k}" rx="${6 * k}" fill="${IVORY2}" stroke="${GOLD_D}"/>
      <rect x="${cx - 240 * k}" y="${gy - 200 * k}" width="${480 * k}" height="${200 * k}" rx="${10 * k}" fill="url(#${fillId})"/>
      <rect x="${cx - 240 * k}" y="${gy - 200 * k}" width="${480 * k}" height="${22 * k}" fill="${shade(colour, -0.2)}"/>
      <rect x="${cx - 14 * k}" y="${gy - 200 * k}" width="${28 * k}" height="${200 * k}" fill="${accent}"/>
      <path d="M${cx} ${gy - 205 * k} q ${-70 * k} ${-60 * k} ${-90 * k} ${-10 * k} q ${30 * k} ${30 * k} ${90 * k} ${10 * k} q ${70 * k} ${-60 * k} ${90 * k} ${-10 * k} q ${-30 * k} ${30 * k} ${-90 * k} ${10 * k}z" fill="${accent}"/>
      <rect x="${cx - 90 * k}" y="${gy - 110 * k}" width="${180 * k}" height="${56 * k}" rx="${4 * k}" fill="${IVORY}" opacity=".95"/>
      <text x="${cx}" y="${gy - 74 * k}" text-anchor="middle" font-family="Georgia,serif" font-size="${26 * k}" letter-spacing="${6 * k}" fill="${WINE}">REWAAS</text>`;
    case "potli":
      return `<ellipse cx="${cx}" cy="${gy + 6 * k}" rx="${150 * k}" ry="${12 * k}" fill="${INK}" opacity=".16"/>
      <path d="M${t(330, 520)} Q ${t(260, 700)} ${t(300, 900)} Q ${t(400, 940)} ${t(500, 900)} Q ${t(540, 700)} ${t(470, 520)} Z" fill="url(#${fillId})"/>
      <path d="M${t(320, 520)} Q ${t(400, 490)} ${t(480, 520)} Q ${t(400, 560)} ${t(320, 520)} Z" fill="${shade(colour, -0.2)}"/>
      <path d="M${t(310, 600)} Q ${t(400, 630)} ${t(490, 600)}" stroke="${accent}" stroke-width="${8 * k}" fill="none"/>
      <path d="M${t(340, 515)} Q ${t(330, 360)} ${t(400, 330)} Q ${t(470, 360)} ${t(460, 515)}" stroke="${accent}" stroke-width="${4 * k}" fill="none"/>
      <circle cx="${cx}" cy="${gy - 160 * k}" r="${26 * k}" fill="${accent}"/><circle cx="${cx}" cy="${gy - 160 * k}" r="${12 * k}" fill="${shade(colour, 0.3)}"/>`;
    case "dupatta":
      return `${stand}
      <path d="M${t(380, 180)} L ${t(420, 180)} L ${t(420, 905)} L ${t(380, 905)} Z" fill="${GOLD_D}" opacity=".6"/>
      <path d="M${t(250, 200)} Q ${t(400, 160)} ${t(550, 200)} Q ${t(600, 560)} ${t(560, 900)} L ${t(240, 900)} Q ${t(200, 560)} ${t(250, 200)} Z" fill="url(#${fillId})" opacity=".92"/>
      <path d="M${t(240, 900)} L ${t(560, 900)} L ${t(556, 860)} L ${t(244, 860)} Z" fill="${accent}"/>
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${t(300 + i * 50, 220)} Q ${t(290 + i * 55, 560)} ${t(270 + i * 65, 860)}" stroke="${shade(colour, -0.25)}" stroke-width="${2 * k}" fill="none" opacity=".35"/>`).join("")}`;
    case "jewel":
      return `<ellipse cx="${cx}" cy="${gy - 380 * k}" rx="${210 * k}" ry="${210 * k}" fill="${shade(colour, 0.1)}"/>
      <path d="M${t(250, 420)} Q ${t(400, 700)} ${t(550, 420)}" stroke="${GOLD}" stroke-width="${14 * k}" fill="none"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => { const a = Math.PI * (0.15 + i * 0.0875); return `<circle cx="${(cx + Math.cos(a) * 190 * k).toFixed(1)}" cy="${(gy - 510 * k + Math.sin(a) * 190 * k).toFixed(1)}" r="${(i === 4 ? 26 : 14) * k}" fill="${i % 2 ? GOLD : IVORY}" stroke="${GOLD_D}" stroke-width="${3 * k}"/>`; }).join("")}
      <path d="M${t(400, 700)} l ${-24 * k} ${50 * k} l ${24 * k} ${40 * k} l ${24 * k} ${-40 * k} z" fill="${WINE}" stroke="${GOLD}" stroke-width="${4 * k}"/>`;
  }
}

function arch(x: number, y: number, w: number, h: number, fill: string, stroke = GOLD, opacity = 1) {
  const r = w / 2;
  return `<path d="M${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y - r * 0.12} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" opacity="${opacity}"/>`;
}

function grain() {
  return `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0"/></filter>`;
}

export function productArt(opts: { seed: string; kind: Silhouette; colour: string; motif: Motif; variant: 0 | 1 | 2; label?: string }) {
  const r = rng(opts.seed + opts.variant);
  const bgs = [["#F6EEE4", "#EBDCCB"], ["#F3E9E6", "#E5D0CB"], ["#EEF0EA", "#DCE0D4"], ["#F4EDE2", "#E6D6C0"]];
  const [b1, b2] = bgs[Math.floor(r() * bgs.length)];
  const W = 800, H = 1000;
  if (opts.variant === 1) {
    // Fabric detail crop
    return svg(W, H, `<defs>${pattern("p", opts.colour, opts.motif === "plain" ? "buti" : opts.motif, 2.2)}${grain()}</defs>
    <rect width="${W}" height="${H}" fill="url(#p)"/>
    <rect y="${H * 0.72}" width="${W}" height="${H * 0.12}" fill="${GOLD}" opacity=".9"/>
    <rect y="${H * 0.745}" width="${W}" height="${H * 0.07}" fill="url(#p)" opacity=".55"/>
    <path d="M0 ${H * 0.72} H ${W}" stroke="${GOLD_D}" stroke-width="3"/><path d="M0 ${H * 0.84} H ${W}" stroke="${GOLD_D}" stroke-width="3"/>
    <rect width="${W}" height="${H}" filter="url(#grain)"/>
    <text x="40" y="${H - 50}" font-family="Jost,Arial,sans-serif" font-size="20" letter-spacing="5" fill="${isLight(opts.colour) ? INK : IVORY}" opacity=".85">FABRIC DETAIL</text>`);
  }
  const k = opts.kind === "hamper" || opts.kind === "jewel" ? 1.1 : 0.95;
  return svg(W, H, `<defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></radialGradient>
    ${pattern("p", opts.colour, opts.motif)}${grain()}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${arch(170, 110, 460, 860, shade(b2, 0.25), GOLD, 0.9)}
  ${arch(195, 140, 410, 830, "none", GOLD, 0.5)}
  <rect x="0" y="${H - 70}" width="${W}" height="70" fill="${shade(b2, -0.04)}"/>
  ${opts.variant === 2 ? `<g transform="translate(${W / 2} ${H / 2}) scale(1.6) translate(${-W / 2} ${-H / 2 + 120})">${garment(opts.kind, opts.colour, "p", 400, 930, k)}</g>` : garment(opts.kind, opts.colour, "p", 400, 930, k)}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>`);
}

export function editorialArt(opts: { seed: string; w: number; h: number; colours: string[]; kinds: Silhouette[]; tone?: "wine" | "ivory" | "blush"; align?: "left" | "right" | "center" }) {
  const { w: W, h: H } = opts;
  const tone = opts.tone ?? "wine";
  const [c1, c2] = tone === "wine" ? ["#6B2034", "#3A0F1C"] : tone === "blush" ? ["#F1E2DA", "#DCC0B3"] : ["#F7F0E6", "#E8D9C4"];
  const n = opts.kinds.length;
  const portrait = H > W;
  const region = opts.align === "center" || portrait ? [0.08, 0.92] : opts.align === "left" ? [0.04, 0.55] : [0.45, 0.97];
  const span = (region[1] - region[0]) * W;
  const scale = Math.min((H / 1000) * (portrait ? 0.62 : 0.86), span / n / 430);
  const gy = portrait ? H * 0.97 : H * 0.95;
  const items = opts.kinds
    .map((kind, i) => {
      const cx = region[0] * W + span * ((i + 0.5) / n);
      const archW = Math.min(span / n * 0.92, 520 * scale);
      const archH = 880 * scale;
      return `${arch(cx - archW / 2, gy - archH, archW, archH + 10, tone === "wine" ? "#FFFFFF" : shade(c2, -0.06), GOLD, tone === "wine" ? 0.07 : 0.6)}
      ${garment(kind, opts.colours[i % opts.colours.length], `p${i}`, cx, gy - 10 * scale, scale)}`;
    })
    .join("");
  const defs = opts.kinds.map((_, i) => pattern(`p${i}`, opts.colours[i % opts.colours.length], (["buti", "jaal", "stripe", "chevron"] as Motif[])[i % 4], Math.max(0.6, scale))).join("");
  return svg(W, H, `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>${defs}${grain()}</defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 137) % W}" cy="${(i * 211) % H}" r="${1.4 + (i % 3)}" fill="${GOLD}" opacity=".35"/>`).join("")}
  <rect x="0" y="${gy}" width="${W}" height="${H - gy}" fill="${shade(c2, -0.1)}"/>
  ${items}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>`);
}

export function componentArt(opts: { seed: string; shape: "candle" | "box" | "jar" | "bottle" | "fabric" | "jewel" | "card" | "potli"; colour: string }) {
  const W = 600, H = 600;
  const c = opts.colour;
  const body =
    opts.shape === "candle" ? `<rect x="220" y="230" width="160" height="230" rx="14" fill="${c}"/><rect x="220" y="300" width="160" height="70" fill="${IVORY}" opacity=".9"/><text x="300" y="345" text-anchor="middle" font-family="Georgia" font-size="22" fill="${WINE}" letter-spacing="4">REWAAS</text><path d="M300 230 v-40" stroke="${INK}" stroke-width="4"/><path d="M300 150 q 18 25 0 42 q -18 -17 0 -42z" fill="${GOLD}"/>`
    : opts.shape === "box" ? `<rect x="150" y="260" width="300" height="200" rx="8" fill="${c}"/><rect x="140" y="230" width="320" height="50" rx="6" fill="${shade(c, -0.15)}"/><rect x="288" y="230" width="24" height="230" fill="${GOLD}"/><circle cx="300" cy="225" r="22" fill="${GOLD}"/>`
    : opts.shape === "jar" ? `<rect x="210" y="200" width="180" height="40" rx="8" fill="${GOLD}"/><path d="M200 250 h200 v190 q0 30 -30 30 h-140 q-30 0 -30 -30z" fill="${c}"/><rect x="230" y="310" width="140" height="70" fill="${IVORY}"/><text x="300" y="352" text-anchor="middle" font-family="Georgia" font-size="18" fill="${WINE}">MITHAI</text>`
    : opts.shape === "bottle" ? `<rect x="275" y="140" width="50" height="60" fill="${GOLD}"/><path d="M240 210 h120 v240 q0 20 -20 20 h-80 q-20 0 -20 -20z" fill="${c}" opacity=".9"/><rect x="255" y="300" width="90" height="90" fill="${IVORY}"/>`
    : opts.shape === "fabric" ? `<path d="M150 380 q150 -80 300 0 v80 q-150 -80 -300 0z" fill="${c}"/><path d="M150 300 q150 -80 300 0 v80 q-150 -80 -300 0z" fill="${shade(c, 0.2)}"/><path d="M150 380 q150 -80 300 0" stroke="${GOLD}" stroke-width="8" fill="none"/>`
    : opts.shape === "jewel" ? `<path d="M180 250 Q300 450 420 250" stroke="${GOLD}" stroke-width="12" fill="none"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${190 + i * 37}" cy="${260 + Math.sin((i / 6) * Math.PI) * 110}" r="${i === 3 ? 22 : 12}" fill="${i % 2 ? c : IVORY}" stroke="${GOLD_D}" stroke-width="3"/>`).join("")}`
    : opts.shape === "card" ? `<rect x="170" y="190" width="260" height="240" rx="6" fill="${IVORY}" stroke="${GOLD}" stroke-width="3" transform="rotate(-6 300 300)"/><text x="300" y="310" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="30" fill="${WINE}" transform="rotate(-6 300 300)">With Love</text>`
    : `<path d="M230 300 Q 190 400 220 470 Q 300 500 380 470 Q 410 400 370 300 Z" fill="${c}"/><path d="M225 300 Q300 280 375 300" stroke="${GOLD}" stroke-width="8" fill="none"/><circle cx="300" cy="400" r="16" fill="${GOLD}"/>`;
  return svg(W, H, `<defs><radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#FAF4EC"/><stop offset="1" stop-color="#EBDDCB"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/><ellipse cx="300" cy="480" rx="190" ry="16" fill="${INK}" opacity=".12"/>${body}`);
}

function svg(w: number, h: number, inner: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">${inner.replace(/\n\s*/g, "")}</svg>`;
}

export function writeArt(publicPath: string, content: string) {
  const file = path.join(process.cwd(), "public", publicPath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return publicPath;
}

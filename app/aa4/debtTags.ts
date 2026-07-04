// Small helpers for tagging imported debts by their reporting bank.

/** Trim a bank's legal name down to something short for a row tag. */
export function shortBank(name?: string): string {
  if (!name) return "";
  return name
    .replace(/בנק/g, "")
    .replace(/בע["״׳']?מ/g, "")
    .replace(/לישראל/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Bank branding: a colored monogram mark per reporting institution. ---
// Colors approximate each brand's identity so banks are distinguishable at a
// glance; the badge carries the initial, the row still shows the full name.
export interface BankBrand {
  color: string;
  initial: string;
}

const BANK_BRANDS: { test: RegExp; color: string; initial: string }[] = [
  { test: /לאומי/, color: "#0c4a8b", initial: "ל" },        // Leumi navy
  { test: /פועלים/, color: "#c8102e", initial: "פ" },        // Hapoalim red
  { test: /מזרחי|טפחות/, color: "#c56a12", initial: "מ" },   // Mizrahi-Tefahot
  { test: /דיסקונט/, color: "#0a7d3b", initial: "ד" },       // Discount green
  { test: /מרכנתיל/, color: "#0a7d3b", initial: "מר" },
  { test: /בינלאומי/, color: "#12579e", initial: "ב" },      // FIBI
  { test: /ירושלים/, color: "#8a6d1f", initial: "י" },
  { test: /יהב/, color: "#1a7a3f", initial: "יה" },
  { test: /איגוד/, color: "#00477d", initial: "א" },
  { test: /ישראכרט|isracard/i, color: "#c8102e", initial: "יש" },
  { test: /כאל|cal|ויזה/i, color: "#0b5fa5", initial: "כ" },
  { test: /\bמקס\b|max/i, color: "#cc0070", initial: "מ" },
  { test: /טריא|triya/i, color: "#5b4bd6", initial: "ט" },
  { test: /אמריקן|amex|אמקס/i, color: "#1f6fb2", initial: "A" },
  { test: /כרטיסי אשראי|אשראי/, color: "#4f57a6", initial: "כ" },
];

export function bankBrand(source?: string): BankBrand {
  const s = source || "";
  const hit = BANK_BRANDS.find((b) => b.test.test(s));
  if (hit) return { color: hit.color, initial: hit.initial };
  const first = s.replace(/^בנק\s*/, "").trim().charAt(0) || "?";
  return { color: "#5f7883", initial: first };
}

// --- Debt category (mortgage vs plain loan) visual encoding. ---
export interface CatMeta {
  color: string;
  tint: string;
  label: string;
}
export function catMeta(kind: "mortgage" | "loan" | undefined, typeLabel?: string): CatMeta {
  if (kind === "mortgage") {
    return { color: "var(--brand)", tint: "var(--brand-tint)", label: typeLabel || "משכנתה" };
  }
  return { color: "var(--cat-loan)", tint: "var(--cat-loan-tint)", label: typeLabel || "הלוואה" };
}

export interface TagColor {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

/** Distinct, soft colors — one per bank, cycled by order of appearance. */
export const TAG_PALETTE: TagColor[] = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", dot: "bg-teal-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-500" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
  { bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-700", dot: "bg-fuchsia-500" },
];

/** Build a stable bank → color map by first-seen order over the given sources. */
export function buildBankColors(sources: (string | undefined)[]): Map<string, TagColor> {
  const map = new Map<string, TagColor>();
  let i = 0;
  for (const s of sources) {
    if (s && !map.has(s)) {
      map.set(s, TAG_PALETTE[i % TAG_PALETTE.length]);
      i++;
    }
  }
  return map;
}

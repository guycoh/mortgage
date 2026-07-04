// Small helpers for tagging imported debts by their reporting bank.

/** Trim a bank's legal name down to something short for a row tag. */
export function shortBank(name?: string): string {
  if (!name) return "";
  return name
    .replace(/בע["״׳']?מ/g, "")
    .replace(/לישראל/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

// Field coverage: every label a bank template prints, against every label its
// parser looks up. What is printed and never read is the shape of the bug that
// left עוגן and מרווח empty on the Mizrahi template for its whole life.
//
// Run: npx tsx scripts/audit-coverage.mts
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { detectBank } from "../lib/bank-parser/detect";
import { pageLines, norm } from "../lib/bank-parser/text";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

async function pagesOf(p: string): Promise<RawPage[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(p)), useSystemFonts: true })
    .promise;
  const out: RawPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const tc = await pg.getTextContent();
    out.push({
      page: n,
      items: (tc.items as any[])
        .filter((it) => it.str)
        .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
    });
  }
  return out;
}

/** Which source file reads which bank. */
const PARSER: Record<string, string> = {
  discount: "discount",
  mercantile: "discount",
  leumi: "leumi",
  poalim: "poalim",
  mizrahi: "mizrahi",
};

/**
 * Labels only, and only from the pages that carry data.
 *
 * A label is a run ending in a colon, or one of the handful this family of forms
 * writes without one. The explanatory pages are excluded outright — they are
 * prose about fees, not fields, and would bury the signal.
 */
function labelsOf(pages: RawPage[], dataPages: number[]): Set<string> {
  const out = new Set<string>();
  for (const p of pages.filter((p) => dataPages.includes(p.page))) {
    for (const line of pageLines(p)) {
      for (const it of line.items) {
        const s = it.str.trim();
        if (!/[֐-׿]/.test(s)) continue;
        if (!/:\s*$/.test(s)) continue;
        const label = s.replace(/[:\s*]+$/, "").trim();
        // Anything long enough to be a sentence is prose, not a field name.
        if (label.length < 3 || label.length > 42) continue;
        out.add(label);
      }
    }
  }
  return out;
}

const DIR = "C:/Users/noama/OneDrive/Desktop/Credit Data System report extractor/Bank-Templates";
const files = [
  ...fs.readdirSync(DIR).filter((f) => /\.pdf$/i.test(f)).map((f) => path.join(DIR, f)),
  ...process.argv.slice(2).filter((a) => /\.pdf$/i.test(a)),
];

/** Every label the parser mentions, as a normalised haystack. */
const sourceOf = new Map<string, string>();
for (const b of new Set(Object.values(PARSER))) {
  sourceOf.set(b, norm(fs.readFileSync(`lib/bank-parser/banks/${b}.ts`, "utf8")));
}

const unread = new Map<string, Set<string>>();

for (const f of files) {
  const pages = await pagesOf(f);
  const det = detectBank(pages);
  if (!det) {
    console.log(`\n### ${path.basename(f)} — no template matched, skipped`);
    continue;
  }
  const src = sourceOf.get(PARSER[det.bank])!;
  const labels = labelsOf(pages, det.dataPages);
  const missing = Array.from(labels).filter((l) => !src.includes(norm(l)));

  console.log(
    `\n### ${path.basename(f)}  [${det.bank}]  ${labels.size} labels on data pages, ${missing.length} not referenced by the parser`
  );
  for (const m of missing.sort()) console.log(`    · ${m}`);

  const bucket = unread.get(det.bank) ?? new Set<string>();
  missing.forEach((m) => bucket.add(m));
  unread.set(det.bank, bucket);
}

console.log("\n================ unread labels, by template ================");
for (const [bank, set] of Array.from(unread.entries())) {
  console.log(`\n${bank}: ${set.size}`);
  Array.from(set).sort().forEach((s) => console.log(`  ${s}`));
}

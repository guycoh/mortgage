// Which template each sample detects as, and the bank name printed in the file.
// Run: npx tsx scripts/dump-detect.mts [extra.pdf ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { detectBank } from "../lib/bank-parser/detect";
import { pageText } from "../lib/bank-parser/text";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

async function pagesOf(p: string): Promise<RawPage[]> {
  const data = new Uint8Array(fs.readFileSync(p));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
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

const NAMES: [string, RegExp][] = [
  ["מזרחי-טפחות", /מזרחי[\s-]*טפחות/],
  ["ירושלים", /בנק\s*ירושלים/],
  ["לאומי", /לאומי\s*למשכנתאות|בנק\s*לאומי/],
  ["הפועלים", /בנק\s*הפועלים|משכן/],
  ["דיסקונט", /בנק\s*דיסקונט/],
  ["מרכנתיל", /מרכנתיל/],
];

const DIR = "C:/Users/noama/OneDrive/Desktop/Credit Data System report extractor/Bank-Templates";
const files = [
  ...fs.readdirSync(DIR).filter((f) => /\.pdf$/i.test(f)).map((f) => path.join(DIR, f)),
  ...process.argv.slice(2),
];

for (const f of files) {
  const pages = await pagesOf(f);
  const whole = pages.map((p) => pageText(p)).join("\n");
  const det = detectBank(pages);
  const printed = NAMES.filter(([, re]) => re.test(whole)).map(([n]) => n);
  console.log(
    `${path.basename(f).padEnd(58)} detected=${det ? `${det.bank}/${det.template}` : "NONE"}  printed=[${printed.join(", ")}]`
  );
}

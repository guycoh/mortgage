// Dump a PDF as reading-order lines, with x/y for each item.
// Run: npx tsx scripts/dump-pdf.mts <file> [--items] [--pages 1,2,3]
import fs from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { pageLines } from "../lib/bank-parser/text";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

const file = process.argv[2];
const showItems = process.argv.includes("--items");
const pagesArg = process.argv.find((a) => a.startsWith("--pages="));
const want = pagesArg ? pagesArg.slice(8).split(",").map(Number) : null;

const data = new Uint8Array(fs.readFileSync(file));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
console.log(`pages: ${doc.numPages}`);
for (let n = 1; n <= doc.numPages; n++) {
  if (want && !want.includes(n)) continue;
  const pg = await doc.getPage(n);
  const tc = await pg.getTextContent();
  const page: RawPage = {
    page: n,
    items: (tc.items as any[])
      .filter((it) => it.str)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
  };
  console.log(`\n================= PAGE ${n} =================`);
  for (const l of pageLines(page)) {
    if (showItems) {
      console.log(
        `y=${l.y.toFixed(0).padStart(4)} | ` +
          l.items.map((i) => `[${i.x.toFixed(0)}]${i.str.trim()}`).join("  ")
      );
    } else {
      console.log(`y=${l.y.toFixed(0).padStart(4)} | ${l.text}`);
    }
  }
}

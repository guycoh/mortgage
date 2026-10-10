// Dumps the credit-report and bank-letter analyses as JSON, for designing and
// checking the /aa105test presentation views against real documents.
// Run: npx tsx --tsconfig tsconfig.json scripts/dump-insights.mts <out-dir> <pdf...>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseReport } from "../lib/credit-parser/parse";
import { parseBankStatement, detectBank } from "../lib/bank-parser";
import { analyseStatement } from "../lib/bank-parser/analysis";
import { analyseReports } from "../app/aa102test/lib/analysis";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

async function pagesOf(p: string): Promise<RawPage[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(p)), useSystemFonts: true }).promise;
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

const [outDir, ...files] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
for (const f of files) {
  const pages = await pagesOf(f);
  const base = path.basename(f).replace(/\.pdf$/i, "");
  if (detectBank(pages)) {
    const a = analyseStatement(parseBankStatement(pages));
    fs.writeFileSync(path.join(outDir, `${base}.bank.json`), JSON.stringify(a, null, 1));
    console.log(base, "bank", a.totals.balance, a.findings.length, "findings");
  } else {
    const a = analyseReports([parseReport(pages)], [path.basename(f)]);
    fs.writeFileSync(path.join(outDir, `${base}.credit.json`), JSON.stringify(a, null, 1));
    console.log(base, "credit", a.totals.balance, a.flags.length, "flags");
  }
}

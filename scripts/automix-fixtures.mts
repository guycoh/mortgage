// The real credit-report fixtures, read in Node exactly the way the board reads
// them (parseReport → importReportToLoans → mergeReportLoans for a household),
// plus the board's own analysis of them. The PDFs live OUTSIDE the repo
// (../credit-report-fixtures/reports) and never enter it; nothing here prints
// or stores a name or an ID — callers print figures only.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseReport } from "../lib/credit-parser/parse";
import { importReportToLoans, mergeReportLoans, type ImportedLoan } from "../app/aa102test/lib/credit";
import { analyseReports, type Analysis } from "../app/aa102test/lib/analysis";

const REPO = process.cwd();
export const FIXTURES = path.resolve(REPO, "../credit-report-fixtures/reports");

const require = createRequire(path.join(REPO, "package.json"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjs: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pagesOf(file: string): Promise<any[]> {
  if (!pdfjs) {
    pdfjs = await import(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
    } catch {}
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true, verbosity: 0 }).promise;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pages: any[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    pages.push({
      page: n,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (tc.items as any[]).filter((i) => i.str).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })),
    });
  }
  return pages;
}

export type Household = { id: string; master: ImportedLoan[]; analysis: Analysis; reportDate: string };

/** One report, or several merged as one household (the board's two-spouse case). */
export async function household(id: string, files: string[]): Promise<Household> {
  const warn = console.warn;
  console.warn = () => {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reports: any[] = [];
    let rows: ImportedLoan[] = [];
    let date = "";
    for (const f of files) {
      const report = parseReport(await pagesOf(path.join(FIXTURES, f)));
      reports.push(report);
      const sum = importReportToLoans(report, "master", f);
      date = sum.reportDate || date;
      rows = rows.length ? mergeReportLoans(rows, sum.loans, f).merged : sum.loans;
    }
    return { id, master: rows, analysis: analyseReports(reports), reportDate: date };
  } finally {
    console.warn = warn;
  }
}

export const FIXTURE_SETS: { id: string; files: string[] }[] = [
  { id: "r01", files: ["r01.pdf"] },
  { id: "r02", files: ["r02.pdf"] },
  { id: "r01+r02", files: ["r01.pdf", "r02.pdf"] },
  { id: "r03", files: ["r03.pdf"] },
  { id: "r04", files: ["r04.pdf"] },
  { id: "r05", files: ["r05.pdf"] },
  { id: "r06", files: ["r06.pdf"] },
  { id: "r07", files: ["r07.pdf"] },
];

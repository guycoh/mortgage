"use client";

// Browser-side extraction: read the PDF with pdf.js entirely in the user's
// browser (the file is never uploaded), then run the shared parser.

import { parseReport } from "./parse";
import type { CreditReport, RawPage } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

let workerReady = false;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerReady = true;
  }
  return pdfjs;
}

export async function extractPages(file: File): Promise<RawPage[]> {
  const pdfjs = await loadPdfjs();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: RawPage[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = (tc.items as any[])
      .filter((it) => typeof it.str === "string" && it.str.length > 0)
      .map((it) => ({
        str: it.str as string,
        x: it.transform[4] as number,
        y: it.transform[5] as number,
        w: it.width as number,
      }));
    pages.push({ page: p, items });
  }
  await doc.cleanup();
  return pages;
}

export async function parsePdfFile(file: File): Promise<CreditReport> {
  const pages = await extractPages(file);
  const report = parseReport(pages);
  if (!report.client.idNumber && report.transactions.length === 0) {
    throw new Error(
      "לא זוהו נתונים בקובץ. ודאו שמדובר בדוח ריכוז נתונים של מערכת נתוני אשראי (PDF)."
    );
  }
  return report;
}

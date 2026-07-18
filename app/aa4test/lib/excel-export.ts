"use client";

// Browser side of the Excel export: build the workbook, hand it to the user.
// The building itself lives in ./excel-build so it can also run headless.

import { buildLiabilitiesWorkbook, workbookFileName, type ExportInput } from "./excel-build";

export { workbookFileName, type ExportInput };

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Builds the workbook and triggers a download. Everything happens in the tab —
 * the credit report never leaves the browser, which is the promise the page
 * makes in its header ("עיבוד מקומי בדפדפן").
 */
export async function exportLiabilitiesToExcel(input: ExportInput): Promise<void> {
  const wb = await buildLiabilitiesWorkbook(input);
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));

  const a = document.createElement("a");
  a.href = url;
  a.download = workbookFileName(input.slots);
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Safari needs the object URL to outlive the click before it is reclaimed.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Prints a written .xlsx as a plain-text grid — values, formats and the styling
// flags that matter — so a sheet's layout can be reviewed from a terminal.
//
//   npx tsx scripts/dump-excel.mts <file.xlsx> [sheet-name]

import ExcelJS from "exceljs";

const [file, only] = process.argv.slice(2);
if (!file) throw new Error("usage: dump-excel.mts <file.xlsx> [sheet-name]");

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

const show = (v: unknown, numFmt?: string): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleDateString("he-IL");
  if (typeof v === "number") {
    if (numFmt?.includes("%")) return `${(v * 100).toFixed(2)}%`;
    return Math.round(v).toLocaleString("en-US") + (numFmt?.includes("₪") ? "₪" : "");
  }
  if (typeof v === "object" && "richText" in (v as object))
    return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
  return String(v).replace(/\n/g, "⏎");
};

const pad = (s: string, w: number) => {
  const len = [...s].length;
  return len > w ? [...s].slice(0, w - 1).join("") + "…" : s + " ".repeat(w - len);
};

for (const ws of wb.worksheets) {
  if (only && ws.name !== only) continue;
  const cols = ws.columnCount;
  const rows = ws.rowCount;
  const view = ws.views[0] as { rightToLeft?: boolean; state?: string; ySplit?: number };
  console.log(
    `\n${"═".repeat(100)}\n▓ ${ws.name}   ${rows}r × ${cols}c   rtl=${view?.rightToLeft} freeze=${view?.state ?? "-"}@${view?.ySplit ?? "-"} filter=${ws.autoFilter ? JSON.stringify(ws.autoFilter).replace(/"/g, "") : "-"}\n${"═".repeat(100)}`
  );
  console.log(
    "     " +
      Array.from({ length: cols }, (_, i) => pad(`[${i + 1}:${Math.round(ws.getColumn(i + 1).width ?? 0)}]`, 18)).join("")
  );

  for (let r = 1; r <= rows; r++) {
    const row = ws.getRow(r);
    const cells: string[] = [];
    let any = false;
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getCell(r, c);
      const s = show(cell.value, cell.numFmt);
      if (s) any = true;
      const fill = cell.fill as { type?: string; fgColor?: { argb?: string } };
      const tint =
        fill?.type === "gradient"
          ? "▚"
          : fill?.fgColor?.argb && fill.fgColor.argb !== "FFFFFFFF"
            ? { FF135573: "█", FFEAF2F7: "▒", FFF5F8FA: "░", FFE7F4EF: "◍", FFFBEDEB: "◆" }[fill.fgColor.argb] ?? "▓"
            : " ";
      cells.push(tint + pad(s, 17));
    }
    if (!any && !cells.some((x) => x[0] !== " ")) continue;
    console.log(`${String(r).padStart(3)}|${row.height ? String(Math.round(row.height)).padStart(2) : "  "}` + cells.join(""));
  }
}
console.log(
  "\nlegend: █ header band · ▒ wash/totals · ░ zebra · ◍ joint · ◆ alert · ▚ gradient · ▓ other fill\n"
);

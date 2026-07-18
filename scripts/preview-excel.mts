// Renders a written .xlsx back to an HTML facsimile — real fills, fonts,
// borders, column widths, merges and number formats — so the workbook's design
// can be reviewed in a browser without opening Excel.
//
//   npx tsx scripts/preview-excel.mts <file.xlsx> <out.html>

import { writeFileSync } from "node:fs";
import ExcelJS from "exceljs";

// A third argument narrows the render to one sheet — the whole workbook at once
// is more DOM than a preview pane wants to lay out.
const [file, out = "preview.html", only] = process.argv.slice(2);
if (!file) throw new Error("usage: preview-excel.mts <file.xlsx> [out.html] [sheet-name]");

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

const argb = (c?: { argb?: string; theme?: number }) =>
  c?.argb ? `#${c.argb.slice(2)}` : undefined;

const BORDER_W: Record<string, string> = {
  thin: "1px solid",
  medium: "2px solid",
  thick: "3px solid",
  double: "3px double",
  hair: "1px solid",
};

const edge = (b?: { style?: string; color?: { argb?: string } }) =>
  b?.style ? `${BORDER_W[b.style] ?? "1px solid"} ${argb(b.color) ?? "#ccc"}` : "0";

/** Apply the cell's numFmt well enough to judge the layout. */
function render(value: unknown, numFmt?: string): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date)
    return value.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (typeof value === "number") {
    if (numFmt?.includes("%")) return `${(value * 100).toFixed(2)}%`;
    const n = Math.round(value).toLocaleString("en-US");
    return numFmt?.includes("₪") ? `${n} ₪` : n;
  }
  if (typeof value === "object" && value && "richText" in value)
    return (value as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br><small>") + "";
}

const sheets = wb.worksheets
  .filter((ws) => !only || ws.name === only)
  .map((ws) => {
    // merge map: "row:col" -> {rowspan, colspan} for masters, "skip" for covered
    const spans = new Map<string, { rs: number; cs: number } | "skip">();
    for (const range of (ws.model as unknown as { merges: string[] }).merges ?? []) {
      const m = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if (!m) continue;
      const col = (s: string) => s.split("").reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
      const [c1, r1, c2, r2] = [col(m[1]), +m[2], col(m[3]), +m[4]];
      spans.set(`${r1}:${c1}`, { rs: r2 - r1 + 1, cs: c2 - c1 + 1 });
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++) if (!(r === r1 && c === c1)) spans.set(`${r}:${c}`, "skip");
    }

    // columnCount/rowCount are max indices; the `actual*` counterparts are
    // counts of non-empty tracks, which skip leading gutters. Use the indices.
    const lastCol = ws.columnCount;
    const cols = Array.from({ length: lastCol }, (_, i) => {
      const w = ws.getColumn(i + 1).width ?? 8.43;
      return `<col style="width:${Math.round(w * 7.2 + 6)}px">`;
    }).join("");

    const rows: string[] = [];
    const lastRow = ws.rowCount;
    for (let r = 1; r <= lastRow; r++) {
      const row = ws.getRow(r);
      const h = row.height ? `height:${(row.height * 4) / 3}px` : "height:24px";
      const cells: string[] = [];
      for (let c = 1; c <= lastCol; c++) {
        const span = spans.get(`${r}:${c}`);
        if (span === "skip") continue;
        const cell = ws.getCell(r, c);
        const f = cell.font ?? {};
        const a = cell.alignment ?? {};
        const b = cell.border ?? {};
        const fill = cell.fill as { type?: string; fgColor?: { argb?: string }; stops?: { color: { argb: string } }[] };
        let bg = "";
        if (fill?.type === "pattern" && fill.fgColor) bg = `background:${argb(fill.fgColor)};`;
        if (fill?.type === "gradient" && fill.stops)
          bg = `background:linear-gradient(90deg,${fill.stops.map((s) => argb(s.color)).join(",")});`;

        const style = [
          bg,
          f.size ? `font-size:${(f.size * 4) / 3}px;` : "",
          f.bold ? "font-weight:700;" : "",
          f.color ? `color:${argb(f.color)};` : "",
          `text-align:${a.horizontal === "left" ? "left" : a.horizontal === "center" ? "center" : "right"};`,
          `vertical-align:${a.vertical === "top" ? "top" : a.vertical === "bottom" ? "bottom" : "middle"};`,
          a.wrapText ? "white-space:normal;" : "white-space:nowrap;",
          `border-top:${edge(b.top)};border-bottom:${edge(b.bottom)};`,
          `border-left:${edge(b.left)};border-right:${edge(b.right)};`,
        ].join("");

        const sp = span && span !== "skip" ? ` colspan="${span.cs}" rowspan="${span.rs}"` : "";
        cells.push(`<td${sp} style="${style}">${render(cell.value, cell.numFmt)}</td>`);
      }
      rows.push(`<tr style="${h}">${cells.join("")}</tr>`);
    }

    const tab = argb((ws.properties as { tabColor?: { argb?: string } }).tabColor) ?? "#888";
    return `<section><h2><i style="background:${tab}"></i>${ws.name}<b>${lastRow} × ${lastCol}</b></h2>
      <div class="scroll"><table dir="rtl"><colgroup>${cols}</colgroup>${rows.join("")}</table></div></section>`;
  })
  .join("\n");

writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><title>${file}</title>
<style>
  body{margin:0;padding:28px;background:#e9edf1;font-family:Arial,sans-serif;direction:rtl}
  section{margin:0 0 34px}
  h2{display:flex;align-items:center;gap:10px;font-size:15px;color:#0f2028;margin:0 0 8px}
  h2 i{width:12px;height:12px;border-radius:3px}
  h2 b{margin-inline-start:auto;font:400 11px/1 Arial;color:#7a8c95}
  .scroll{overflow:auto;background:#fff;box-shadow:0 2px 20px -8px rgba(15,32,40,.35);border-radius:6px}
  table{border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;font-size:13px;color:#0f2028}
  td{padding:1px 6px;overflow:hidden}
  small{font-size:.78em;opacity:.72}
</style>${sheets}`,
  "utf8"
);
console.log(`wrote ${out} — ${wb.worksheets.length} sheets`);

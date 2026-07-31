// End-to-end audit of the /aa100test ledger: drops each document type, asserts
// the things a screenshot cannot prove (column edges, row heights, bidi order),
// and writes full-resolution screenshots of what it checked.
//
//   node scripts/audit-ledger.mjs [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] ?? path.join(process.env.TEMP ?? ".", "ledger-audit");
const BASE = "http://localhost:3400";
const LEAD = 6201;
fs.mkdirSync(OUT, { recursive: true });

const DOCS = [
  { key: "mercantile", url: "/__t_merc.pdf", note: "מרכנתיל — anchor levels, one צמוד מדד row", bank: /מרכנתיל/ },
  { key: "leumi", url: "/__t_leumi.pdf", note: "לאומי — 6 tranches, prime + variable + fixed", bank: /לאומי/ },
  // The statement that proved the template had been attributed to the wrong
  // lender for its whole life, and that the block naming עוגן and מרווח on every
  // variable חלק was never read.
  { key: "mizrahi", url: "/__t_mizrahi.pdf", note: "מזרחי טפחות — עוגן+מרווח per חלק, a 30-month reset", bank: /מזרחי/ },
  { key: "credit", url: "/__t_credit.pdf", note: "חיווי אשראי — two families, no anchors printed", bank: null },
];

let issues = 0;
const fail = (m) => {
  console.log(`  !! ${m}`);
  issues++;
};
const ok = (m) => console.log(`  ok  ${m}`);
const check = (cond, m, detail = "") => (cond ? ok(`${m}${detail ? ` (${detail})` : ""}`) : fail(`${m}${detail ? ` (${detail})` : ""}`));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

/** The ledger table, never the comparison table that follows it. */
const ledger = () => page.locator("table.fin-table").first();
const ledgerRows = () => ledger().locator("tr.fin-row");

const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));

/** Drop a PDF through the Bay's file input and wait for rows. */
async function drop(url) {
  await page.evaluate(async (u) => {
    const inp = document.querySelector('input[type=file][accept*=pdf]');
    const r = await fetch(u);
    const f = new File([await r.blob()], u.split("/").pop(), { type: "application/pdf" });
    const dt = new DataTransfer();
    dt.items.add(f);
    inp.files = dt.files;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }, url);
  await page.waitForFunction(
    () => document.querySelectorAll("table.fin-table tr.fin-row").length > 0,
    { timeout: 45000 }
  );
  await page.waitForTimeout(700); // let the charts settle before shooting
}

/** Everything measurable about the ledger, read from the live DOM. */
const probe = () =>
  page.evaluate(() => {
    const t = document.querySelectorAll("table.fin-table")[0];
    const r1 = (n) => Math.round(n * 10) / 10;
    const TR = (el) => {
      if (!el) return null;
      const rg = document.createRange();
      rg.selectNodeContents(el);
      return r1(rg.getBoundingClientRect().right);
    };
    const IR = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect(), c = getComputedStyle(el);
      return r1(b.right - parseFloat(c.paddingRight) - parseFloat(c.borderRightWidth));
    };
    const mid = (el) => (el ? r1(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2) : null);
    // Word order as it lands on screen, left to right.
    //
    // Compared at WORD level, not character level: Hebrew inside a word is
    // supposed to run right-to-left, so sorting characters by x "reverses" every
    // Hebrew word and reports correct rendering as a scramble. What bidi actually
    // breaks is the order of the runs — "6.00% −0.40%" arriving as
    // "0.40%− 6.00%" — and that is what this catches.
    const visualWords = (el) => {
      if (!el) return null;
      const txt = el.textContent ?? "";
      const node = el.firstChild;
      if (!node || node.nodeType !== 3 || !txt.trim()) return txt.trim();
      const words = [];
      let i = 0;
      for (const w of txt.split(/(\s+)/)) {
        if (w.trim()) {
          const rg = document.createRange();
          rg.setStart(node, i);
          rg.setEnd(node, i + w.length);
          words.push({ w, x: rg.getBoundingClientRect().left });
        }
        i += w.length;
      }
      return words.sort((a, b) => a.x - b.x).map((o) => o.w).join(" ");
    };

    const ths = [...t.querySelectorAll("thead th")];
    const rows = [...t.querySelectorAll("tr.fin-row")];
    const gbs = [...t.querySelectorAll("tr.fin-groupbar")];
    const tf = [...t.querySelectorAll("tfoot td")];
    const COL = { amount: 1, rate: 4, anchor: 5, freq: 6, months: 7, end: 8, pay: 9 };

    return {
      headers: ths.map((h) => h.textContent.trim()),
      headerOverflow: ths.filter((h) => h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent.trim()),
      tableWidth: Math.round(t.getBoundingClientRect().width),
      pageScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      rowHeights: [...new Set(rows.map((r) => r1(r.getBoundingClientRect().height)))],
      // one edge per money column, across all four levels of total
      amountEdges: [...new Set([
        TR(ths[COL.amount]),
        ...rows.map((r) => IR(r.children[COL.amount].querySelector("input"))),
        ...gbs.map((g) => TR(g.children[1].querySelector(".fin-groupbar-sum"))),
        TR(tf[1]?.querySelector(".fin-total-fig")),
      ].filter((v) => v !== null))],
      payEdges: [...new Set([
        TR(ths[COL.pay]),
        ...rows.map((r) => TR(r.children[COL.pay].querySelector(".fin-pay"))).filter(Boolean),
        ...gbs.map((g) => TR(g.children[3].querySelector(".fin-groupbar-sum"))),
        TR(tf[3]?.querySelector(".fin-total-fig")),
      ].filter((v) => v !== null))],
      // vertical: the calculated figure must sit where the editable fields sit
      verticalDrift: rows.map((r) => {
        const a = mid(r.children[COL.amount].querySelector("input"));
        const p = mid(r.children[COL.pay].querySelector(".fin-pay"));
        return p === null ? null : r1(Math.abs(a - p));
      }).filter((v) => v !== null),
      rows: rows.map((r) => {
        const anchorCell = r.children[COL.anchor];
        const payNote = r.children[COL.pay].querySelector(".fin-note-pay");
        return {
          fam: r.children[0].innerText.trim().split("\n")[0],
          // The lender as the row states it — full text, not the abbreviated
          // form the cell prints, because that is what is stored and exported.
          source: r.children[COL.amount].querySelector(".fin-note")?.getAttribute("title") ?? "",
          amount: r.children[COL.amount].querySelector("input").value,
          rate: r.children[COL.rate].querySelector("input").value,
          anchorRate: anchorCell.querySelectorAll("input")[0].value,
          margin: anchorCell.querySelectorAll("input")[1].value,
          anchorTip: anchorCell.querySelector(".fin-well")?.getAttribute("title") ?? "",
          anchorNotes: anchorCell.querySelectorAll(".fin-note").length,
          freq: (r.children[COL.freq].querySelector("input")?.value ?? "").trim(),
          months: r.children[COL.months].querySelector("input").value,
          end: r.children[COL.end].querySelector("input")?.value ?? "",
          pay: r.children[COL.pay].querySelector(".fin-pay")?.textContent ?? r.children[COL.pay].innerText.trim(),
          payNote: payNote?.innerText.replace(/\n/g, " ") ?? "",
        };
      }),
      clippedFields: rows.flatMap((r) =>
        [...r.querySelectorAll("input.fin-cell")]
          .filter((i) => i.scrollWidth > i.clientWidth + 1 && i.value)
          .map((i) => i.value)
      ),
      totals: {
        amount: tf[1]?.innerText.trim(),
        monthly: tf[3]?.innerText.trim(),
      },
    };
  });

for (const doc of DOCS) {
  console.log(`\n################ ${doc.key} — ${doc.note}`);
  await page.goto(`${BASE}/aa100test/${LEAD}`, { waitUntil: "networkidle" });
  await page.waitForSelector("input[type=file][accept*=pdf]", { state: "attached", timeout: 30000 });
  await drop(doc.url);
  const p = await probe();

  console.log(`  table ${p.tableWidth}px · ${p.headers.length} columns · ${p.rows.length} rows`);
  console.log(`  totals: ${p.totals.amount} / ${p.totals.monthly}`);
  for (const r of p.rows) {
    console.log(
      `    ${r.fam.padEnd(8)} ${r.amount.padStart(9)}  rate=${String(r.rate).padStart(5)}%  anchor=${String(r.anchorRate || "-").padStart(6)} margin=${String(r.margin || "-").padStart(6)}  freq="${r.freq}"  ${r.months}m  ${r.end}  ${r.pay}${r.payNote ? ` [${r.payNote}]` : ""}
             tip: ${r.anchorTip}`
    );
  }

  if (doc.bank) {
    // A statement read under the wrong template does not fail loudly — it reads
    // right-looking numbers out of the wrong cells — so the lender each row
    // names is asserted against the file, not merely printed.
    const wrongBank = p.rows.filter((r) => !doc.bank.test(r.source));
    check(wrongBank.length === 0, `every row names the lender that printed the file`,
      wrongBank.map((r) => `"${r.source}"`).join(", ") || p.rows[0]?.source);
  }

  check(p.headers.length === 11, "11 columns", p.headers.join(" | "));
  check(p.headerOverflow.length === 0, "no header overflows its column", p.headerOverflow.join(", "));
  check(!p.pageScrollX, "page does not scroll horizontally");
  check(p.rowHeights.length === 1, "every row is the same height", `${p.rowHeights.join(", ")}px`);
  check(p.amountEdges.length <= 2 && Math.max(...p.amountEdges) - Math.min(...p.amountEdges) < 1,
    "סכום: header, rows, subtotals and total share one edge", p.amountEdges.join(", "));
  check(p.payEdges.length <= 2 && Math.max(...p.payEdges) - Math.min(...p.payEdges) < 1,
    "החזר חודשי: header, rows, subtotals and total share one edge", p.payEdges.join(", "));
  check(p.verticalDrift.every((d) => d < 0.5), "החזר figure sits level with the row's fields",
    `max drift ${Math.max(0, ...p.verticalDrift)}px`);
  check(p.rows.every((r) => !r.pay.includes("/")), "no /ח suffix on any monthly figure");
  check(p.rows.every((r) => r.anchorNotes === 0), "עוגן cell is numeric — no worded note left in it");
  const priced = p.rows.filter((r) => r.anchorRate !== "" && r.margin !== "");
  const wrongSum = priced.filter((r) => Math.abs(Number(r.anchorRate) + Number(r.margin) - Number(r.rate)) > 0.011);
  check(wrongSum.length === 0, "עוגן + מרווח = the row's ריבית, on every priced row",
    wrongSum.map((r) => `${r.anchorRate}+${r.margin}≠${r.rate}`).join("; ") || `${priced.length} of ${p.rows.length} rows priced`);
  // a row with a margin must have an anchor and vice versa — half a sum is a bug
  const halfSum = p.rows.filter((r) => (r.anchorRate === "") !== (r.margin === ""));
  check(halfSum.length === 0, "no row carries one half of the anchor sum",
    halfSum.map((r) => `anchor="${r.anchorRate}" margin="${r.margin}"`).join("; "));
  // Months, not a phrase. Blank is a valid answer — a fixed rate has no reset
  // cycle — so what is asserted is that whatever IS there is a whole number.
  const badFreq = p.rows.filter((r) => r.freq !== "" && !/^\d+$/.test(r.freq));
  check(badFreq.length === 0, "תדירות שינוי holds whole months or nothing",
    badFreq.map((r) => `"${r.freq}"`).join(", ") ||
      `${p.rows.filter((r) => r.freq).length}/${p.rows.length} rows have an interval`);
  check(p.clippedFields.length === 0, "no field clips its own value", p.clippedFields.join(", "));

  await page.screenshot({ path: path.join(OUT, `${doc.key}-page.png`), fullPage: false });
  const card = ledger();
  await card.screenshot({ path: path.join(OUT, `${doc.key}-table.png`) });
  console.log(`  shot ${doc.key}-table.png`);
}

/* ---- a hand-added row: can it state everything an imported one can? ---- */
console.log(`\n################ manual row`);
await page.goto(`${BASE}/aa100test/${LEAD}`, { waitUntil: "networkidle" });
await page.waitForSelector("input[type=file][accept*=pdf]", { state: "attached", timeout: 30000 });
await drop("/__t_merc.pdf");

const before = await ledgerRows().count();
await page.locator(".fin-addrow-in button", { hasText: "משכנתא" }).first().click();
await page.waitForTimeout(300);
const after = await ledgerRows().count();
check(after === before + 1, "adding a row appends one", `${before} → ${after}`);

const newRow = ledgerRows().last();
const anchorInputs = newRow.locator("td").nth(5).locator("input");
await anchorInputs.nth(0).fill("1.75");
await anchorInputs.nth(1).fill("2.5");
await newRow.locator("td").nth(6).locator("input").fill("60");
await page.waitForTimeout(250);

const manual = await page.evaluate(() => {
  const t = document.querySelectorAll("table.fin-table")[0];
  const rows = [...t.querySelectorAll("tr.fin-row")];
  const r = rows[rows.length - 1];
  const ai = r.children[5].querySelectorAll("input");
  return {
    anchorRate: ai[0].value,
    margin: ai[1].value,
    freq: r.children[6].querySelector("input")?.value ?? "",
    freqNote: r.children[6].querySelector(".fin-note")?.textContent ?? "",
    dirtyAnchor: r.children[5].querySelector(".fin-well")?.getAttribute("data-dirty"),
    dirtyFreq: r.children[6].querySelector(".fin-well")?.getAttribute("data-dirty"),
  };
});
console.log(`    ${JSON.stringify(manual)}`);
check(manual.anchorRate === "1.75", "manual row accepts an עוגן rate", manual.anchorRate);
check(manual.margin === "2.5", "manual row accepts a margin", manual.margin);
check(manual.freq === "60", "manual row accepts a תדירות שינוי in months", manual.freq);
check(manual.freqNote === "5 שנ׳", "the months are echoed in words", manual.freqNote);

await ledger().screenshot({ path: path.join(OUT, "manual-row.png") });
console.log("  shot manual-row.png");

/* ---- the settings sheet still holds the numeric anchor fields ---- */
await ledgerRows().first().locator('button[aria-label="שדות נוספים"]').click();
await page.waitForSelector(".fin-sheet", { timeout: 5000 });
const sheetLabels = await page.locator(".fin-sheet .fin-label").allInnerTexts();
console.log(`    sheet fields: ${sheetLabels.join(" | ")}`);
check(!sheetLabels.some((l) => /עוגן|מרווח|תדירות/.test(l)),
  "nothing on the grid is duplicated in the sheet", sheetLabels.join(" | "));
check(sheetLabels.some((l) => l.includes("גרייס")), "sheet keeps the grace fields");
await page.locator(".fin-sheet").screenshot({ path: path.join(OUT, "row-settings.png") });
console.log("  shot row-settings.png");
await page.keyboard.press("Escape");

/* ---- the מסלול dropdown still works ---- */
await ledgerRows().first().locator("td").nth(2).locator(".fin-sel-btn").click();
await page.waitForSelector(".fin-pop[role=listbox]", { timeout: 5000 });
const opts = await page.locator(".fin-pop[role=listbox] [role=option]").count();
check(opts >= 5, "track dropdown offers the five canonical tracks", `${opts} options`);
await page.keyboard.press("Escape");

/* ---- console health, ignoring the repo's pre-existing root-page bug ---- */
const mine = consoleErrors.filter((e) => !/async Client Component|uncached promise/.test(e));
console.log(`\n################ console`);
console.log(`  ${consoleErrors.length} errors total, ${mine.length} not from the known app/page.tsx bug`);
mine.slice(0, 10).forEach((e) => console.log(`    ${e}`));
check(mine.length === 0, "no console errors from the ledger");

await browser.close();
console.log(`\nscreenshots in ${OUT}`);
console.log(issues ? `\n${issues} ISSUES` : "\nNO ISSUES");
process.exitCode = issues ? 1 : 0;

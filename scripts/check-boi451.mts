// The directive-451 reader (app/aa102test/lib/boi451) against SmartNPV's own
// "תחזית בנק ישראל" vectors, captured off its board:
//
//   fixtures/snpv-forecast-2026-10-01.json  → the September קלנדרי row (01/10)
//   fixtures/snpv-forecast-2026-11-21.json  → the November מדדי row   (15/11)
//
// Both must agree to 1e-3 on every one of the 360 months, nominal and inflation.
// Reads the live file from boi.org.il, or a local copy:
//
//   npx tsx --tsconfig tsconfig.json scripts/check-boi451.mts [path/to/file.xlsx]
import fs from "node:fs";
import path from "node:path";
import { BOI451_URL, readBoi451, rowDate, vectorsFrom451, latestFrom451 } from "../app/aa102test/lib/boi451";

const local = process.argv[2];
const data = local
  ? new Uint8Array(fs.readFileSync(local))
  : new Uint8Array(await (await fetch(BOI451_URL, { signal: AbortSignal.timeout(30_000) })).arrayBuffer());
const rows = readBoi451(data);
console.log(`${rows.length} rows, ${rowDate(rows[0])} … ${rowDate(rows[rows.length - 1])}`);

const CASES = [
  { fixture: "snpv-forecast-2026-10-01.json", year: 2026, month: 9, kind: "calendar" },
  { fixture: "snpv-forecast-2026-11-21.json", year: 2026, month: 11, kind: "index" },
] as const;

let fails = 0;
for (const c of CASES) {
  const fx = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/fixtures", c.fixture), "utf8"));
  const row = rows.find((r) => r.year === c.year && r.month === c.month && r.kind === c.kind);
  if (!row) {
    console.log(`FAIL  ${c.fixture}: no ${c.kind} row for ${c.month}/${c.year} in the file`);
    fails++;
    continue;
  }
  const v = vectorsFrom451(row);
  const worst = (a: number[], b: number[]) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
  const dn = worst(v.nominal, fx.nominal);
  const di = worst(v.inflation, fx.inflation);
  const ok = dn < 1e-3 && di < 1e-3;
  if (!ok) fails++;
  console.log(`${ok ? "  ok " : "FAIL "} ${rowDate(row)} vs ${c.fixture}: worst month nominal ${dn.toExponential(1)}, inflation ${di.toExponential(1)}`);
}

const latest = latestFrom451(data);
console.log(latest ? `newest: ${latest.label} (asOf ${latest.asOf}), month 1 ${latest.nominal[0].toFixed(3)} / ${latest.inflation[0].toFixed(3)}` : "FAIL  newest row unreadable");
if (!latest) fails++;
process.exit(fails ? 1 : 0);

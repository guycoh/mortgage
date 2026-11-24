// The directive-451 reader (app/aa102test/lib/boi451) against SmartNPV's own
// "תחזית בנק ישראל" vectors, captured off its board:
//
//   fixtures/snpv-forecast-2026-10-01.json  → the September קלנדרי row (01/10)
//   fixtures/snpv-forecast-2026-11-21.json  → the November מדדי row   (15/11)
//
// Both must agree to 1e-3 on every one of the 360 months, nominal and inflation.
// Then: the release each letter's day falls on (lib/builtin's solve), and that
// the file is fresh (BoI publishes twice a month). Reads the live files from
// boi.org.il, or local copies:
//
//   npx tsx --tsconfig tsconfig.json scripts/check-boi451.mts [yields.xlsx [calendar.xlsx]]
import fs from "node:fs";
import path from "node:path";
import { BOI451_URL, BOI451_CALENDAR_URL, readBoi451, readBoi451Calendar, releaseOn, rowDate, vectorsFrom451, latestFrom451 } from "../app/aa102test/lib/boi451";

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

/* --- which release a letter's day falls on (lib/builtin solves against it) */
const calFile = process.argv[3];
const calendar = calFile
  ? readBoi451Calendar(new Uint8Array(fs.readFileSync(calFile)))
  : await (async () => {
      const res = await fetch(BOI451_CALENDAR_URL, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
      const live = res?.ok ? readBoi451Calendar(new Uint8Array(await res.arrayBuffer())) : [];
      if (live.length) return live;
      console.log("  (calendar unreachable — the copy in the repo)");
      return (JSON.parse(fs.readFileSync("app/aa102test/lib/boi451-calendar.json", "utf8")).rows as [string, number, number, "index" | "calendar"][])
        .map(([published, year, month, kind]) => ({ published, year, month, kind }));
    })();
// Each case is a letter whose SmartNPV built-in the solve reproduced
// (2026-11-24), or a publication edge: 17/11 published → in force from 18/11.
const DAYS: [string, number, number, "index" | "calendar"][] = [
  ["2026-10-12", 2026, 9, "calendar"], // מסילתי
  ["2026-10-29", 2026, 10, "index"], // דיין
  ["2026-11-01", 2026, 10, "index"], // ביטו — October's קלנדרי comes out 02/11
  ["2026-11-05", 2026, 10, "calendar"], // דסה גיל
  ["2026-11-17", 2026, 10, "calendar"], // publication day: not yet in force
  ["2026-11-18", 2026, 11, "index"],
  ["2025-06-22", 2025, 6, "index"], // file (1)
];
for (const [day, y, m, kind] of DAYS) {
  const [dy, dm, dd] = day.split("-").map(Number);
  const r = releaseOn(rows, calendar, new Date(dy, dm - 1, dd, 12));
  const ok = !!r && r.year === y && r.month === m && r.kind === kind;
  if (!ok) fails++;
  console.log(`${ok ? "  ok " : "FAIL "} ${day} → ${r ? `${r.kind} ${r.month}/${r.year}` : "none"} (want ${kind} ${m}/${y})`);
}

/* --- freshness: BoI publishes twice a month; a file a month old is stuck */
const newestPub = calendar.filter((p) => rows.some((r) => r.year === p.year && r.month === p.month && r.kind === p.kind)).pop();
const ageDays = newestPub ? (Date.now() - new Date(`${newestPub.published}T12:00:00`).getTime()) / 86_400_000 : Infinity;
const stale = ageDays > 35;
if (stale) fails++;
console.log(`${stale ? "FAIL " : "  ok "} newest release published ${newestPub?.published ?? "—"} (${Math.round(ageDays)} days ago)`);
const lastCal = calendar[calendar.length - 1]?.published ?? "";
const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
console.log(`${lastCal >= soon ? "  ok " : "WARN "} calendar runs to ${lastCal}${lastCal >= soon ? "" : " — refresh app/aa102test/lib/boi451-calendar.json (scripts/forecast-snapshot.mts)"}`);
process.exit(fails ? 1 : 0);

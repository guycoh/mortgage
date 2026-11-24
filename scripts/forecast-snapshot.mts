// The Bank of Israel's newest forecast curves, written into the bundle as the
// copy the board falls back on when the BoI's site cannot be reached
// (app/api/simulator/forecast/boi-last.json), and the 451 publication calendar
// (app/aa102test/lib/boi451-calendar.json), which picks the release a letter's
// day falls on when the live calendar cannot be read. BoI publishes twice a
// month and fills the calendar a year ahead; run with the other periodic
// refreshes:
//
//   npx tsx --tsconfig tsconfig.json scripts/forecast-snapshot.mts
import fs from "node:fs";
import path from "node:path";
import { latestCurve } from "../app/aa107test/lib/market-boi";
import { BOI451_CALENDAR_URL, readBoi451Calendar } from "../app/aa102test/lib/boi451";

const f = await latestCurve();
if (f.nominal.length !== 360 || f.inflation.length !== 360) throw new Error("the curves are not 360 months long");
const r = (x: number) => Math.round(x * 1e6) / 1e6;
const out = { asOf: f.asOf, label: f.label, nominal: f.nominal.map(r), inflation: f.inflation.map(r) };
const file = path.join(process.cwd(), "app/api/simulator/forecast/boi-last.json");
fs.writeFileSync(file, JSON.stringify(out) + "\n");
console.log(`wrote ${file}: ${out.asOf} · ${out.label}`);

const res = await fetch(BOI451_CALENDAR_URL, { signal: AbortSignal.timeout(30_000) });
const cal = res.ok ? readBoi451Calendar(new Uint8Array(await res.arrayBuffer())) : [];
if (cal.length) {
  const calFile = path.join(process.cwd(), "app/aa102test/lib/boi451-calendar.json");
  const note = JSON.parse(fs.readFileSync(calFile, "utf8")).note;
  const rows = cal.map((p) => [p.published, p.year, p.month, p.kind]);
  fs.writeFileSync(calFile, JSON.stringify({ note, fetched: new Date().toISOString().slice(0, 10), rows }) + "\n");
  console.log(`wrote ${calFile}: ${rows.length} publications, to ${cal[cal.length - 1].published}`);
} else console.log("calendar unreachable — the copy in the repo is unchanged");

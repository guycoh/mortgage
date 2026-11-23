// The Bank of Israel's newest forecast curves, written into the bundle as the
// copy the board falls back on when the BoI's data service cannot be reached
// (app/api/simulator/forecast/boi-last.json). Run when a new month is published,
// with the other periodic refreshes:
//
//   npx tsx --tsconfig tsconfig.json scripts/forecast-snapshot.mts
import fs from "node:fs";
import path from "node:path";
import { latestCurve } from "../app/aa107test/lib/market-boi";

const f = await latestCurve();
if (f.nominal.length !== 360 || f.inflation.length !== 360) throw new Error("the curves are not 360 months long");
const r = (x: number) => Math.round(x * 1e6) / 1e6;
const out = { asOf: f.asOf, label: f.label, nominal: f.nominal.map(r), inflation: f.inflation.map(r) };
const file = path.join(process.cwd(), "app/api/simulator/forecast/boi-last.json");
fs.writeFileSync(file, JSON.stringify(out) + "\n");
console.log(`wrote ${file}: ${out.asOf} · ${out.label}`);

// The SmartNPV-forecast reader (lib/snpv-forecast): its inversion, proved on a
// mock of the API built from SmartNPV's own 21/11/2026 vectors. A real key is
// checked separately (SNPV_API_KEY=… … --live), against the same fixture.
//
//   npx tsx --tsconfig tsconfig.json scripts/check-snpv-forecast.mts [--live]
import fs from "node:fs";
import { vectorsFromRatios, snpvForecast } from "../app/aa102test/lib/snpv-forecast";
const fx = JSON.parse(fs.readFileSync("scripts/fixtures/snpv-forecast-2026-11-21.json", "utf8"));
const boiLast = JSON.parse(fs.readFileSync("app/api/simulator/forecast/boi-last.json", "utf8"));
const boi: any = { nominal: boiLast.nominal, inflation: boiLast.inflation };
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "  ok " : "FAIL "} ${m}`); if (!c) fails++; };

// What the API would return for the probes: Π(1 + r/12) and Π(1+π)^(1/12).
const prime: number[] = [], linked: number[] = [];
let a = 1, b = 1;
for (let m = 0; m < 360; m++) {
  a *= 1 + (fx.nominal[m] + 1.5) / 1200; prime.push(a);
  b *= Math.pow(1 + fx.inflation[m] / 100, 1 / 12); linked.push(b);
}
const v = vectorsFromRatios(prime, linked, boi);
ok(!("error" in v), "mock answer accepted");
if (!("error" in v)) {
  const worst = (x: number[], y: number[]) => Math.max(...x.map((q, i) => Math.abs(q - y[i])));
  ok(worst(v.nominal, fx.nominal) < 1e-6, `nominal read back exactly (worst ${worst(v.nominal, fx.nominal).toExponential(1)})`);
  ok(worst(v.inflation, fx.inflation) < 1e-6, `inflation read back exactly (worst ${worst(v.inflation, fx.inflation).toExponential(1)})`);
}
ok("error" in vectorsFromRatios(prime.slice(0, 300), linked, boi), "a short answer is refused");
ok("error" in vectorsFromRatios(prime.map((x, i) => x * (1 + i * 0.003)), linked, boi), "a curve far from BoI is refused");

if (process.argv.includes("--live")) {
  const f = await snpvForecast(boi);
  ok(!!f, `live SmartNPV curve read (${f?.label})`);
  if (f) {
    const at = [1, 12, 60, 120, 240, 360];
    console.log("  month   " + at.map((m) => String(m).padStart(7)).join(""));
    console.log("  nominal " + at.map((m) => f.nominal[m - 1].toFixed(3).padStart(7)).join(""));
    console.log("  CPI     " + at.map((m) => f.inflation[m - 1].toFixed(3).padStart(7)).join(""));
  }
}
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);

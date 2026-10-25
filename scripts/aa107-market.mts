// Build the /aa107test market snapshot from the Bank of Israel's live data and
// write the committed fallback (app/aa107test/lib/market-snapshot.json).
//   npx tsx --tsconfig tsconfig.json scripts/aa107-market.mts [--write]
import { writeFileSync } from "node:fs";
import { buildMarket } from "../app/aa107test/lib/market-boi";

const t0 = Date.now();
const { snapshot, banks, level } = await buildMarket();
console.log(`built in ${Date.now() - t0}ms`);
console.log("level", level);
console.log("banks period", banks.period, "rows", banks.rows.length);
console.log(JSON.stringify(snapshot, null, 2));
if (process.argv.includes("--write")) {
  writeFileSync("app/aa107test/lib/market-snapshot.json", JSON.stringify(snapshot, null, 2) + "\n");
  console.log("wrote app/aa107test/lib/market-snapshot.json");
}

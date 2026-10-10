import fs from "node:fs";
import path from "node:path";
// Prints the /aa105test brief for every dumped analysis (see dump-insights.mts).
// Run: npx tsx --tsconfig tsconfig.json scripts/check-brief.mts <dump-dir>
import { docFromCredit, docFromStatement } from "../app/aa105test/lib/brief";

const dir = process.argv[2];
const out: Record<string, unknown> = {};
for (const f of fs.readdirSync(dir)) {
  const a = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const doc = f.endsWith(".credit.json") ? docFromCredit(a) : docFromStatement(a);
  out[f] = doc;
  const r = (n: number | null) => (n === null ? "—" : Math.round(n).toLocaleString("en-US"));
  console.log(
    f.padEnd(52),
    "bal", r(doc.balance), "mo", r(doc.monthly), "yr-int", r(doc.yearlyInterest), "day", r(doc.yearlyInterest === null ? null : doc.yearlyInterest / 365),
    "future", r(doc.futureInterest), "share", doc.interestShare === null ? "—" : Math.round(doc.interestShare * 100) + "%",
    "ends", doc.ends?.label, doc.ends?.years, "skew", doc.skew ? `${doc.skew.label} ${Math.round(doc.skew.balanceShare * 100)}→${Math.round(doc.skew.lensShare * 100)} ${doc.skew.lens}` : "—",
    "pains", doc.pains.map((p) => `${p.id}:${p.figure ? p.figure.kind + "=" + Math.round(p.figure.value * 100) / 100 : "-"}`).join(" ")
  );
}
fs.writeFileSync(path.join(path.dirname(dir), "docs.json"), JSON.stringify(out, null, 1));

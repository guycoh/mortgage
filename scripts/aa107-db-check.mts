import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const t of ["mortgage_market_snapshots", "mortgage_market_rates", "mix_optimizer_runs"]) {
  const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
  console.log(t, error ? `ERROR ${error.message}` : `${count} rows`);
}
const { data } = await db.from("mortgage_market_rates").select("source, period, bank, track, metric, value").eq("bank", "Discount").limit(6);
console.log(data);

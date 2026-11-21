// תמהיל אוטומטי — the invariants every proposal must hold, shared by the proof
// (automix-check.mts) and the corpus/fuzz run (automix-corpus.mts).
import { __test, type AutoMixInput, type AutoMixResult, type GoalId, type Proposal } from "../app/aa105test/lib/automix";
import { ECONOMIES, scheduleIn } from "../app/aa105test/lib/automix/econ";
import { MIN_TRANCHE, FIXED_MIN, LINKED_MAX, TRACK_SHARE_MAX, LTV_MAX, PTI_MAX, MATERIAL, AP_LTV, AP_LTV_RELIEF, AP_RELIEF_CAP } from "../app/aa105test/lib/automix/rules";
import { NONBANK_LTV } from "../app/aa105test/lib/automix/tiers";
import { EARLY } from "../app/aa105test/lib/automix/solve";
import { priceLoan, todayPayment } from "../app/aa102test/lib/price";
import { boardMonthly, foldMasterRow, owedOnly, type ImportedLoan } from "../app/aa102test/lib/credit";
import type { MarketSnapshot } from "../app/aa107test/lib/market";
import type { Forecast } from "../app/aa102test/lib/forecast";
void __test;

export function verifier(market: MarketSnapshot, forecast: Forecast | null) {
  const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
  let passed = 0;
  const failures: string[] = [];
  const check = (ok: boolean, what: string) => {
    if (ok) passed++;
    else failures.push(what);
  };
  const typed = (inflation: number) => ({ inflation, forecast: null });
  const BUDGET_GOALS: GoalId[] = ["years", "savings", "stable", "balanced", "consolidate"];

  /** The mix's payment at the guard's months in every economy — does it stay under `cap`? */
  function guardOk(rows: ImportedLoan[], inflation: number, cap: number): boolean {
    const owed = owedOnly(rows).filter((l) => Number(l.months) > 0 && Number(l.amount) > 0);
    for (const e of ECONOMIES)
      for (const m of EARLY) {
        let sum = 0;
        for (const l of owed) {
          const sch = Number(l.amortization_schedule_id) || 1;
          const lump = sch === 3 || sch === 4 ? Math.round(Number(l.months)) : 0;
          if (m === 1) sum += Math.round(boardMonthly(l, todayPayment(priceLoan(l, typed(inflation)))));
          else if (m !== lump) sum += scheduleIn(l, forecast, e).pay[m - 1] ?? 0;
        }
        if (sum > cap + 1) return false;
      }
    return true;
  }

  function shareCapOk(p: Proposal): boolean {
    const h = p.tranches.filter((t) => t.segment === "housing");
    const N = h.reduce((a, t) => a + t.amount, 0);
    return h.every((t) => t.amount <= TRACK_SHARE_MAX * N + (1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE + 1000);
  }

  /**
   * House style for every string the sheet shows: no "·" and no dash separators
   * (" — ", "–"); a sign is a true minus U+2212 before ₪ or the digits — an ASCII
   * hyphen is only the Hebrew prefix joiner ("מ-₪11,420"); findings fit one line.
   */
  function lint(name: string, r: AutoMixResult) {
    const bad = (x: string) => /·|\s—\s|—|–/.test(x) || /(^|[^֐-׿A-Za-z0-9])-(?=₪|\d)/.test(x);
    const strings: [string, string][] = [];
    const push = (where: string, x: string | undefined | null) => x && strings.push([where, x]);
    push("reason", r.reason);
    push("tierWhy", r.pricing.tierWhy);
    r.pricing.notes.forEach((x) => push("note", x));
    r.skipped.forEach((x) => push("skipped", x.why));
    for (const f of r.findings) {
      push("finding.title", f.title);
      push("finding.detail", f.detail);
      check(f.title.length <= 45, `${name}: finding title over 45 chars (${f.title.length}): ${f.title}`);
      check(f.detail.length <= 110, `${name}: finding detail over 110 chars (${f.detail.length}): ${f.detail}`);
      check((f.detail.match(/\.(\s|$)/g) ?? []).length <= 1, `${name}: finding detail is more than one sentence: ${f.detail}`);
    }
    for (const p of r.proposals) {
      push("label", p.label);
      push("tagline", p.tagline);
      push("note", p.note);
      p.reasons.forEach((x) => push("reason", x));
      p.caveats.forEach((x) => push("caveat", x));
      p.checks.forEach((c) => (push("check", c.label), push("check", c.value), push("check", c.rule)));
      p.moves.forEach((m) => (push("move", m.label), push("why", m.why)));
      p.stress.forEach((x) => push("stress", x.label));
    }
    for (const [where, x] of strings) check(!bad(x), `${name}: ${where} breaks house style: ${x}`);
  }

  function verify(name: string, input: AutoMixInput, r: AutoMixResult, expect: { ok?: boolean } = {}) {
    const tag = (g: string) => `${name}/${g}`;
    lint(name, r);
    check(r.ok === (expect.ok ?? true), `${name}: ok=${r.ok} ${r.reason ?? ""}`);
    if (!r.ok) return;
    // With debt due now (override) the budget and every "versus today" are the reference's.
    const due = r.dueNow;
    const budget = due?.budget ?? input.profile.budget ?? r.today.monthly;
    const nonbank = r.pricing.tier === "nonbank";
    const masterById = new Map(input.master.map((l) => [l.id, l]));
    for (const p of r.proposals) {
      if (p.status === "unavailable") {
        check(!!p.note, `${tag(p.goal)}: unavailable without a note`);
        continue;
      }
      // 1. money balances per purpose, to the shekel
      for (const seg of ["housing", "allPurpose"] as const) {
        const fresh = p.tranches.filter((t) => t.segment === seg).reduce((a, t) => a + t.amount, 0);
        const moved = p.moves.filter((m) => m.action !== "keep" && m.segment === seg);
        // Arrears on a kept debt are brought current from the all-purpose money.
        const cures = seg === "allPurpose" ? p.moves.filter((m) => m.action === "keep").reduce((a, m) => a + (m.cure ?? 0), 0) : 0;
        const owed = moved.reduce((a, m) => a + m.balance + m.fee, 0) + cures;
        if (!moved.length && !cures) check(fresh === 0, `${tag(p.goal)}: ${seg} money without a debt to refinance (${fresh})`);
        else check(fresh - owed > 0 && fresh - owed <= p.costs.setup + 2, `${tag(p.goal)}: ${seg} new ${fresh} vs refinanced ${owed} + setup`);
      }
      const allNew = p.tranches.reduce((a, t) => a + t.amount, 0);
      const allMoved = p.moves.filter((m) => m.action !== "keep").reduce((a, m) => a + m.balance + m.fee, 0) + p.moves.reduce((a, m) => a + (m.action === "keep" ? m.cure ?? 0 : 0), 0);
      check(Math.abs(allNew - allMoved - (allMoved ? p.costs.setup : 0)) <= 2, `${tag(p.goal)}: Σ new ${allNew} ≠ Σ refinanced ${allMoved} + setup ${p.costs.setup}`);
      check(p.costs.prepaymentFees === p.moves.reduce((a, m) => a + m.fee, 0), `${tag(p.goal)}: fees ≠ Σ move fees`);
      // 2. rows re-priced independently reproduce the metrics
      const owed = owedOnly(p.rows);
      let monthly = 0;
      let interest = 0;
      let balance = 0;
      let fPaid = 0;
      for (const l of owed) {
        const t = priceLoan(l, typed(input.inflation));
        monthly += Math.round(boardMonthly(l, todayPayment(t))); // month one in today's money, as the read-out's `totals` memo states it
        interest += t.totalInterest;
        balance += Math.round(Number(l.amount) || 0);
        if (Number(l.months) > 0) fPaid += priceLoan(l, { inflation: input.inflation, forecast }).totalPaid;
      }
      check(monthly === p.metrics.monthly, `${tag(p.goal)}: monthly ${monthly} ≠ ${p.metrics.monthly}`);
      check(Math.abs(interest - p.metrics.totalInterest) < 0.5, `${tag(p.goal)}: interest ${interest} ≠ ${p.metrics.totalInterest}`);
      check(balance === p.metrics.balance, `${tag(p.goal)}: balance ${balance} ≠ ${p.metrics.balance}`);
      if (input.forecastOn) check(!!p.metrics.outlook && Math.abs(fPaid - p.metrics.outlook.totalPaid) < 1, `${tag(p.goal)}: forecast paid ${fPaid} ≠ ${p.metrics.outlook?.totalPaid}`);
      else check(p.metrics.outlook === null, `${tag(p.goal)}: outlook present in flat mode`);
      check(p.target === balance, `${tag(p.goal)}: target ${p.target} ≠ balance ${balance}`);
      const d = p.delta;
      check(d.monthly === p.metrics.monthly - r.today.monthly && Math.abs(d.totalInterest - (p.metrics.totalInterest - r.today.totalInterest)) < 0.01, `${tag(p.goal)}: delta inconsistent`);
      // 3. hard rules, recomputed
      for (const seg of ["housing", "allPurpose"] as const) {
        const ts = p.tranches.filter((t) => t.segment === seg);
        if (!ts.length) continue;
        const N = ts.reduce((a, t) => a + t.amount, 0);
        const fixed = ts.filter((t) => t.track === "klz" || t.track === "kz").reduce((a, t) => a + t.amount, 0);
        // 329 binds banks only (circular 2852); a non-bank mix answers to the Fair Credit Law below.
        if (!nonbank) check(fixed / N >= FIXED_MIN - 0.005, `${tag(p.goal)}: ${seg} fixed ${(fixed / N).toFixed(3)} < ⅓ (329 §7)`);
        check(new Set(ts.map((t) => t.track)).size === ts.length, `${tag(p.goal)}: ${seg} two tranches on one track`);
        check(ts.length <= (seg === "housing" ? 4 : 2), `${tag(p.goal)}: ${seg} has ${ts.length} tranches`);
        if (ts.length > 1) check(ts.every((t) => t.amount >= MIN_TRANCHE - 1000), `${tag(p.goal)}: ${seg} tranche under ₪${MIN_TRANCHE}`);
        if (seg === "housing") {
          const linked = ts.filter((t) => t.track === "kz" || t.track === "mz").reduce((a, t) => a + t.amount, 0);
          check(linked / N <= LINKED_MAX + 0.005, `${tag(p.goal)}: CPI-linked ${(linked / N).toFixed(3)} > ⅓`);
        }
        for (const t of ts) {
          check(Number.isInteger(t.years) && t.years >= 1 && t.years <= 30, `${tag(p.goal)}: term ${t.years}`);
          if (input.profile.age && !input.profile.override) check(input.profile.age + t.years <= 80, `${tag(p.goal)}: age ${input.profile.age}+${t.years} > 80`);
          check(t.amount > 0 && Number.isInteger(t.amount), `${tag(p.goal)}: tranche ${t.amount}`);
        }
        // Every tranche in ₪1,000s except the one that takes the remainder.
        check(ts.filter((t) => !Number.isInteger(t.amount / 1000)).length <= 1, `${tag(p.goal)}: ${seg} has more than one unrounded tranche`);
      }
      if (input.profile.income) {
        const housing = owed.filter((l) => l.group !== "loan" || l.source_type === "תמהיל אוטומטי").reduce((a, l) => a + Math.round(boardMonthly(l, todayPayment(priceLoan(l, typed(input.inflation))))), 0);
        if (p.status === "ok") check(housing <= PTI_MAX * input.profile.income + 0.5, `${tag(p.goal)}: PTI ${(housing / input.profile.income).toFixed(3)} > 50%`);
      }
      // ALL the credit the property secures, recomputed from the rows: the fixed
    // share may not fall below min(⅓, today) at a bank (329 Q&A 5.1, §9), and the
    // CPI-linked share may not rise above max(⅓, today) (the engine's guardrail).
    if (p.status !== "unavailable" && p.tranches.length) {
      const onProperty = (ls: ImportedLoan[]) => owedOnly(ls).filter((l) => l.group === "mortgage" || l.source_type === "תמהיל אוטומטי");
      const shares = (ls: ImportedLoan[]) => {
        const all = ls.reduce((a, l) => a + Number(l.amount), 0);
        const fx = ls.filter((l) => Number(l.path_id) === 2 || Number(l.path_id) === 3).reduce((a, l) => a + Number(l.amount), 0);
        const lk = ls.filter((l) => Number(l.path_id) === 3 || Number(l.path_id) === 5).reduce((a, l) => a + Number(l.amount), 0);
        return { all, fixed: all ? fx / all : 1, linked: all ? lk / all : 0 };
      };
      const now = shares(onProperty(input.master));
      const after = shares(onProperty(p.rows));
      if (now.all > 0 && after.all > 0) {
        if (!nonbank) check(after.fixed >= Math.min(FIXED_MIN, now.fixed) - 0.005, `${tag(p.goal)}: fixed share of all property credit ${after.fixed.toFixed(3)} < min(⅓, today ${now.fixed.toFixed(3)})`);
        check(after.linked <= Math.max(LINKED_MAX, now.linked) + 0.005, `${tag(p.goal)}: CPI-linked share of all property credit ${after.linked.toFixed(3)} > max(⅓, today ${now.linked.toFixed(3)})`);
      }
    }
    // Against the property, at a bank: all-purpose money (הוראה 329, Q&A 2.2 and
    // §10א) takes ALL the credit the property secures to at most 50%, or 70% when
    // the part above 50% is at most ₪200,000 — recomputed here from the rows.
    if (input.profile.propertyValue && !nonbank && p.status !== "unavailable" && p.tranches.some((t) => t.segment === "allPurpose")) {
      const V = input.profile.propertyValue;
      const secured = owed.filter((l) => l.group !== "loan" || l.source_type === "תמהיל אוטומטי").reduce((a, l) => a + Number(l.amount), 0);
      const cap = Math.min(AP_LTV_RELIEF, AP_LTV + AP_RELIEF_CAP / V);
      check(secured <= cap * V + 1, `${tag(p.goal)}: all-purpose money with secured credit ${(secured / V).toFixed(3)} of the property > ${cap.toFixed(3)} (329 Q&A 2.2, §10א)`);
    }
    if (input.profile.propertyValue && p.status === "ok") {
        const housing = owed.filter((l) => l.group !== "loan").reduce((a, l) => a + Number(l.amount), 0);
        if (!nonbank) check(housing <= LTV_MAX[input.profile.propertyType] * input.profile.propertyValue + 1, `${tag(p.goal)}: LTV ${(housing / input.profile.propertyValue).toFixed(3)}`);
        else {
          // The non-bank lender's own policy: first lien, or first + second together.
          const secured = owed.filter((l) => l.group !== "loan" || l.source_type === "תמהיל אוטומטי").reduce((a, l) => a + Number(l.amount), 0);
          const cap = p.structure === "secondLien" ? NONBANK_LTV.combined : NONBANK_LTV.first;
          check(secured <= cap * input.profile.propertyValue + 1, `${tag(p.goal)}: non-bank LTV ${(secured / input.profile.propertyValue).toFixed(3)} > ${cap}`);
        }
      }
      // The law that binds the lender chosen. A non-bank: the Fair Credit Law's
      // ceiling on the all-in cost, recomputed here from the board's own schedule
      // (priceLoan at the typed inflation) as an IRR on the money received.
      if (nonbank && p.status !== "unavailable") {
        const fresh = owed.filter((l) => l.source_type === "תמהיל אוטומטי");
        const fee = 0.01;
        const received = fresh.reduce((a, l) => a + Number(l.amount), 0) * (1 - fee);
        if (fresh.length && received <= 1_197_707) {
          const ceiling = market.boi.rate + 15;
          for (const l of fresh) {
            const sch = priceLoan(l, typed(input.inflation)).schedule.map((x) => x.payment);
            const P = Number(l.amount) * (1 - fee);
            let lo = 0;
            let hi = 0.05;
            for (let k = 0; k < 80; k++) {
              const mid = (lo + hi) / 2;
              let pv = 0;
              let df = 1;
              for (const x of sch) pv += x * (df /= 1 + mid);
              if (pv > P) lo = mid;
              else hi = mid;
            }
            const eff = (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
            check(eff <= ceiling + 0.02, `${tag(p.goal)}: Fair Credit all-in ${eff.toFixed(2)}% > ${ceiling.toFixed(2)}% on a ${l.path_id === 1 ? "prime" : "kz"} tranche`);
          }
          check(p.checks.some((c) => c.label === "תקרת העלות בחוק אשראי הוגן" && c.ok), `${tag(p.goal)}: non-bank proposal without a holding Fair Credit check`);
        }
        check(!p.checks.some((c) => c.rule.includes("הוראה 329 סעיף 7")), `${tag(p.goal)}: a 329 check on a non-bank mix`);
      }
      if (p.status === "ok") check(p.checks.every((c) => c.ok), `${tag(p.goal)}: ok with a failing check ${p.checks.filter((c) => !c.ok).map((c) => c.label)}`);
      // 4. kept rows are the board's own copy of the master row
      const kept = p.rows.filter((l) => l.source_type !== "תמהיל אוטומטי");
      for (const mv of p.moves.filter((m) => m.action === "keep")) {
        const want = foldMasterRow(masterById.get(mv.id)!, false, "x");
        const strip = (l: ImportedLoan) => JSON.stringify({ ...l, id: 0, mix_id: 0 });
        check(kept.some((l) => strip(l) === strip(want)), `${tag(p.goal)}: kept row ${mv.label} is not foldMasterRow(master)`);
      }
      // 5. guarantees travel, never counted
      const guar = input.master.filter((l) => l.is_guarantor).length;
      check(p.rows.filter((l) => l.is_guarantor).length === guar, `${tag(p.goal)}: guarantees ${p.rows.filter((l) => l.is_guarantor).length} ≠ ${guar}`);
      // 6. budget-holding goals hold it
      if (BUDGET_GOALS.includes(p.goal) && p.status !== "no-gain") check(p.metrics.monthly <= budget + 0.5, `${tag(p.goal)}: ${p.metrics.monthly} over budget ${budget}`);
      // 7. no "ok" proposal is worse than today on its own goal — or, with debt due
      // now, than the reference (today + the cheapest clearing of that debt).
      if (p.status === "ok") {
        const s0 = p.stress[0];
        const worst = (k: "totalPaid" | "todayTotalPaid") => Math.max(...p.stress.slice(1).map((x) => x[k]));
        const ref = due?.reference;
        const own: Record<GoalId, boolean> = ref
          ? {
              payment: p.metrics.monthly <= ref.monthly + 0.5,
              consolidate: p.metrics.monthly <= ref.monthly + 0.5,
              years: p.metrics.months < ref.months,
              savings: s0.totalPaid < s0.todayTotalPaid && p.metrics.totalPaid < ref.totalPaid,
              balanced: p.metrics.monthly < ref.monthly && s0.totalPaid <= s0.todayTotalPaid && p.metrics.totalPaid <= ref.totalPaid,
              stable: worst("totalPaid") < worst("todayTotalPaid"),
            }
          : {
              payment: d.monthly < 0,
              consolidate: d.monthly < 0,
              years: d.months < 0,
              savings: s0.totalPaid < s0.todayTotalPaid && d.totalPaid < 0,
              balanced: d.monthly < 0 && s0.totalPaid <= s0.todayTotalPaid && d.totalPaid <= 0,
              stable: worst("totalPaid") < worst("todayTotalPaid"),
            };
        check(own[p.goal], `${tag(p.goal)}: "ok" but not better than ${ref ? "the reference" : "today"} on its own goal`);
      }
      // The cost column (typed interest + indexation): a disagreement in sign with the forecast, or a
      // cost-claiming "ok" goal that shows a higher cost than today, is stated in the FIRST reason with its figures.
      {
        const figures = (x: string) => (x.match(/₪[\d,]+/g) ?? []).map((f) => Number(f.slice(1).replace(/,/g, "")));
        const has = (x: string, v: number) => figures(x).some((f) => Math.abs(f - Math.round(Math.abs(v))) <= 2);
        const first = p.reasons[0] ?? "";
        const tC = d.totalCost;
        if (p.metrics.outlook && r.today.outlook && !due) {
          const fC = p.metrics.outlook.totalCost - r.today.outlook.totalCost;
          if (Math.abs(tC) >= 1000 && Math.abs(fC) >= 1000 && Math.sign(tC) !== Math.sign(fC) && p.moves.some((m) => m.action !== "keep"))
            check(has(first, tC) && has(first, fC), `${tag(p.goal)}: typed cost ${fmt(tC)} and forecast ${fmt(fC)} disagree in sign, first reason must name both: ${first}`);
        }
        if (p.status === "ok" && !due && ["savings", "balanced", "stable"].includes(p.goal) && tC > 0)
          check(first.includes("הריבית וההצמדה") && has(first, tC), `${tag(p.goal)}: shows a higher cost (${fmt(tC)}) than today, first reason must say so: ${first}`);
      }
      // reasons and caveats exist and carry numbers
      if (p.status === "ok") check(p.reasons.length >= 3 && p.reasons.length <= 5 && p.reasons.every((x) => /\d/.test(x)), `${tag(p.goal)}: reasons ${p.reasons.length}`);
    }
    // 8. cross-goal orderings. Within one structure they hold exactly. Across two
    // (internal refinance vs a move to another bank; second vs first lien) the
    // structure choice is sticky by the materiality threshold, so an inversion
    // up to that threshold is allowed, and no more.
    const by = (g: GoalId) => r.proposals.find((p) => p.goal === g && p.status !== "unavailable");
    const kind = (p: Proposal) => `${p.structure ?? "bank"}/${p.refinance ?? ""}`;
    const refMonthly = due?.reference.monthly ?? r.today.monthly;
    const todayCost = Math.max(r.today.totalCost, r.today.outlook?.totalCost ?? 0);
    const slack = (a: Proposal, b: Proposal, what: "monthly" | "months" | "cost") =>
      kind(a) === kind(b) ? 0 : what === "monthly" ? MATERIAL.monthly(refMonthly) : what === "months" ? MATERIAL.months : MATERIAL.cost(todayCost);
    // On the DISPLAYED (typed) figures, unconditionally: the payment goal shows the lowest payment of all.
    const pay = by("payment");
    if (pay)
      for (const p of r.proposals) {
        if (p === pay || p.status === "unavailable") continue;
        check(pay.metrics.monthly <= p.metrics.monthly + slack(pay, p, "monthly"), `${name}: payment ${pay.metrics.monthly} > ${p.goal} ${p.metrics.monthly} (displayed)`);
      }
    // …and savings shows the lowest typed cost (interest + indexation) among the budget-holding goals whose mix obeys its rules
    // (savings' own rules include the PV cap: no more than today in present value at the board's discount rate).
    const refPv = due ? due.reference.pv : r.today.outlook?.pv;
    const pvOk = (p: Proposal) => refPv === undefined || !p.metrics.outlook || p.metrics.outlook.pv <= refPv + 1;
    const savD = by("savings");
    if (savD)
      for (const g of ["years", "balanced", "consolidate", "stable"] as GoalId[]) {
        const p = by(g);
        if (!p || p.metrics.monthly > budget + 0.5 || !shareCapOk(p) || !pvOk(p)) continue;
        check(savD.metrics.totalCost <= p.metrics.totalCost + 1 + slack(savD, p, "cost"), `${name}: savings shows cost ${fmt(savD.metrics.totalCost)} > ${g} ${fmt(p.metrics.totalCost)}`);
        check(savD.delta.totalCost <= p.delta.totalCost + 1 + slack(savD, p, "cost"), `${name}: savings delta.totalCost ${fmt(savD.delta.totalCost)} > ${g} ${fmt(p.delta.totalCost)}`);
      }
    const years = by("years");
    if (years)
      for (const g of ["savings", "balanced", "consolidate", "stable"] as GoalId[]) {
        const p = by(g);
        if (!p || (g === "stable" && !shareCapOk(p))) continue;
        check(years.metrics.months <= p.metrics.months + slack(years, p, "months"), `${name}: years ends at ${years.metrics.months} after ${g} ${p.metrics.months}`);
      }
    const sav = by("savings");
    if (sav) {
      const J = (p: Proposal) => 0.75 * p.stress[0].totalPaid + 0.25 * Math.max(...p.stress.map((s) => s.totalPaid));
      // Lexicographic: savings shows the least interest; among mixes that show no more, it costs least.
      for (const g of ["years", "balanced", "consolidate", "stable"] as GoalId[]) {
        const p = by(g);
        if (!p || p.metrics.monthly > budget + 0.5 || (g === "stable" && !shareCapOk(p)) || !pvOk(p)) continue;
        if (p.metrics.totalCost > sav.metrics.totalCost + 1) continue;
        check(J(sav) <= J(p) * 1.0005 + 500 + slack(sav, p, "cost"), `${name}: savings cost ${fmt(J(sav))} > ${g} ${fmt(J(p))}`);
      }
    }
    check(r.recommended === null || r.proposals.some((p) => p.goal === r.recommended && p.status === "ok"), `${name}: recommended ${r.recommended} is not an ok proposal`);
  }

  /**
   * THE OVERRIDE. Blocks are returned always; a block is overridden exactly when
   * the override is on and it is not law for the lender chosen; every proposal
   * built past a lifted block names it, with its condition, in its FIRST caveat;
   * debt due now is paid off in every proposal at its stated balance; a forced
   * bank tier on a client a bank would refuse says so first.
   */
  function verifyOverride(name: string, input: AutoMixInput, r: AutoMixResult) {
    const o = !!input.profile.override;
    for (const b of r.blocks) check(b.overridden === (o && !b.law), `${name}: block ${b.id} overridden=${b.overridden} with override ${o}, law ${b.law}`);
    const lifted = r.blocks.filter((b) => b.overridden);
    if (!o) check(!r.dueNow, `${name}: dueNow without the override`);
    if (!r.ok) return;
    for (const p of r.proposals) {
      if (p.status === "unavailable" && !o) continue;
      const first = p.caveats[0] ?? "";
      for (const b of lifted)
        check(first.includes(b.title) && first.includes(b.condition.replace(/\.$/, "")), `${name}/${p.goal}: first caveat does not name block ${b.id} with its condition: ${first.slice(0, 120)}`);
    }
    if (!o && r.blocks.some((b) => b.effect === "refuses"))
      check(r.proposals.every((p) => p.status === "unavailable"), `${name}: a standing "refuses" block, yet a goal was built`);
    const due = r.dueNow;
    if (due) {
      const items = due.items.reduce((a, x) => a + x.balance, 0);
      const cures = due.cures.reduce((a, x) => a + x.overdue, 0);
      check(Math.abs(due.total - items - cures) <= 1, `${name}: dueNow total ${due.total} ≠ items ${items} + cures ${cures}`);
      check(due.budgetSource === (input.profile.budget ? "profile" : "reference"), `${name}: budget source ${due.budgetSource}`);
      for (const p of r.proposals) {
        if (p.status === "unavailable") continue;
        for (const x of due.items) {
          const m = p.moves.find((mv) => mv.id === x.id);
          check(!!m && m.action !== "keep" && m.due === true && m.balance === x.balance, `${name}/${p.goal}: due debt ${x.label} ${x.balance} not paid off (${m?.action})`);
        }
        check(p.reasons.some((x) => x.includes(`₪${due.total.toLocaleString("en-US")}`)), `${name}/${p.goal}: no reason names the ${due.total} due now`);
        check(p.caveats.some((x) => x.includes("מכתב סילוק")), `${name}/${p.goal}: no caveat on the growth of debt due now`);
        if (r.today.outlook) check(p.stress[0].todayTotalPaid > r.today.outlook.totalPaid, `${name}/${p.goal}: stress "today" leaves the due debt out`);
      }
    }
    // A bank tier forced on a client the engine would send to a non-bank.
    const forcedBank = o && (input.profile.tier === "bank" || input.profile.tier === "bankPremium") && r.blocks.some((b) => ["insolvency", "enforcement", "arrears", "past-due", "outside"].includes(b.id));
    if (forcedBank) for (const p of r.proposals) check((p.caveats[0] ?? "").includes("בנק מסרב"), `${name}/${p.goal}: forced bank tier without the refusal caveat first`);
  }
  return { check, failures, passed: () => passed, verify, verifyOverride, lint, guardOk, shareCapOk, BUDGET_GOALS };
}

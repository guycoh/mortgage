// תמהיל אוטומטי — the invariants every proposal must hold, shared by the proof
// (automix-check.mts) and the corpus/fuzz run (automix-corpus.mts).
import { __test, type AutoMixInput, type AutoMixResult, type GoalId, type Proposal } from "../app/aa105test/lib/automix";
import { ECONOMIES, scheduleIn } from "../app/aa105test/lib/automix/econ";
import { MIN_TRANCHE, FIXED_MIN, LINKED_MAX, TRACK_SHARE_MAX, TRACK_SHARE_EXEMPT, LTV_MAX, PTI_MAX, MATERIAL, AP_LTV, AP_LTV_RELIEF, AP_RELIEF_CAP, YEARS_STRETCH, REFI_COST_MAX, SLIVER_SHARE, BREAK_EVEN_MAX, SEASONING_MONTHS, SMALL_MOVE, STABLE_PRICE } from "../app/aa105test/lib/automix/rules";
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

  /**
   * The mix's payment at the guard's months in every economy — does it stay
   * under `cap` (one figure, or one per economy)? `months` defaults to the
   * solver's samples (EARLY); a promise in words is tested on every month 1–60.
   */
  const EVERY60 = Array.from({ length: 60 }, (_, i) => i + 1);
  function guardOk(rows: ImportedLoan[], inflation: number, cap: number | number[], months: number[] = EARLY): boolean {
    const owed = owedOnly(rows).filter((l) => Number(l.months) > 0 && Number(l.amount) > 0);
    const sched = owed.map((l) => ECONOMIES.map((e) => scheduleIn(l, forecast, e).pay));
    const first = owed.map((l) => Math.round(boardMonthly(l, todayPayment(priceLoan(l, typed(inflation))))));
    for (let k = 0; k < ECONOMIES.length; k++)
      for (const m of months) {
        let sum = 0;
        owed.forEach((l, j) => {
          const sch = Number(l.amortization_schedule_id) || 1;
          const lump = sch === 3 || sch === 4 ? Math.round(Number(l.months)) : 0;
          if (m === 1) sum += first[j];
          else if (m !== lump) sum += sched[j][k][m - 1] ?? 0;
        });
        if (sum > (Array.isArray(cap) ? cap[k] : cap) + 1) return false;
      }
    return true;
  }

  /**
   * Is a proposal's status decided at a knife-edge the inputs can genuinely
   * cross: a measure within 5% of its own threshold (relief, saving, the years
   * goal's 12 months, the cost share of the new money), or the break-even within
   * 6 months of BREAK_EVEN_MAX? A status that flips on ±0.05pp anywhere else is
   * the solve sitting on its own gate (audit W2), not the client's position.
   */
  function nearThreshold(p: Proposal, r: AutoMixResult, step = 0): boolean {
    const s0 = p.stress[0];
    const refMonthly = r.dueNow?.reference.monthly ?? r.today.monthly;
    const todayCost = (s0?.todayTotalPaid ?? 0) - r.today.balance;
    const close = (x: number, t: number) => Math.abs(Math.abs(x) - t) <= 0.05 * t;
    const relief = refMonthly - p.metrics.monthly;
    const saving = s0 ? s0.todayTotalPaid - s0.totalPaid : 0;
    const newMoney = p.tranches.reduce((a, t) => a + t.amount, 0);
    const be = p.costs.breakEvenMonths;
    // "No more in total than the reference" is itself a threshold: a mix that
    // sits on it (the free relief, or a saving the typed read-out barely allows)
    // moves across it with the price of new money (L16: ₪4 saved; L10 typed at today's).
    const typedDelta = r.dueNow ? p.metrics.totalPaid - r.dueNow.reference.totalPaid : p.delta.totalPaid;
    const edge = (x: number) => Math.abs(x) <= Math.max(MATERIAL.neutral(s0?.todayTotalPaid ?? 0), 0.002 * Math.abs(p.metrics.totalPaid));
    return (
      close(relief, MATERIAL.monthly(refMonthly)) ||
      close(saving, MATERIAL.cost(todayCost)) ||
      edge(saving) ||
      edge(typedDelta) ||
      (p.goal === "years" && close((r.dueNow?.reference.months ?? r.today.months) - p.metrics.months, MATERIAL.months)) ||
      (newMoney > 0 && close((p.costs.prepaymentFees + p.costs.setup) / newMoney, REFI_COST_MAX)) ||
      (be !== null && Math.abs(be - 120) <= 6) ||
      // the budget edge: a mix that fits its ceiling by a couple of shekels (L33: a 19-year term ₪2 under ₪1,180, 20 years otherwise),
      // or by less than a price step of `step` points moves its payment (new money × step / 12, the interest part's bound:
      // L33 at +0.05, 19 years at ₪1,175 under ₪1,180, ₪6 for ₪152k; at today's price that term is ₪1 over and 20 years is taken)
      (p.budget !== undefined && p.metrics.monthly >= p.budget - Math.max(3, 0.002 * p.budget, (newMoney * step) / 100 / 12))
    );
  }

  /** Tallies across every build this verifier saw (the corpus prints them). */
  const tally = { slivers: 0, slivMarked: 0, balanced: 0, tLow: 1, tSum: 0, tN: 0 };

  /**
   * A kept or moved debt's "why" may not claim a saving from refinancing into
   * money dearer than the debt without naming the saving's real source (the
   * term, the indexation, the balloon's principal): L09's "מחזורו מוסיף ₪2,302
   * להחזר החודשי וחוסך ₪312,935 מסך התשלומים" beside "4.22% מול 6.32%".
   */
  function whyLint(tag: string, p: Proposal) {
    for (const m of p.moves) {
      const w = m.why;
      // Only debt due now is "carried" as an addition (audit W4: a row a move to
      // another bank refinances has payments of its own that stop).
      if (/פירעונו מהכסף החדש מוסיף/.test(w)) check(!!m.due, `${tag}: ${m.label} is not due now but its why adds the gross new loan: ${w}`);
      // A segment the mix opens no money in prices a kept debt at its own term:
      // no term change to speak of (audit W9: L35's 20-year מל"צ against 10 years).
      if (m.action === "keep" && !p.tranches.some((t) => t.segment === m.segment)) check(!/את התקופה מ-/.test(w), `${tag}: kept ${m.label} is explained by a term change where no money is opened: ${w}`);
      // A moved debt that would be cheaper to keep says what the move buys (audit P2).
      if (m.action !== "keep" && !m.due && !/^הוא עובר עם כל המשכנתא/.test(w) && /השארתו הייתה חוסכת|וסך התשלומים עליו עולה/.test(w))
        check(/נדרש/.test(w), `${tag}: moved ${m.label} is cheaper to keep and its why does not say what the move buys: ${w}`);
      const r = w.match(/הריבית היום (\d+\.\d+)% מול (\d+\.\d+)% לכסף חדש/) ?? w.match(/הריבית עליו (\d+\.\d+)% וכסף חדש עולה (\d+\.\d+)%/);
      if (!r) continue;
      // (Two rates rounded to 0.01: a printed gap of 0.05 can be 0.04 underneath.)
      if (!(Number(r[2]) - Number(r[1]) > 0.06)) continue;
      const claim =
        m.action === "keep"
          ? /(חוסך|חוסכת) ₪[\d,]+ מסך התשלומים|סך התשלומים יורד/.test(w)
          : /השארתו[^.]*מוסיפה[^.]*₪[\d,]+ לסך התשלומים|סך התשלומים יורד/.test(w);
      if (claim) check(/תקופה|מדד|הצמדה|קרן|ריבית בלבד/.test(w), `${tag}: ${m.label} why claims a saving from dearer money without its source: ${w}`);
      // A kept debt cheaper than new money leads with the two rates.
      if (m.action === "keep" && /^מחזורו/.test(w) && r[0].startsWith("הריבית היום")) check(false, `${tag}: kept ${m.label} is cheaper than new money (${r[1]}% vs ${r[2]}%) and does not lead with it: ${w}`);
    }
  }

  /**
   * Wave 2's rules on one proposal, recomputed from what it shows:
   *   B/C/D the five-year guard: its sentence holds on every month 1–60 in every
   *         economy; a relative guard never sits under the cap and holds; none is said;
   *   G     a debt CHEAP_KEEP holds is never moved;
   *   K     the appraisal is paid once; the notice fee is never charged on a
   *         Hapoalim letter's figure and never mentioned on an internal refinance;
   *   L     a CPI-linked all-purpose debt is never compared at its real rate;
   *   M     the stale-prime words only where a stale prime row moved; a tranche
   *         under a year old names its age; a saving against debt due now names
   *         the reference; moveGroups partition the moves.
   */
  function waveLints(tag: string, input: AutoMixInput, r: AutoMixResult, p: Proposal) {
    const refMonthly = r.dueNow?.reference.monthly ?? r.today.monthly;
    const all = p.reasons.join(" ");
    const promise = all.match(/בחמש השנים הקרובות, גם בתרחיש הלחץ הקשה ביותר, ההחזר לא עולה על (?:התקרה של )?₪([\d,]+)/);
    if (promise) check(guardOk(p.rows, input.inflation, Number(promise[1].replace(/,/g, "")), EVERY60), `${tag}: the guard sentence (₪${promise[1]}) breaks on some month 1–60`);
    if (p.goal === "payment" || p.goal === "balanced" || p.goal === "years") {
      const g = p.guard;
      check(!!g, `${tag}: no guard on the proposal`);
      if (g) {
        if (g.kind === "relative") {
          wave.guardRelative++;
          check(g.caps.every((c) => c >= (p.goal === "years" ? (p.budget ?? refMonthly) : refMonthly) - 1), `${tag}: a relative guard below the cap ${g.caps.join("/")}`);
          if (g.holds) check(guardOk(p.rows, input.inflation, g.caps, EVERY60), `${tag}: relative guard said to hold, and the rows break it`);
        }
        if (g.kind === "absolute" && g.holds) check(guardOk(p.rows, input.inflation, g.caps[0], EVERY60), `${tag}: absolute guard said to hold, and the rows break it`);
        if (g.kind === "none" && p.status !== "unavailable" && p.moves.some((m) => m.action !== "keep")) {
          wave.guardNone++;
          check(p.caveats.some((c) => c.includes("עלול לעלות בחמש השנים הקרובות")), `${tag}: holds no guard and does not say so`);
        }
        // קיצור שנים holds its guard where the solver looks (its samples), every economy.
        // (The solver holds it before the tranches are rounded to ₪1,000: a few shekels a tranche.)
        if (p.goal === "years" && p.status === "ok" && g.kind !== "none") check(guardOk(p.rows, input.inflation, g.caps.map((c) => c + 2 * p.tranches.length), EARLY), `${tag}: years breaks its ${g.kind} guard at a guard month`);
      }
    }
    for (const m of p.moves) {
      if (m.heldCheap !== undefined) {
        wave.heldCheap++;
        check(m.action === "keep", `${tag}: ${m.label} is ${m.heldCheap} points under new money and was moved`);
      }
      const src = input.master.find((l) => l.id === m.id);
      const linkedAp = !!src && (Number(src.path_id) === 3 || Number(src.path_id) === 5) && m.segment === "allPurpose";
      if (linkedAp) check(!/הריבית היום \d+\.\d+% מול \d+\.\d+% לכסף חדש|הריבית עליו \d+\.\d+% וכסף חדש/.test(m.why), `${tag}: CPI-linked all-purpose ${m.label} compared at its real rate: ${m.why}`);
      // A Hapoalim letter's printed figure holds the 0.1% notice fee: it is charged net of it.
      if (src && m.action !== "keep" && /הפועלים/.test(String(src.source_bank ?? "")) && src.prepayment_fee != null && Number(src.prepayment_fee) > 0 && src.group === "mortgage")
        check(m.fee <= Math.max(0, Math.round(Number(src.prepayment_fee) - 0.001 * Number(src.amount))) + 1, `${tag}: ${m.label} charged ${m.fee}, the printed ${src.prepayment_fee} with the notice fee in it`);
      // A tranche given less than SEASONING_MONTHS ago, refinanced, names its age.
      if (src && m.action !== "keep" && src.group === "mortgage" && !m.due && src.source_start_date) {
        const [d, mo, y] = String(src.source_start_date).split("/").map(Number);
        const start = y ? new Date(y, mo - 1, d) : new Date(String(src.source_start_date));
        const days = (Date.now() - start.getTime()) / 864e5;
        if (Number.isFinite(days) && days >= 0 && days < SEASONING_MONTHS * 30.44) check(p.caveats.some((c) => /לפני \d+ (שבועות|חודשים) בלבד/.test(c)), `${tag}: refinances ${m.label}, given ${Math.round(days)} days ago, and does not say so`);
      }
    }
    // The appraisal is one for the property: both files together pay it once.
    if (p.tranches.some((t) => t.segment === "housing") && p.tranches.some((t) => t.segment === "allPurpose") && r.pricing.tier !== "nonbank")
      check(p.costs.setup <= __test.SETUP_HOUSING + __test.SETUP_AP_ALONE - 2500 + 1, `${tag}: setup ${p.costs.setup} pays the appraisal twice`);
    // The notice fee caveat only where a lender other than the debt's own refinances it.
    if (p.refinance === "internal" && p.structure === "bank" && !!p.priceBank && p.priceBank !== "system") check(!p.caveats.some((c) => c.includes("הודעה מוקדמת של 10 ימים")), `${tag}: notice-fee caveat on an internal refinance`);
    // W6: the stale-prime explanation only where a stale prime row moved.
    if (p.caveats.some((c) => c.includes("משורות פריים שהודפסו בפריים של יום הדוח"))) {
      wave.staleWords++;
      const stale = r.findings.find((x) => x.id === "stale-prime");
      check(!!stale && stale.rows.some((id) => p.moves.some((m) => m.id === id && m.action !== "keep")), `${tag}: blames stale prime rows that did not move`);
    }
    // P5: with debt due now, the totals sentence names the reference it measures from.
    if (r.dueNow && p.status === "ok" && p.reasons.some((x) => x.includes("חיסכון של") && x.includes("במקום")))
      check(p.reasons.some((x) => x.includes("ונשיאת החוב שעומד לפירעון, ₪")), `${tag}: a saving against the reference that does not name it`);
    // P1: moveGroups partition the moves, with their counts and sums.
    if (p.moveGroups) {
      wave.moveGroups++;
      const ids = p.moveGroups.flatMap((g) => g.ids);
      check(ids.length === p.moves.length && new Set(ids).size === ids.length && p.moves.every((m) => ids.includes(m.id)), `${tag}: moveGroups do not partition the moves`);
      for (const g of p.moveGroups) {
        const ms = p.moves.filter((m) => g.ids.includes(m.id));
        check(g.count === ms.length && g.balance === ms.reduce((a, m) => a + m.balance, 0) && ms.every((m) => m.action === g.action), `${tag}: moveGroup ${g.label} disagrees with its moves`);
        if (g.count > 1) check(ms.every((m) => m.balance < SMALL_MOVE), `${tag}: moveGroup ${g.label} folds a move of ${SMALL_MOVE} or more`);
      }
    }
    void STABLE_PRICE;
  }

  /** One track's share cap on the housing money, קל"צ exempt (rules.ts TRACK_SHARE_EXEMPT). */
  function shareCapOk(p: Proposal): boolean {
    const h = p.tranches.filter((t) => t.segment === "housing");
    const N = h.reduce((a, t) => a + t.amount, 0);
    return h.every((t) => TRACK_SHARE_EXEMPT.includes(t.track) || t.amount <= TRACK_SHARE_MAX * N + (1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE + 1000);
  }

  /** Tallies of this wave's rules across builds (the corpus prints them). */
  const wave = { guardRelative: 0, guardNone: 0, heldCheap: 0, gated: 0, recNull: 0, aligned: 0, moveGroups: 0, typedBinds: 0, staleWords: 0 };

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
      p.tranches.forEach((t) => push("keptSmall", t.keptSmall));
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
        // The board's copy of the master row, still carrying the payment the document prints (a kept debt is not re-priced).
        const src = masterById.get(mv.id)!;
        const want = { ...foldMasterRow(src, false, "x"), ...(src.source_monthly != null ? { source_monthly: src.source_monthly, source_monthly_basis: src.source_monthly_basis } : {}) };
        const strip = (l: ImportedLoan) => JSON.stringify({ ...l, id: 0, mix_id: 0 });
        check(kept.some((l) => strip(l) === strip(want)), `${tag(p.goal)}: kept row ${mv.label} is not foldMasterRow(master)`);
      }
      // 5. guarantees travel, never counted
      const guar = input.master.filter((l) => l.is_guarantor).length;
      check(p.rows.filter((l) => l.is_guarantor).length === guar, `${tag(p.goal)}: guarantees ${p.rows.filter((l) => l.is_guarantor).length} ≠ ${guar}`);
      // 6a. the solver budgets with the payment the board will show: a goal may never
      // come out "no-gain" because its own read-out runs over the budget it held
      // (that is the model and the read-out disagreeing, not a result).
      // (Only where the goal's solve holds the budget and the budget is reachable at all: the
      // lowest payment any mix reaches, the payment goal's, is within it. Consolidation, and a
      // budget below every mix, honestly read "over the budget".)
      const floor = r.proposals.find((x) => x.goal === "payment" && x.status !== "unavailable")?.metrics.monthly ?? Infinity;
      if (["years", "savings", "stable", "balanced"].includes(p.goal) && floor <= budget + 0.5)
        check(!(p.note ?? "").includes("חורג מהמסגרת"), `${tag(p.goal)}: read-out over the budget the solver held: ${p.note}`);
      // 6. budget-holding goals hold it
      // קיצור שנים holds its own ceiling: today's payment (the budget) or, with no budget set,
      // up to YEARS_STRETCH above the reference payment — never more.
      const refPay = due?.reference.monthly ?? r.today.monthly;
      const given = !!(input.profile.budget && input.profile.budget > 0);
      const ceiling = p.goal === "years" ? p.budget ?? budget : budget;
      if (p.goal === "years" && p.status !== "unavailable") {
        check(p.budget !== undefined, `${tag(p.goal)}: no ceiling on the years proposal`);
        check(given ? Math.abs((p.budget ?? 0) - budget) <= 0.5 : (p.budget ?? 0) <= Math.round(refPay * (1 + YEARS_STRETCH)) + 0.5 && (p.budget ?? 0) >= budget - 0.5, `${tag(p.goal)}: years ceiling ${p.budget} outside [${budget}, ${Math.round(refPay * (1 + YEARS_STRETCH))}]`);
      }
      if (BUDGET_GOALS.includes(p.goal) && p.status !== "no-gain") check(p.metrics.monthly <= ceiling + 0.5, `${tag(p.goal)}: ${p.metrics.monthly} over budget ${ceiling}`);
      // A state-eligibility loan is repaid only by קיצור שנים and החזר חודשי נמוך (the goals that may lift
      // its lock), unless it is due now (then every goal pays it off).
      // (A non-bank first lien clears the property, eligibility loans included, by law of the lien.)
      if (p.goal !== "years" && p.goal !== "payment" && p.structure !== "firstLien")
        for (const mv of p.moves) if (mv.action !== "keep" && !mv.due && masterById.get(mv.id)?.source_eligibility) check(false, `${tag(p.goal)}: repays an eligibility loan (${mv.label})`);
      // 7. no "ok" proposal is worse than today on its own goal — or, with debt due
      // now, than the reference (today + the cheapest clearing of that debt).
      // Total paid is compared within the neutral residue (rules.ts MATERIAL.neutral):
      // a smaller difference is the rounding of ₪1,000 tranches, not a cost.
      const s0 = p.stress[0];
      const neutral = MATERIAL.neutral(s0?.todayTotalPaid ?? 0);
      const ref = due?.reference;
      const fP = s0 ? s0.totalPaid - s0.todayTotalPaid : 0;
      const tP = ref ? p.metrics.totalPaid - ref.totalPaid : d.totalPaid;
      if (p.status === "ok") {
        const worst = (k: "totalPaid" | "todayTotalPaid") => Math.max(...p.stress.slice(1).map((x) => x[k]));
        const relief = (ref ? ref.monthly : r.today.monthly) - p.metrics.monthly;
        const own: Record<GoalId, boolean> = {
          payment: relief > -0.5 && (ref ? true : d.monthly < 0),
          consolidate: relief > -0.5 && (ref ? true : d.monthly < 0),
          // קיצור שנים never costs more than the reference, forecast or typed.
          years: (ref ? p.metrics.months < ref.months : d.months < 0) && fP <= neutral && tP <= neutral,
          savings: fP < 0 && tP <= neutral,
          // מאוזן: a relief that costs no more, or a saving at no higher a payment.
          balanced: (relief > 0 && fP <= neutral && tP <= neutral) || (fP < 0 && tP <= neutral && relief >= -0.5),
          // יציבות מרבית in payment: the worst economy's highest payment over the whole life falls.
          stable: Math.max(...p.stress.map((x) => x.peakMonthly)) < Math.max(...p.stress.map((x) => x.todayPeakMonthly)),
        };
        check(own[p.goal], `${tag(p.goal)}: "ok" but not better than ${ref ? "the reference" : "today"} on its own goal (relief ${relief}, forecast ${fmt(fP)}, typed ${fmt(tP)})`);
      }
      // 7d. The cost goals' gates hold on every offered answer: the costs come back
      // within BREAK_EVEN_MAX (an estimated fee at the band's low end at least, and
      // then a caveat says so), and stability's worst-economy peak falls materially.
      if (p.status === "ok" && (p.goal === "savings" || p.goal === "balanced" || p.goal === "stable") && p.costs.prepaymentFees + p.costs.setup > 0) {
        const be = p.costs.breakEvenMonths;
        const within = be !== null ? be <= BREAK_EVEN_MAX : p.goal === "stable";
        check(within || p.caveats.some((c) => c.startsWith("עמלות הפירעון הן הערכה")), `${tag(p.goal)}: "ok" with break-even ${be ?? "never"} and no fee-band caveat`);
      }
      if (p.status === "ok" && p.goal === "stable") {
        const now = Math.max(...p.stress.map((x) => x.todayPeakMonthly));
        const next = Math.max(...p.stress.map((x) => x.peakMonthly));
        check(now - next >= MATERIAL.monthly(due ? due.reference.monthly : r.today.monthly) - 1, `${tag(p.goal)}: "ok" while the worst-economy peak falls only ${fmt(now - next)}`);
      }
      // 7a. One-off costs out of proportion to the debt are never offered (override off).
      if (p.status === "ok" && !input.profile.override && p.tranches.length) {
        const newMoney = p.tranches.reduce((a, t) => a + t.amount, 0);
        check(p.costs.prepaymentFees + p.costs.setup <= REFI_COST_MAX * newMoney + 0.5, `${tag(p.goal)}: "ok" with one-off costs ${fmt(p.costs.prepaymentFees + p.costs.setup)} over ${REFI_COST_MAX * 100}% of ${fmt(newMoney)} new money`);
      }
      // 7b. מאוזן's two measures: stated, consistent with the figures, in a reason, and its status rule.
      if (p.goal === "balanced") {
        const b = p.balance;
        check(!!b, `${tag(p.goal)}: no balance figures`);
        if (b && s0) {
          const relief = (ref ? ref.monthly : r.today.monthly) - p.metrics.monthly;
          check(Math.abs(b.relief - relief) <= 1 && Math.abs(b.saving + fP) <= 2, `${tag(p.goal)}: balance relief ${b.relief}/saving ${b.saving} ≠ the proposal's ${relief}/${-fP}`);
          const fr = b.reliefMax > 0 ? b.relief / b.reliefMax : 0;
          const sv = b.savingMax > 0 ? b.saving / b.savingMax : 0;
          // (The figures are rounded to the shekel: a share of small figures carries that rounding.)
          const slack = 0.01 + (b.reliefMax > 0 ? 1 / b.reliefMax : 0) + (b.savingMax > 0 ? 1 / b.savingMax : 0);
          check([Math.min(fr, sv), fr, sv].some((x) => Math.abs(x - b.t) <= slack), `${tag(p.goal)}: t ${b.t} is neither share (${fr.toFixed(3)}, ${sv.toFixed(3)})`);
          const todayCost = s0.todayTotalPaid - r.today.balance;
          const both = !due && b.reliefMax >= MATERIAL.monthly(r.today.monthly) && b.savingMax >= 1.02 * MATERIAL.cost(todayCost);
          if (p.status === "ok" && both) {
            tally.balanced++;
            tally.tLow = Math.min(tally.tLow, b.t);
            tally.tSum += b.t;
            tally.tN++;
            // Both measured: never all relief and no saving (at least a tenth of the most
            // saving), and the payment no higher. On a concave frontier both shares are ½
            // or more; on a dented one, where relief comes only from a longer term and
            // saving only from a shorter one, t can be small (fuzz Z49 0.29, Z258 0.16):
            // the corpus prints the lowest and the mean.
            check(b.saving >= 0.1 * b.savingMax && b.relief > -1, `${tag(p.goal)}: balanced ok with t ${b.t} (relief ${b.relief}/${b.reliefMax}, saving ${b.saving}/${b.savingMax})`);
            const all = p.reasons.join(" ");
            for (const v of [b.relief, b.reliefMax, b.saving, b.savingMax]) check(all.includes(`₪${Math.abs(v).toLocaleString("en-US")}`), `${tag(p.goal)}: the reasons do not state ${v}: ${p.reasons[0]}`);
          }
        }
        // Never refused over a difference within the neutral residue.
        const over = (p.note ?? "").match(/מייקרת את סך התשלומים ב-₪([\d,]+)/);
        if (over) check(Number(over[1].replace(/,/g, "")) > neutral, `${tag(p.goal)}: refused over ₪${over[1]}, within the neutral ₪${fmt(neutral)}`);
      }
      // 7c. No needless sliver: every tranche under a tenth of its segment's new money says why it stays.
      for (const seg of ["housing", "allPurpose"] as const) {
        const ts = p.tranches.filter((t) => t.segment === seg);
        if (ts.length < 2) continue;
        const N = ts.reduce((a, t) => a + t.amount, 0);
        for (const t of ts)
          if (t.amount < SLIVER_SHARE * N) {
            tally.slivers++;
            if (t.keptSmall) tally.slivMarked++;
            check(!!t.keptSmall, `${tag(p.goal)}: ${t.track} ${fmt(t.amount)} is under ${SLIVER_SHARE * 100}% of ${fmt(N)} with no reason to stay`);
          }
      }
      whyLint(tag(p.goal), p);
      waveLints(tag(p.goal), input, r, p);
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
        if (p.status === "ok" && !due && ["savings", "balanced", "stable"].includes(p.goal) && tC > neutral)
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
    // …and a mix that repays an eligibility loan is outside savings' rules (only years and payment may).
    const zakFree = (p: Proposal) => p.structure === "firstLien" || !p.moves.some((m) => m.action !== "keep" && !m.due && masterById.get(m.id)?.source_eligibility);
    const pvOk = (p: Proposal) => zakFree(p) && (refPv === undefined || !p.metrics.outlook || p.metrics.outlook.pv <= refPv + 1);
    // Savings shows the lowest typed cost only within DISPLAY_GIVE of its own
    // objective (audit S1); an offered savings that shows more than another goal
    // offered within its rules says so in a caveat that names that goal.
    const savD = by("savings");
    if (savD && savD.status === "ok")
      for (const g of ["years", "balanced", "consolidate", "stable"] as GoalId[]) {
        const p = by(g);
        if (!p || p.status !== "ok" || p.sameAs === "savings" || p.metrics.monthly > budget + 0.5 || !shareCapOk(p) || !pvOk(p)) continue;
        // …and none of the debts savings holds as cheaper than new money (CHEAP_KEEP: another goal may lift it on its own measure).
        if (p.moves.some((m) => m.action !== "keep" && savD.moves.some((x) => x.id === m.id && x.heldCheap !== undefined))) continue;
        if (savD.metrics.totalCost <= p.metrics.totalCost + 1 + slack(savD, p, "cost")) continue;
        check(savD.caveats.some((c) => c.includes(p.label)), `${name}: savings shows cost ${fmt(savD.metrics.totalCost)} > ${g} ${fmt(p.metrics.totalCost)} and no caveat names it`);
      }
    const years = by("years");
    if (years)
      for (const g of ["savings", "balanced", "consolidate", "stable"] as GoalId[]) {
        const p = by(g);
        // Only against mixes within years' own rules: the track share cap (a non-bank savings may
        // adopt stable's single-track mix, corpus Z150), no eligibility loan repaid where years may not,
        // and no more paid in total than the reference (forecast and typed, within the neutral residue).
        if (!p || !shareCapOk(p)) continue;
        // …and its five-year guard at its ceiling (a mix that breaks it is outside years' rules).
        // (Its caps are shown rounded up; the engine tests a rival at the cap itself, to the shekel.)
        if (years.guard && years.guard.kind !== "none" && !guardOk(p.rows, input.inflation, years.guard.caps.map((c) => c - 1))) continue;
        if (p.moves.some((m) => m.action !== "keep" && years.moves.some((x) => x.id === m.id && x.heldCheap !== undefined))) continue;
        const pn = MATERIAL.neutral(p.stress[0]?.todayTotalPaid ?? 0);
        if ((p.stress[0] ? p.stress[0].totalPaid - p.stress[0].todayTotalPaid : 0) > pn || (due ? p.metrics.totalPaid - due.reference.totalPaid : p.delta.totalPaid) > pn) continue;
        check(years.metrics.months <= p.metrics.months + slack(years, p, "months"), `${name}: years ends at ${years.metrics.months} after ${g} ${p.metrics.months}`);
      }
    const sav = by("savings");
    if (sav) {
      const J = (p: Proposal) => 0.75 * p.stress[0].totalPaid + 0.25 * Math.max(...p.stress.map((s) => s.totalPaid));
      // Savings' own objective: no offered mix within its rules (the budget, the
      // share cap, the PV cap, the typed read-out within the neutral residue) costs
      // less on it, by more than the display repair's allowance.
      const nt = MATERIAL.neutral(sav.stress[0]?.todayTotalPaid ?? 0);
      for (const g of ["years", "balanced", "consolidate", "stable"] as GoalId[]) {
        const p = by(g);
        if (!p || p.status !== "ok" || p.metrics.monthly > budget + 0.5 || !shareCapOk(p) || !pvOk(p)) continue;
        if ((due ? p.metrics.totalPaid - due.reference.totalPaid : p.delta.totalPaid) > nt) continue;
        // …and none of the debts savings keeps as cheaper than new money (CHEAP_KEEP; the consolidation does not keep them).
        if (p.moves.some((m) => m.action !== "keep" && sav.moves.some((x) => x.id === m.id && x.heldCheap !== undefined))) continue;
        if (sav.status === "ok" && (p.costs.breakEvenMonths === null || p.costs.breakEvenMonths > BREAK_EVEN_MAX) && p.costs.prepaymentFees + p.costs.setup > 0) continue;
        check(J(sav) <= J(p) * 1.0015 + 500 + slack(sav, p, "cost"), `${name}: savings cost ${fmt(J(sav))} > ${g} ${fmt(J(p))}`);
      }
      // Audit S2: stable never beats savings on payment, forecast, worst economy and present value at once.
      // (Within savings' rules: a stable mix the typed read-out contradicts is one savings may not offer, L11 at 0% inflation.)
      const st = by("stable");
      const stTyped = st ? (due ? st.metrics.totalPaid - due.reference.totalPaid : st.delta.totalPaid) : Infinity;
      const stLifts = !!st && st.moves.some((m) => m.action !== "keep" && sav.moves.some((x) => x.id === m.id && x.heldCheap !== undefined));
      if (st && !stLifts && sav.status !== "unavailable" && st.status === "ok" && sav.status === "ok" && shareCapOk(st) && pvOk(st) && stTyped <= nt) {
        const w = (p: Proposal) => Math.max(...p.stress.map((x) => x.totalPaid));
        const pv = (p: Proposal) => p.metrics.outlook?.pv ?? p.metrics.pv;
        const m = 0.0015;
        const dominated = st.metrics.monthly <= sav.metrics.monthly && st.stress[0].totalPaid < sav.stress[0].totalPaid * (1 - m) && w(st) < w(sav) * (1 - m) && pv(st) < pv(sav) * (1 - m);
        check(!dominated, `${name}: stable dominates savings on payment, forecast, worst case and PV`);
      }
    }
    check(r.recommended === null || r.proposals.some((p) => p.goal === r.recommended && p.status === "ok"), `${name}: recommended ${r.recommended} is not an ok proposal`);
    // F. The first offered goal that costs no more than the reference; a goal that
    // buys something at a price only when a budget below today's payment asks for it.
    {
      const fP = (p: Proposal) => (p.stress[0] ? p.stress[0].totalPaid - p.stress[0].todayTotalPaid : 0);
      const nt = MATERIAL.neutral(r.proposals[0]?.stress[0]?.todayTotalPaid ?? 0);
      const offered = (g: GoalId) => r.proposals.find((p) => p.goal === g && p.status === "ok" && !p.sameAs);
      const first = (["balanced", "savings", "stable", "years", "consolidate"] as GoalId[]).find((g) => {
        const p = offered(g);
        return p && fP(p) <= nt;
      });
      const asked = !!(input.profile.budget && input.profile.budget < (due?.reference.monthly ?? r.today.monthly) - 0.5);
      const want = first ?? (asked ? (["balanced", "payment"] as GoalId[]).find((g) => offered(g)) : undefined) ?? null;
      check(r.recommended === want, `${name}: recommended ${r.recommended} where the rule picks ${want}`);
      if (r.recommended === null && r.proposals.some((p) => p.status === "ok")) wave.recNull++;
    }
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
  return { check, failures, passed: () => passed, verify, verifyOverride, lint, guardOk, shareCapOk, BUDGET_GOALS, tally, nearThreshold, wave };
}

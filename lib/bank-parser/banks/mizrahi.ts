// בנק מזרחי טפחות — "נתונים לסילוק מלא של הלוואה בתיק".
//
// This template was read as Bank Jerusalem's for as long as it has existed, and
// it never was: all three samples print "בנק מזרחי-טפחות בע"מ" in their closing
// pages, the *8860 line and the 03-5656621 fax are Mizrahi's, and no sample of
// this form carries Bank Jerusalem's name anywhere. Every Mizrahi statement
// imported before this was filed under the wrong lender.
//
// One חלק per page, and two independent columns on it: נתונים כלליים on the
// right (terms) and נתונים לסילוק on the left (what it costs to close). Read as
// whole lines the two interleave — a label from one column lands beside a value
// from the other — so the page is split by x before anything is looked up.
//
// The split is clean: the payoff column's labels are right-aligned at x≈244 and
// its figures sit at x≈66-112, while the general column's labels reach x≈480
// with values from x≈298. Nothing crosses x≈270.
//
// This lender also puts the whole track description in one string —
// "משתנה לא צמודה כל 2 שנים על בסיס אג"ח ממשלתי" — which is the richest wording
// of the four and carries the reset interval that the others print as a number.
//
// And on every variable tranche it prints the price twice over — the anchor's
// own level, the margin above it, the resulting rate and the reset cycle, each
// as it stands today AND as it stood at drawdown. That block is the most
// valuable thing in the document and sits below x≈390, in a two-column table of
// its own; see readAnchorBlock.

import type { RawItem, RawPage } from "@/lib/credit-parser/types";
import { date, has, norm, num, pageLines, pct, signedPct, toDate, monthsBetween } from "../text";
import { clean } from "../fields";
import type { BankLoan, BankStatement, BankTranche, Linkage, RateKind } from "../types";
import { BANK_LABEL } from "../types";

/** Everything left of this is the payoff column. */
const SPLIT_X = 270;

/**
 * The payoff column never reaches past here.
 *
 * Its innermost run is "ריבית:" at x≈219 on every page of every sample; the
 * split at 270 leaves a 50-point gutter that the general column is free to
 * spill into, and one field does. See readTrackName.
 */
const GUTTER_X = 222;

const GENERAL = [
  "שם החלק בהלוואה",
  "סוג סילוק",
  "סוג ההלוואה",
  "שיטת פרעון חלק זה בהלוואה",
  "סכום חלק זה בעת הביצוע",
  "תאריך הביצוע",
  "תאריך חיוב ראשון",
  "תאריך סיום חלק זה של ההלוואה",
  "סוג הריבית",
  "שיעור הריבית בחלק זה",
  "שיעור הריבית המתואמת",
  "סוג ההצמדה",
  "מדד הבסיס לחישוב ההצמדה",
  "סכום החיוב החודשי בגין חלק זה",
  "שיעור ריבית ממוצעת במועד הסילוק",
  "הריבית הכוללת החזויה",
  "שיעור הריבית לצרכי השוואה",
];

const PAYOFF = [
  "יתרת הקרן",
  "הפרשי הצמדה על הקרן",
  "הפרשי הצמדה על הריבית",
  "ריבית",
  "סיכום ביניים",
  "עמלת אי הודעה",
  "פיצוי מדד",
  "הפרשי היוון",
  "סה\"כ עמלת פרעון מוקדם",
  "סכום הסילוק",
];

/**
 * The track, from the lender's own sentence.
 *
 * "ריבית קבועה צמודה למדד, שפיצר" and "משתנה לא צמודה כל 2 שנים על בסיס אג"ח
 * ממשלתי" carry rate kind, linkage and reset interval in one line, so this is
 * the primary source and the separate סוג הריבית / סוג ההצמדה fields only fill
 * what it leaves out.
 */
function readTrack(
  name: string,
  rateType: string,
  linkageField: string
): { kind: RateKind; linkage: Linkage; resetMonths: number | null } {
  const n = norm(name);
  const t = norm(rateType);
  const l = norm(linkageField);

  const kind: RateKind = /פריים/.test(n) || /פריים/.test(t)
    ? "prime"
    : /משתנה/.test(n) || /משתנה/.test(t)
      ? "variable"
      : /קבוע/.test(n) || /קבוע/.test(t)
        ? "fixed"
        : "unknown";

  // "לא צמוד" has to be tested before the "צמוד" it contains.
  const src = `${n}${l}`;
  // Currency first: "צמוד אירו" contains צמוד and would otherwise be filed as
  // index-linked, which is a different risk and a different track entirely.
  const linkage: Linkage = /דולר|אירו|מט"ח|יורו/.test(src)
    ? "fx"
    : /לאצמוד/.test(src)
      ? "unlinked"
      : /צמודמדד|צמודהלמדד|צמוד/.test(src)
        ? "linked"
        : "unknown";

  // "כל 2 שנים" / "כל 5 שנים" — the reset interval, stated in years. Half-years
  // are real ("כל 2.5 שנים"), so the number is not assumed to be whole.
  const years = name.match(/כל\s*(\d+(?:\.\d+)?)\s*שנ/);
  // "כל 3 חודשים", and the abbreviated form this template uses on its foreign-
  // currency tranches — "עדכ':3 חודשים". Same fact, written as an update note
  // rather than as a period, and missed entirely when only כל is looked for.
  const months = name.match(/(?:כל|עדכ(?:ון)?['׳’]?\s*:?)\s*(\d+)\s*חוד/);
  const resetMonths = years
    ? Math.round(Number(years[1]) * 12)
    : months
      ? Number(months[1])
      : kind === "prime"
        ? 1
        : null;

  return { kind, linkage, resetMonths };
}

/**
 * The track description — the one field that outgrows its column.
 *
 * It is set right-aligned under its label, so the longer it is the further left
 * it starts: "ריבית משתנה על בסיס הפריים,לא צמוד,לפי ריבית ב"י,1.22" runs 54
 * characters and begins at x≈259, eleven points the payoff side of the split.
 * The general-column lookup could not see it, and three prime tranches of one
 * statement arrived with no track, no anchor name and no linkage of their own —
 * only what the separate סוג הריבית and סוג ההצמדה fields happened to say. No
 * value of SPLIT_X fixes this, because a longer description starts further left
 * still.
 *
 * So it is found by shape: Hebrew, one row below the label, inside the gutter
 * the payoff column never reaches, and rightmost — which is where the shortest
 * of them starts and where a stray from the other column never is.
 */
function readTrackName(items: RawItem[]): string {
  const label = items.find((i) => has(i.str, "שם החלק בהלוואה"));
  if (!label) return "";
  const below = items.filter(
    (i) =>
      i.x < label.x &&
      i.x >= GUTTER_X &&
      label.y - i.y >= 6 &&
      label.y - i.y <= 20 &&
      /[֐-׿]{2,}/.test(i.str)
  );
  if (!below.length) return "";
  const first = below.reduce((best, i) => (i.x > best.x ? i : best), below[0]);
  return clean(
    below
      .filter((i) => Math.abs(i.y - first.y) <= 2)
      .sort((a, b) => b.x - a.x)
      .map((i) => i.str)
      .join(" ")
  );
}

/* ------------------------------------------------------- the pricing block */

/**
 * How far a value may sit from its label's baseline and still be its value.
 * Rows in this block are 15-18 points apart, so 7 catches the pair — label and
 * figure are set up to 3 points out — and cannot reach the row above or below.
 */
const ROW_DY = 7;

/**
 * How far left of a label its own block reaches. The widest row runs from
 * "שיעור הריבית:" at x≈420 to the drawdown figure at x≈268; 170 covers it and
 * stops short of the payoff column, whose innermost label sits at x≈219.
 */
const BLOCK_SPAN = 170;

/**
 * The rate-setting block, and what it says today versus at drawdown.
 *
 * Every variable tranche carries a small two-column table:
 *
 *     נתונים למועד -        מועד החישוב      מתן ההלוואה
 *     שיעור ריבית העוגן:    + 6.000000 %     + 4.750000 %
 *     שיעור התוספת לעוגן:   + 0.500000 %     + 0.500000 %
 *     שיעור הריבית:           6.500000 %       5.250000 %
 *     תדירות שינוי הריבית:  בהתאם לשינוי הריבית ע'י בנק ישראל
 *
 * None of it was being read: `margin` was hardcoded null and the עוגן column
 * took whatever followed "על בסיס" in the track sentence, which is the anchor's
 * NAME. So the one lender that prints the anchor's level outright was the one
 * lender whose עוגן column came out empty.
 *
 * מועד החישוב is what the borrower pays now and is what the mix needs; מתן
 * ההלוואה is history and is read only to prove the columns were told apart.
 * Assignment is by x against the two column headers rather than by order,
 * because a row can print one figure or two — "+ 4.220000" with nothing beside
 * it is a tranche whose anchor has not moved since drawdown.
 */
interface AnchorBlock {
  /** The anchor's own level at the calculation date. */
  rate: number | null;
  /** Margin over it — signed, and negative on more than one real statement. */
  margin: number | null;
  /** The same pair at drawdown, for the reconciliation check only. */
  rateAtDrawdown: number | null;
  marginAtDrawdown: number | null;
  /** Months between resets, where the lender states a cycle. */
  resetMonths: number | null;
  /** The cycle as printed — prime tranches answer in words, not months. */
  frequencyText: string;
  /** מועד החיוב הראשון בריבית המעודכנת, dd/mm/yyyy. */
  nextReset: string;
}

/** The block's header row, giving each column an x to be measured against. */
function anchorColumns(items: RawItem[]): { now: number; drawdown: number } | null {
  const head = items.find((i) => has(i.str, "נתונים למועד"));
  if (!head) return null;
  const row = items.filter((i) => Math.abs(i.y - head.y) <= 4 && i.x < head.x);
  const now = row.find((i) => norm(i.str) === norm("מועד החישוב"));
  const drawdown = row.find((i) => norm(i.str) === norm("מתן ההלוואה"));
  return now && drawdown ? { now: now.x, drawdown: drawdown.x } : null;
}

/** One signed figure, from however many runs the cell arrived in. */
function cellPct(parts: RawItem[]): number | null {
  if (!parts.length) return null;
  const ordered = [...parts].sort((a, b) => b.x - a.x);
  const joined = signedPct(ordered.map((i) => i.str).join(""));
  if (joined !== null) return joined;
  const each = ordered.map((i) => signedPct(i.str)).find((v) => v !== null);
  return each ?? null;
}

/**
 * The two figures on one labelled row of the block, current first.
 *
 * Without column headers the fallback is order: right-to-left is
 * current-then-drawdown, which is also the order the headers themselves are
 * printed in, so the two rules cannot disagree about which is which.
 */
function anchorRow(
  items: RawItem[],
  phrase: string,
  cols: { now: number; drawdown: number } | null
): [number | null, number | null] {
  const label = items.find((i) => has(i.str, phrase));
  if (!label) return [null, null];

  const floor = cols ? Math.min(cols.now, cols.drawdown) - 40 : label.x - BLOCK_SPAN;
  const cells = items.filter(
    (i) =>
      i !== label &&
      i.x < label.x - 1 &&
      i.x > floor &&
      Math.abs(i.y - label.y) <= ROW_DY &&
      /\d/.test(i.str)
  );
  if (!cells.length) return [null, null];

  if (!cols) {
    const ordered = [...cells].sort((a, b) => b.x - a.x);
    return [cellPct(ordered.slice(0, 1)), cellPct(ordered.slice(1, 2))];
  }
  // 35 points is half the gap between the two columns, so a figure that belongs
  // to neither — a stray from the payoff side on the same baseline — is dropped
  // rather than pulled into whichever column happens to be nearer.
  const near = (x: number) => cells.filter((i) => Math.abs(i.x - x) <= 35);
  return [cellPct(near(cols.now)), cellPct(near(cols.drawdown))];
}

/** A single-valued field of the block — words or a date, left of its label. */
function blockValue(items: RawItem[], phrase: string): string {
  const label = items.find((i) => has(i.str, phrase));
  if (!label) return "";
  const near = items.filter(
    (i) =>
      i !== label &&
      i.x < label.x - 1 &&
      i.x > label.x - BLOCK_SPAN &&
      Math.abs(i.y - label.y) <= ROW_DY
  );
  return clean(near.sort((a, b) => b.x - a.x).map((i) => i.str).join(" "));
}

function readAnchorBlock(items: RawItem[]): AnchorBlock {
  const cols = anchorColumns(items);
  const [rate, rateAtDrawdown] = anchorRow(items, "שיעור ריבית העוגן", cols);
  const [margin, marginAtDrawdown] = anchorRow(items, "שיעור התוספת לעוגן", cols);

  // "30 חודשים" / "3 חודשים" on a variable tranche; "בהתאם לשינוי הריבית ע'י
  // בנק ישראל" on a prime one, which states the cycle without a number and is
  // left to the track reader's prime default rather than invented here.
  const frequencyText = blockValue(items, "תדירות שינוי הריבית");
  const months = frequencyText.match(/(\d+)\s*חוד/);
  const years = frequencyText.match(/(\d+(?:\.\d+)?)\s*שנ/);

  return {
    rate,
    margin,
    rateAtDrawdown,
    marginAtDrawdown,
    resetMonths: months ? Number(months[1]) : years ? Math.round(Number(years[1]) * 12) : null,
    frequencyText,
    nextReset: date(blockValue(items, "מועד החיוב הראשון בריבית המעודכנת")),
  };
}

/**
 * A value beside its label, found by coordinate rather than by line.
 *
 * This template sets label and value on baselines a few points apart —
 * "יתרת הקרן:" at y 583.7, its figure at 579.2 — which no fixed line-grouping
 * survives: any bucket width puts some pair either side of a boundary. Rows are
 * about 14 points apart, so a window of 6 catches the pair and cannot reach the
 * neighbouring row.
 */
function beside(items: RawItem[], phrase: string, dy = 6): string {
  const label = items.find((i) => has(i.str, phrase));
  if (!label) return "";

  // Some cells are a single run holding both: "סכום החיוב החודשי בגין חלק זה:
  // 637.81". Nothing sits beside them, so looking outward reaches into the next
  // row and returns its value instead — this field was coming back as the
  // average interest rate.
  // The separator that follows a label is not a value: "יתרת הקרן:" leaves a
  // bare colon behind, which is truthy and short-circuited every other field.
  const inline = clean(afterPhrase(label.str, phrase)).replace(/^[:\s]+/, "");
  if (/[\d֐-׿]/.test(inline)) return inline;

  // Candidates start LEFT of the label's left edge, not left of its right edge.
  // The track description is wider than its own label and overhangs it, so a
  // right-edge test rejected the value and forced a looser rule that then let
  // the part-number box's stray digits in.
  const pick = (lo: number, hi: number) => {
    const near = items.filter(
      (i) => i !== label && i.x < label.x - 1 && label.y - i.y >= lo && label.y - i.y <= hi
    );
    if (!near.length) return "";
    // "ש"ח" and "%" sit on the label's own baseline while the figure is a few
    // points below, so a unit must never anchor the row.
    const anchors = near.filter((i) => !isUnit(i.str));
    if (!anchors.length) return "";
    const anchorY = anchors.reduce(
      (best, i) => (Math.abs(i.y - label.y) < Math.abs(best - label.y) ? i.y : best),
      anchors[0].y
    );
    return clean(
      near
        .filter((i) => Math.abs(i.y - anchorY) <= 2)
        .sort((a, b) => b.x - a.x)
        .map((i) => i.str)
        .join(" ")
    );
  };

  // Beside it first, then one row below — the track description sits about
  // sixteen points down from its label.
  return pick(-dy, dy) || pick(dy, 20);
}

/**
 * Same lookup, but the label must BE the phrase rather than merely contain it.
 *
 * This template names the same field two ways depending on the rate type — a
 * fixed tranche says "שיעור הריבית בחלק זה:", a variable one just
 * "שיעור הריבית:" — and a loose match on the shorter form would hit
 * "שיעור הריבית לצרכי השוואה" or "שיעור הריבית המתואמת" first and read the
 * wrong number.
 */
function besideExact(items: RawItem[], phrase: string, dy = 6): string {
  const want = norm(phrase).replace(/:$/, "");
  const label = items.find((i) => {
    const n = norm(i.str).replace(/[:*]+$/, "");
    return n === want;
  });
  if (!label) return "";
  return beside([label, ...items.filter((i) => i !== label)], i0(label.str), dy);
}

/** The phrase a run spells, for feeding back into `beside`. */
const i0 = (s2: string) => s2;

const isUnit = (t: string) => /^\s*(ש"ח|ש״ח|%|נקודות)\s*$/.test(t);

/** Whatever a run says after the label it starts with. */
function afterPhrase(text: string, phrase: string): string {
  const n = norm(text);
  const p = norm(phrase);
  const at = n.indexOf(p);
  if (at < 0) return "";
  // Walk the original string, counting only the characters norm() keeps, so the
  // cut lands in the right place despite the spaces it removed.
  let kept = 0;
  for (let i = 0; i < text.length; i++) {
    if (norm(text[i])) kept += 1;
    if (kept === at + p.length) return text.slice(i + 1);
  }
  return "";
}

/**
 * The file-level table on page one: four labels on one line, their figures on
 * the next, matched by column rather than by order in the text.
 */
function headerFigure(items: RawItem[], phrase: string): number | null {
  const label = items.find((i) => has(i.str, phrase));
  if (!label) return null;
  const centre = label.x + label.w / 2;
  const below = items
    .filter((i) => i.y < label.y - 2 && label.y - i.y < 26 && /[\d,]+\.\d{2}/.test(i.str))
    .sort((a, b) => Math.abs(a.x + a.w / 2 - centre) - Math.abs(b.x + b.w / 2 - centre));
  return below.length ? num(below[0].str) : null;
}

export function parseMizrahi(pages: RawPage[], dataPages: number[]): BankStatement {
  const warnings: string[] = [];
  const head = pageLines(pages[0], 5);
  const headText = head.map((l) => l.text).join("\n");

  const fileNo = headText.match(/מס'\s*תיק\s*:?\s*(\d{6,12})/) ?? headText.match(/(\d{9})\s*$/m);
  const asOf = date(
    (headText.match(/נכונים לתחילת יום עסקים\s*(\d{1,2}\/\d{1,2}\/\d{4})/) ?? [])[1] ??
      (headText.match(/(\d{4})\s*\/\s*(\d{2})\s*\/\s*(\d{2})/) ?? []).slice(1).reverse().join("/") ??
      ""
  );
  const asOfDate = toDate(asOf);

  // "לכבוד" then one line per borrower.
  const atFor = head.findIndex((l) => has(l.text, "לכבוד"));
  const names: string[] = [];
  for (let i = atFor + 1; i < head.length && i <= atFor + 3; i++) {
    const t = clean(head[i].text);
    if (!t || has(t, "הנדון") || /\d{4}/.test(t)) break;
    names.push(t);
  }

  const purpose = clean((headText.match(/מטרת הלוואה\s*(.+)/) ?? [])[1] ?? "");
  const loanNumber = fileNo?.[1] ?? "";

  const tranches: BankTranche[] = [];

  dataPages.forEach((pageNo, idx) => {
    const page = pages.find((p) => p.page === pageNo);
    if (!page) return;

    // Split first: whole lines interleave the two columns.
    const left = { ...page, items: page.items.filter((i: RawItem) => i.x < SPLIT_X) };
    const right = { ...page, items: page.items.filter((i: RawItem) => i.x >= SPLIT_X) };
    const G = (k: string) => beside(right.items, k);
    const P = (k: string) => beside(left.items, k);

    const principal = num(P("יתרת הקרן"));
    const indexation = num(P("הפרשי הצמדה על הקרן"));
    // "סכום הסילוק" / "בחלק זה של ההלוואה:" — the figure is beside the second line.
    const payoff = num(P("בחלק זה של ההלוואה")) ?? num(P("סכום הסילוק"));
    const balance = (principal ?? 0) + (indexation ?? 0);
    if (!balance || balance <= 0) return;

    // The part-number box printed beside this cell leaves stray "0 0" runs in
    // front of the description.
    const trackName = clean(readTrackName(page.items).replace(/^[\d\s]+/, ""));
    const { kind, linkage, resetMonths } = readTrack(trackName, G("סוג הריבית"), G("סוג ההצמדה"));
    const endDate = date(G("תאריך סיום חלק זה של ההלוואה"));
    const to = toDate(endDate);

    // The pricing block straddles the column split — its labels sit at x≈390-420
    // and its drawdown figures at x≈261 — so it is read from the whole page.
    const priced = readAnchorBlock(page.items);

    const rate =
      pct(besideExact(right.items, "שיעור הריבית בחלק זה:")) ??
      pct(besideExact(right.items, "שיעור הריבית:"));

    // Anchor + margin must reproduce the rate the borrower pays. The lender
    // prints all three, so this is not a plausibility check but a proof that the
    // two columns were told apart — swap them and a prime tranche reads 4.75%
    // when it is 6.00%, which reconciles against nothing.
    if (priced.rate !== null && priced.margin !== null && rate !== null) {
      const gap = Math.abs(priced.rate + priced.margin - rate);
      if (gap > 0.02) {
        warnings.push(
          `חלק ${idx + 1}: עוגן ${priced.rate}% + מרווח ${priced.margin}% אינם מסתכמים לריבית המודפסת ${rate}% (פער ${gap.toFixed(2)}) — יש לוודא מול התדפיס.`
        );
      }
    }

    const fees = [
      { label: "עמלת אי הודעה", amount: num(P("עמלת אי הודעה")) },
      { label: "פיצוי מדד", amount: num(P("פיצוי מדד")) },
      { label: "הפרשי היוון", amount: num(P("הפרשי היוון")) },
    ].filter((f): f is { label: string; amount: number } => f.amount !== null && f.amount > 0);

    tranches.push({
      uid: `${loanNumber}#${idx + 1}`,
      loanNumber,
      trancheNumber: String(idx + 1),
      rawTrack: trackName,
      rateKind: kind,
      linkage,
      amortization: G("שיטת פרעון חלק זה בהלוואה"),
      purpose,
      principal,
      indexation,
      accruedInterest: num(P("ריבית")),
      arrears: null,
      balance,
      payoff,
      originalAmount: num(G("סכום חלק זה בעת הביצוע")),
      monthly: num(G("סכום החיוב החודשי בגין חלק זה")) ?? num(G("החיוב החודשי בגין חלק זה")),
      rate,
      effectiveRate:
        pct(besideExact(right.items, "שיעור הריבית המתואמת:")) ??
        pct(besideExact(right.items, "המתואמת:")),
      forecastRate: pct(G("הריבית הכוללת החזויה")),
      comparisonRate: pct(G("שיעור הריבית לצרכי השוואה")),
      // Only what follows "על בסיס" is an anchor, and only up to the comma: the
      // sentence carries on into linkage and a product code
      // ("על בסיס הפריים,לא צמוד,לפי ריבית ב"י,1.22"), none of which names the
      // anchor. Where there is no such clause it is describing the track and
      // nothing else — returning the whole sentence put
      // "לא צמוד, ריבית פריים, שפיצר" in the עוגן column.
      anchor: clean((trackName.match(/על בסיס\s*([^,]+)/) ?? ["", ""])[1]),
      anchorRate: priced.rate,
      margin: priced.margin,
      // The printed cycle beats the one inferred from the track sentence: the
      // sentence describes the product ("כל 1,2.5,5 שנים" — the options the
      // tranche could have been struck on), while תדירות שינוי הריבית states
      // the one it actually runs on. That tranche resets every 30 months.
      resetMonths: priced.resetMonths ?? resetMonths,
      nextReset: priced.nextReset,
      startDate: date(G("תאריך הביצוע")),
      firstPaymentDate: date(G("תאריך חיוב ראשון")),
      endDate,
      months: asOfDate && to ? monthsBetween(asOfDate, to) : null,
      monthsDerived: true,
      baseIndex: num(G("מדד הבסיס לחישוב ההצמדה")),
      currentIndex: null,
      breakFee: num(P('סה"כ עמלת פרעון מוקדם')),
      breakFeeParts: fees,
    });
  });

  if (!tranches.length) warnings.push("לא נמצאו חלקי הלוואה בתדפיס.");
  // The bank prints the whole-file position on page 1; a gap means a חלק page
  // was missed rather than that the arithmetic is wrong.
  const printedPayoff = headerFigure(pages[0].items, "היתרה לסילוק בתיק");
  const sumPayoff = tranches.reduce((s, t) => s + (t.payoff ?? 0), 0);
  // A small gap is the file-level operational fee, which this lender adds to the
  // whole-file position without attributing it to any one חלק. A large one means
  // a חלק page really was missed, and those are different problems.
  if (printedPayoff) {
    const gap = printedPayoff - sumPayoff;
    if (Math.abs(gap) > Math.max(200, printedPayoff * 0.005)) {
      warnings.push(
        `היתרה לסילוק בתיק המודפסת (${Math.round(printedPayoff).toLocaleString("en-US")} ₪) שונה מסכום החלקים ב-${Math.round(gap).toLocaleString("en-US")} ₪ — ייתכן שלא כל עמודי החלקים נקראו.`
      );
    } else if (Math.abs(gap) > 1) {
      warnings.push(
        `היתרה לסילוק בתיק כוללת עמלה תפעולית של ${Math.round(gap).toLocaleString("en-US")} ₪ ברמת התיק, שאינה משויכת לחלק.`
      );
    }
  }

  // This lender names the fee only in its explanatory pages ("תשלום חד פעמי שלא
  // יעלה על ₪ 60 … בגין העלות התפעולית"), never as a field. The residual between
  // its printed file payoff and the sum of the parts IS that fee, and the cap
  // stated in the document is what makes the identification safe rather than a
  // guess: anything larger is a missed page and is reported as one.
  const residual = printedPayoff ? Math.round((printedPayoff - sumPayoff) * 100) / 100 : 0;
  const operationalFee = residual > 0 && residual <= 200 ? residual : null;

  const loan: BankLoan = {
    loanNumber,
    purpose,
    tranches,
    printed: {
      balance: null,
      payoff: printedPayoff,
      monthly: headerFigure(pages[0].items, "ההחזר החודשי"),
      breakFee: null,
      forecastRate: null,
      operationalFee,
    },
  };

  return {
    bank: "mizrahi",
    bankLabel: BANK_LABEL.mizrahi,
    template: "mizrahi/full-payoff",
    statementDate: asOf,
    client: { name: names.join(", "), idNumber: "", address: "" },
    accountNumber: loanNumber,
    loans: tranches.length ? [loan] : [],
    tranches,
    totals: {
      balance: tranches.reduce((s, t) => s + (t.balance ?? 0), 0),
      payoff: sumPayoff,
      monthly: tranches.reduce((s, t) => s + (t.monthly ?? 0), 0),
      breakFee: tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0) + (operationalFee ?? 0),
    },
    warnings,
  };
}

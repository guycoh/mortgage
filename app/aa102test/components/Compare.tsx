"use client";

// Head-to-head between the active mix and one other.
//
// WHAT THIS ANSWERS, IN ORDER: is this one cheaper, by how much, and where does
// the difference come from. The verdict states the first two in a sentence; the
// ledger under it answers the third, one metric at a time.
//
// IT USED TO BE TWO PANELS SIDE BY SIDE — a four-column table on one half and an
// ECharts diverging bar chart on the other — which meant the shekel difference
// and the percentage difference for the same row lived in two coordinate spaces
// 600px apart, and reading one row meant finding its label twice. The magnitude
// is drawn INSIDE the row now, scaled by percentage so a ₪13k line and a ₪1.6M
// line are comparable, with the shekels stated beside it. One place, both units,
// no correlation work.
//
// NOT EVERY ROW HAS A WINNER. סכום המשכנתא and סך הקרן are the size of the loan,
// not the price of it: borrowing less is a different mortgage, not a cheaper
// one, and painting it green is the kind of help that gets someone the wrong
// product. Only the five cost metrics carry a verdict colour. And when the two
// sides are not the same size, the totals are not like for like — the ledger
// says so, and points at the one row that is scale-free.

import { ArrowDown, ArrowUp, Scales } from "@phosphor-icons/react";
import {
  calculateMixFullTotals,
  type MixFullTotals,
} from "@/app/private/crm/leads/simulators/components/calculate/mixScheduleCalculators";
import Money from "./Money";
import { owedOnly, type ImportedLoan } from "../lib/credit";

type Mix = { id: string; mix_name: string; loans?: ImportedLoan[] };

/**
 * `cost` — lower is better, and the row says so in colour.
 * `scale` — the size of the loan. A difference here is a fact, not a verdict.
 */
type Metric = {
  label: string;
  field: string;
  kind: "cost" | "scale";
  /** Not a currency — a cost-per-shekel ratio, formatted and signed differently. */
  ratio?: boolean;
};

const ROWS: Metric[] = [
  { label: "סכום המשכנתא", field: "originalLoanAmount", kind: "scale" },
  { label: "סך הקרן", field: "totalPrincipal", kind: "scale" },
  { label: "סך הריבית", field: "totalInterest", kind: "cost" },
  { label: "תשלום ראשון", field: "firstPayment", kind: "cost" },
  { label: "תשלום השיא", field: "maxPayment", kind: "cost" },
  { label: "עלות כוללת", field: "totalPayment", kind: "cost" },
  { label: "עלות לשקל", field: "costPerShekel", kind: "cost", ratio: true },
];

const ratio = (v: number) => (isFinite(v) ? v.toFixed(2) : "0.00");

export default function Compare({
  activeMixId,
  compareMixId,
  mixes,
  annualInflation = 0,
  /** The picker lives in this section's own header — see the note in Simulator. */
  control,
  onDuplicate,
}: {
  activeMixId: string | null;
  compareMixId: string | null;
  mixes: Mix[];
  annualInflation?: number;
  control?: React.ReactNode;
  onDuplicate?: () => void;
}) {
  const activeMix = mixes.find((m) => m.id === activeMixId);
  const compareMix = compareMixId ? mixes.find((m) => m.id === compareMixId) : null;

  const shell = (body: React.ReactNode, head: React.ReactNode = null) => (
    <section className="lgr-card lgr-cmp mt-5 overflow-hidden">
      <header className="lgr-head">
        <h2 className="lgr-title">השוואת תמהילים</h2>
        {head}
        <div className="ms-auto">{control}</div>
      </header>
      {body}
    </section>
  );

  if (!activeMix) return shell(<div className="lgr-empty">בחרו תמהיל להצגה.</div>);
  if (!owedOnly(activeMix.loans ?? []).length)
    return shell(
      <div className="lgr-empty">אין נתונים להשוואה — הזינו סכומים בתמהיל או גררו דוח.</div>
    );

  // NOTHING TO COMPARE AGAINST. An empty state that names the missing thing and
  // hands over the one action that creates it, rather than a shrug.
  if (mixes.length < 2)
    return shell(
      <div className="lgr-cmp-blank">
        <Scales size={26} weight="duotone" style={{ color: "var(--lgr-4)" }} />
        <p>
          יש תמהיל אחד בלבד על הבורד.
          <br />
          שכפלו אותו כדי לערוך גרסה חלופית ולראות את ההפרש, שורה מול שורה.
        </p>
        {onDuplicate && (
          <button className="lgr-btn lgr-btn-sm" onClick={onDuplicate}>
            שכפול התמהיל
          </button>
        )}
      </div>
    );

  // The client's own debts on both sides. A guarantee is somebody else's loan,
  // so counting it here would make one mix look dearer than another purely
  // because a spouse's cousin borrowed money. See isSurety in lib/credit.
  const active: MixFullTotals = calculateMixFullTotals(owedOnly(activeMix.loans ?? []), annualInflation);
  const otherRows = compareMix ? owedOnly(compareMix.loans ?? []) : [];
  const other: MixFullTotals | null = otherRows.length
    ? calculateMixFullTotals(otherRows, annualInflation)
    : null;

  if (!other || !compareMix)
    return shell(
      <div className="lgr-cmp-blank">
        <Scales size={26} weight="duotone" style={{ color: "var(--lgr-4)" }} />
        <p>
          בחרו תמהיל להשוואה בבורר שבראש הכרטיס.
          <br />
          כאן יופיע ההפרש — בשקלים ובאחוזים — שורה מול שורה.
        </p>
      </div>
    );

  const valueOf = (t: MixFullTotals | null, field: string) => {
    if (!t) return 0;
    if (field === "costPerShekel")
      return t.originalLoanAmount ? t.totalPayment / t.originalLoanAmount : 0;
    return (t[field as keyof MixFullTotals] as number) || 0;
  };

  const rows = ROWS.map((r) => {
    const a = valueOf(active, r.field);
    const b = valueOf(other, r.field);
    // Round before judging. Two mixes with an identical principal still differ
    // by a float epsilon, which rendered as a red "+₪0".
    const diff = r.ratio ? a - b : Math.round(a) - Math.round(b);
    const pct = b ? (diff / Math.abs(b)) * 100 : 0;
    return { ...r, a, b, diff, pct };
  });

  // ONE SCALE FOR EVERY BAR, AND IT IS PERCENTAGE. The metrics run from ₪13k to
  // ₪2.8M, so an absolute scale draws תשלום ראשון as nothing at all. The share
  // each row moved is scale-free and is the thing being decided anyway.
  const widest = Math.max(...rows.map((r) => Math.abs(r.pct)), 0.001);

  const totalDiff = rows.find((r) => r.field === "totalPayment")!.diff;
  const monthlyDiff = rows.find((r) => r.field === "firstPayment")!.diff;
  // Same money borrowed on both sides? If not, "cheaper" is comparing a
  // mortgage to a different mortgage, and only עלות לשקל survives that.
  const sameScale =
    Math.round(valueOf(active, "originalLoanAmount")) === Math.round(valueOf(other, "originalLoanAmount"));

  const tone = totalDiff < 0 ? "pos" : totalDiff > 0 ? "neg" : "flat";
  const Verdict = totalDiff < 0 ? ArrowDown : ArrowUp;

  return shell(
    <>
      {/* ------------------------------------------------------- the verdict */}
      {/* A SENTENCE, NOT A TILE. The answer to "which one" is one clause long,
          and the figure belongs inside the clause that qualifies it — a big
          number floating over a small caption would say the same thing with
          more furniture and less meaning. */}
      <div className="lgr-cmp-verdict" data-tone={tone}>
        {tone !== "flat" && (
          <span className="lgr-cmp-verdict-ico" aria-hidden>
            <Verdict size={15} weight="bold" />
          </span>
        )}
        <p className="lgr-cmp-verdict-line">
          {tone === "flat" ? (
            <>שני התמהילים עולים אותו הדבר לאורך חיי ההלוואה.</>
          ) : (
            <>
              התמהיל הנוכחי {totalDiff < 0 ? "זול ב־" : "יקר ב־"}
              <Money
                value={Math.abs(totalDiff)}
                block={false}
                weight={700}
                className="lgr-cmp-verdict-fig"
              />{" "}
              לאורך כל חיי ההלוואה, מול {compareMix.mix_name}
              {Math.round(monthlyDiff) !== 0 && (
                <>
                  {" — ו־"}
                  <Money value={Math.abs(monthlyDiff)} block={false} weight={700} />{" "}
                  {monthlyDiff < 0 ? "פחות" : "יותר"} בתשלום הראשון
                </>
              )}
              .
            </>
          )}
        </p>
        {!sameScale && (
          <p className="lgr-cmp-caveat">
            שימו לב: הסכומים הנלווים אינם זהים, כך שהעלות הכוללת אינה השוואה שוות־ערך.
            השורה שכן — <b>עלות לשקל</b>.
          </p>
        )}
      </div>

      {/* -------------------------------------------------------- the ledger */}
      <div className="lgr-scroll overflow-x-auto">
        <table className="lgr-table lgr-cmp-table w-full table-fixed">
          {/* The two mix columns get real room: these are names people typed,
              and "משכנתא נוכחית · יונס חורשיד" truncated to eleven characters is
              a column nobody can read. */}
          <colgroup>
            <col style={{ width: "24%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "32%" }} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th className="truncate" data-side="active">
                {activeMix.mix_name}
              </th>
              <th className="truncate">{compareMix.mix_name}</th>
              <th>הפרש</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const verdictRow = row.kind === "cost";
              const color =
                !verdictRow || row.diff === 0
                  ? "var(--lgr-3)"
                  : row.diff < 0
                    ? "var(--pos)"
                    : "var(--neg)";
              const Dir = row.diff < 0 ? ArrowDown : ArrowUp;

              return (
                <tr key={row.field} className="lgr-cmp-row">
                  <td className="lgr-cmp-label">
                    {row.label}
                    {row.ratio && <em>₪ לכל ₪1 שנלווה</em>}
                  </td>
                  <td>
                    {row.ratio ? (
                      <span className="lgr-money lgr-money-block font-bold">{ratio(row.a)}</span>
                    ) : (
                      <Money value={row.a} weight={700} />
                    )}
                  </td>
                  <td>
                    {row.ratio ? (
                      <span className="lgr-money lgr-money-block" style={{ color: "var(--lgr-3)" }}>
                        {ratio(row.b)}
                      </span>
                    ) : (
                      <Money value={row.b} color="var(--lgr-3)" />
                    )}
                  </td>

                  {/* THE DIFFERENCE, WITH ITS SIZE DRAWN UNDER IT. Direction is
                      an arrow as well as a colour — a red and a green figure are
                      the same figure to a deuteranope, and this column is the
                      one that decides. */}
                  <td>
                    <div className="lgr-cmp-delta">
                      <span className="lgr-cmp-delta-fig" style={{ color }}>
                        {row.diff !== 0 && verdictRow && (
                          <Dir size={12} weight="bold" aria-hidden />
                        )}
                        {row.ratio ? (
                          <span className="lgr-money">
                            {row.diff > 0 ? "+" : row.diff < 0 ? "−" : ""}
                            {ratio(Math.abs(row.diff))}
                          </span>
                        ) : (
                          <Money value={row.diff} sign weight={700} color={color} block={false} />
                        )}
                        {row.diff !== 0 && (
                          <em className="lgr-cmp-delta-pct">{Math.abs(row.pct).toFixed(1)}%</em>
                        )}
                      </span>
                      <span className="lgr-cmp-bar" aria-hidden>
                        <span
                          style={{
                            transform: `scaleX(${Math.min(1, Math.abs(row.pct) / widest)})`,
                            background: color,
                          }}
                        />
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

"use client";

// השוואת תמהילים — SmartNPV's טבלה משווה, read as a decision.
//
// ONE QUESTION, ANSWERED IN THREE DEPTHS.
//   1. The verdict: which mix costs less beyond the loan, by how much — a
//      sentence, and under it the one drawing on this card: each mix as a single
//      bar of what is paid back, principal and then interest-and-linkage, on
//      one scale. The difference is the gap between the two bar ends.
//   2. The ledger: SmartNPV's figures, defined as SmartNPV defines them (see
//      lib/compare-metrics), grouped by what they are about — עלות, תזרים,
//      היקף. The difference column carries the verdict in colour, an arrow AND a
//      word; size rows stay neutral, because borrowing less is a different
//      mortgage, not a cheaper one.
//   3. A moment in time: בעוד 5/10/15/20 שנים — the payment then, what is
//      still owed, and what has been paid so far that was not principal.
//      SmartNPV asks for a payment number; years are how a client asks.
//
// Every figure is on the board's forecast (or flat, when the switch is off) —
// the same pricing as לוח סילוקין מאוחד and the charts. The mix colours are the
// charts' own: violet solid for this mix, warm red dashed for the other.

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Scales } from "@phosphor-icons/react";
import Money from "./Money";
import { owedOnly, type ImportedLoan } from "../lib/credit";
import { asEcon, type Assume } from "../lib/price";
import { atPayment, mixFigures, type MixFigures } from "../lib/compare-metrics";

type Mix = { id: string; mix_name: string; is_base?: boolean; loans?: ImportedLoan[] };

type Better = "lower" | "none";
type Row = {
  key: string;
  label: string;
  /** Hover text: the definition, never on the face of the card. */
  def: string;
  better: Better;
  kind: "money" | "pct" | "ratio" | "years";
  get: (f: MixFigures) => number | null;
  note?: (f: MixFigures) => string | null;
};

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "עלות",
    rows: [
      { key: "cost", label: "תשלומי ריבית והצמדה", def: "סך התשלומים פחות הקרן", better: "lower", kind: "money", get: (f) => f.cost },
      { key: "total", label: "עלות כוללת", def: "סך כל התשלומים לאורך חיי התמהיל", better: "lower", kind: "money", get: (f) => f.totalPaid },
      { key: "per", label: "החזר לשקל", def: "כמה שקלים מוחזרים על כל שקל שנלווה", better: "lower", kind: "ratio", get: (f) => f.perShekel },
      { key: "irr", label: 'שת"פ', def: "שיעור התשואה הפנימי של התשלומים, שנתי אפקטיבי", better: "lower", kind: "pct", get: (f) => f.irr },
      { key: "npv", label: 'ענ"נ', def: "ערך נוכחי של התשלומים, מהוון לאורך עקום הריבית, פחות הקרן", better: "lower", kind: "money", get: (f) => f.npv },
      {
        key: "spread",
        label: 'מרווח מעל אג"ח',
        def: "המרווח הקבוע מעל עקום הריבית הממשלתי שבו שווי התשלומים שווה לקרן",
        better: "lower",
        kind: "pct",
        get: (f) => f.spread,
      },
    ],
  },
  {
    title: "תזרים",
    rows: [
      { key: "first", label: "החזר ראשון", def: "התשלום בחודש הראשון לפי הריביות שהוזנו", better: "lower", kind: "money", get: (f) => f.firstTyped },
      {
        key: "peak",
        label: "החזר בשיא",
        def: "התשלום החודשי הגבוה ביותר לפי התחזית",
        better: "lower",
        kind: "money",
        get: (f) => f.peak,
        note: (f) => `בשנה ${f.peakYear}`,
      },
      { key: "term", label: "תקופה", def: "החודש האחרון בתמהיל, בשנים", better: "none", kind: "years", get: (f) => f.months / 12 },
      { key: "dur", label: 'מח"מ', def: "משך החיים הממוצע של התשלומים, משוקלל לפי סכומם", better: "none", kind: "years", get: (f) => f.duration },
    ],
  },
  {
    title: "היקף",
    rows: [{ key: "amount", label: "סכום ההלוואה", def: "סך יתרות השורות בתמהיל", better: "none", kind: "money", get: (f) => f.principal }],
  },
];

const HORIZONS = [5, 10, 15, 20];

const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtRatio = (v: number) => v.toFixed(2);
const fmtYears = (v: number) => v.toFixed(1);

function Figure({ kind, value, dim }: { kind: Row["kind"]; value: number | null; dim?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="lgr-cmx-na">—</span>;
  if (kind === "money") return <Money value={value} weight={dim ? 600 : 700} color={dim ? "var(--lgr-2)" : undefined} />;
  const text = kind === "pct" ? fmtPct(value) : kind === "ratio" ? fmtRatio(value) : fmtYears(value);
  return (
    <span className="lgr-cmx-num" data-dim={dim || undefined}>
      {text}
    </span>
  );
}

function Delta({ kind, a, b, better }: { kind: Row["kind"]; a: number | null; b: number | null; better: Better }) {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return <span className="lgr-cmx-na">—</span>;
  const raw = a - b;
  const eps = kind === "money" ? 0.5 : 0.005;
  if (Math.abs(raw) < eps) return <span className="lgr-cmx-same">זהה</span>;
  const tone = better === "none" ? "flat" : raw < 0 ? "good" : "bad";
  const Dir = raw < 0 ? ArrowDown : ArrowUp;
  const mag =
    kind === "money" ? (
      <Money value={Math.abs(raw)} block={false} weight={700} />
    ) : kind === "pct" ? (
      fmtPct(Math.abs(raw))
    ) : kind === "ratio" ? (
      fmtRatio(Math.abs(raw))
    ) : (
      `${fmtYears(Math.abs(raw))} שנ׳`
    );
  return (
    <span className="lgr-cmx-delta" data-tone={tone}>
      <Dir size={11} weight="bold" aria-hidden />
      <span className="lgr-cmx-delta-mag">{mag}</span>
      <em>{raw < 0 ? "פחות" : "יותר"}</em>
    </span>
  );
}

/** One mix as one bar: principal, then the cost on top, on a shared scale. */
function CostBar({ f, max, side, name }: { f: MixFigures; max: number; side: "a" | "b"; name: string }) {
  const p = (f.principal / max) * 100;
  const c = (Math.max(0, f.cost) / max) * 100;
  return (
    <div className="lgr-cmx-bar" data-side={side}>
      <span className="lgr-cmx-bar-name" title={name}>
        <i aria-hidden />
        {name}
      </span>
      <span className="lgr-cmx-bar-track" role="img" aria-label={`${name}: קרן ועוד ריבית והצמדה`}>
        <span className="lgr-cmx-bar-p" style={{ width: `${p}%` }} />
        <span className="lgr-cmx-bar-c" style={{ width: `${c}%` }} />
      </span>
      <span className="lgr-cmx-bar-fig">
        <Money value={f.cost} block={false} weight={700} />
      </span>
    </div>
  );
}

export default function Compare({
  activeMixId,
  compareMixId,
  mixes,
  annualInflation = 0,
  discountRate = 4.5,
  source,
  control,
  onDuplicate,
}: {
  activeMixId: string | null;
  /** The other mix. null = automatic (the master, or the first other mix); "" = none. */
  compareMixId: string | null;
  mixes: Mix[];
  /** The board's pricing — the forecast set, or a bare inflation % (flat). */
  annualInflation?: Assume;
  /** ענ"נ's discount rate when there is no forecast curve to discount along. */
  discountRate?: number;
  /** The forecast source chip, rendered in the header. */
  source?: ReactNode;
  control?: ReactNode;
  onDuplicate?: () => void;
}) {
  const [years, setYears] = useState(10);

  const activeMix = mixes.find((m) => m.id === activeMixId) ?? null;
  const master = mixes.find((m) => m.is_base) ?? mixes[0] ?? null;
  const autoOther =
    compareMixId !== null
      ? null
      : master && master.id !== activeMixId
        ? master
        : (mixes.find((m) => m.id !== activeMixId) ?? null);
  const otherMix = compareMixId ? (mixes.find((m) => m.id === compareMixId) ?? null) : autoOther;

  const A = useMemo(
    () => (activeMix ? mixFigures(owedOnly(activeMix.loans ?? []), annualInflation, discountRate) : null),
    [activeMix, annualInflation, discountRate]
  );
  const B = useMemo(
    () =>
      otherMix && otherMix.id !== activeMix?.id
        ? mixFigures(owedOnly(otherMix.loans ?? []), annualInflation, discountRate)
        : null,
    [otherMix, activeMix, annualInflation, discountRate]
  );

  const shell = (body: ReactNode) => (
    <section className="lgr-card lgr-cmx mt-5">
      <header className="lgr-head lgr-cmx-head">
        <h2 className="lgr-title">השוואת תמהילים</h2>
        {activeMix && control && (
          <span className="lgr-cmx-pair">
            <span className="lgr-cmx-tag" data-side="a" title={activeMix.mix_name}>
              <i aria-hidden />
              <span className="lgr-cmx-tag-name">{activeMix.mix_name}</span>
            </span>
            <span className="lgr-cmx-vs">מול</span>
            {control}
          </span>
        )}
        {source && <div className="ms-auto">{source}</div>}
      </header>
      {body}
    </section>
  );

  if (!activeMix) return shell(<div className="lgr-empty">בחרו תמהיל להצגה.</div>);
  if (!A) return shell(<div className="lgr-empty">אין נתונים להשוואה — הזינו סכומים ותקופות בתמהיל או גררו דוח.</div>);

  if (mixes.length < 2)
    return shell(
      <div className="lgr-cmp-blank">
        <Scales size={26} weight="duotone" style={{ color: "var(--lgr-4)" }} />
        <p>
          יש תמהיל אחד בלבד על הבורד.
          <br />
          שכפלו אותו כדי לבנות חלופה ולראות את ההפרש בכל מדד.
        </p>
        {onDuplicate && (
          <button className="lgr-btn lgr-btn-sm" onClick={onDuplicate}>
            שכפול התמהיל
          </button>
        )}
      </div>
    );

  if (!B || !otherMix)
    return shell(
      <div className="lgr-cmp-blank">
        <Scales size={26} weight="duotone" style={{ color: "var(--lgr-4)" }} />
        <p>{otherMix ? `אין נתונים ב${otherMix.mix_name} להשוואה.` : "בחרו תמהיל להשוואה בבורר שבראש הכרטיס."}</p>
      </div>
    );

  const saving = B.cost - A.cost;
  const tone = Math.abs(saving) < 1 ? "flat" : saving > 0 ? "good" : "bad";
  const pctLess = B.cost > 0 ? (saving / B.cost) * 100 : 0;
  const max = Math.max(A.principal + Math.max(0, A.cost), B.principal + Math.max(0, B.cost), 1);
  const sameScale = Math.abs(A.principal - B.principal) < 1;
  const flat = !asEcon(annualInflation).forecast;

  const n = Math.min(years * 12, Math.max(A.months, B.months));
  const atA = atPayment(A, n);
  const atB = atPayment(B, n);
  const live = (f: MixFigures) => n <= f.months;
  const atRows: { label: string; a: number; b: number; better: Better }[] = [
    { label: "החזר חודשי", a: live(A) ? atA.payment : 0, b: live(B) ? atB.payment : 0, better: "lower" },
    { label: "יתרת החוב", a: live(A) ? atA.balance : 0, b: live(B) ? atB.balance : 0, better: "none" },
    { label: "ירידת הקרן עד אז", a: atA.retired, b: atB.retired, better: "none" },
    { label: "ריבית והצמדה ששולמו עד אז", a: atA.costSoFar, b: atB.costSoFar, better: "lower" },
  ];

  const cols = (
    <colgroup>
      <col style={{ width: "28%" }} />
      <col style={{ width: "22%" }} />
      <col style={{ width: "22%" }} />
      <col style={{ width: "28%" }} />
    </colgroup>
  );

  return shell(
    <>
      {/* ---------------------------------------------------------- verdict */}
      <div className="lgr-cmx-verdict" data-tone={tone}>
        <p className="lgr-cmx-line">
          {tone === "flat" ? (
            <>שני התמהילים עולים אותו הדבר בריבית ובהצמדה.</>
          ) : (
            <>
              <span className="lgr-cmx-line-name">{activeMix.mix_name}</span>
              {saving > 0 ? " חוסך " : " מוסיף "}
              <Money value={Math.abs(saving)} block={false} weight={800} className="lgr-cmx-line-fig" />
              {" בריבית ובהצמדה"}
              <span className="lgr-cmx-line-pct">
                {Math.abs(pctLess).toFixed(0)}% {saving > 0 ? "פחות" : "יותר"}
              </span>
            </>
          )}
        </p>
        <div className="lgr-cmx-bars">
          <CostBar f={A} max={max} side="a" name={activeMix.mix_name} />
          <CostBar f={B} max={max} side="b" name={otherMix.mix_name} />
          <div className="lgr-cmx-bars-key" aria-hidden>
            <span>
              <i data-k="p" />
              קרן
            </span>
            <span>
              <i data-k="c" />
              ריבית והצמדה
            </span>
          </div>
        </div>
        {!sameScale && (
          <p className="lgr-cmx-caveat">
            הסכומים שנלווים אינם זהים — המדד שמשווה ביניהם בהגינות הוא <b>החזר לשקל</b>.
          </p>
        )}
      </div>

      {/* ----------------------------------------------------------- ledger */}
      <table className="lgr-cmx-table">
        {cols}
        <thead>
          <tr>
            <th />
            <th>
              <span className="lgr-cmx-tag" data-side="a" title={activeMix.mix_name}>
                <i aria-hidden />
                <span className="lgr-cmx-tag-name">{activeMix.mix_name}</span>
              </span>
            </th>
            <th>
              <span className="lgr-cmx-tag" data-side="b" title={otherMix.mix_name}>
                <i aria-hidden />
                <span className="lgr-cmx-tag-name">{otherMix.mix_name}</span>
              </span>
            </th>
            <th>הפרש</th>
          </tr>
        </thead>
        {GROUPS.map((g) => (
          <tbody key={g.title}>
            <tr className="lgr-cmx-group">
              <th colSpan={4} scope="rowgroup">
                {g.title}
              </th>
            </tr>
            {g.rows.map((r) => {
              const a = r.get(A);
              const b = r.get(B);
              const title = r.key === "npv" && flat ? `ערך נוכחי של התשלומים בהיוון קבוע של ${discountRate}%, פחות הקרן` : r.def;
              return (
                <tr key={r.key} className="lgr-cmx-row">
                  <th scope="row" title={title}>
                    {r.label}
                  </th>
                  <td>
                    <Figure kind={r.kind} value={a} />
                    {r.note && <em className="lgr-cmx-note">{r.note(A)}</em>}
                  </td>
                  <td>
                    <Figure kind={r.kind} value={b} dim />
                    {r.note && <em className="lgr-cmx-note">{r.note(B)}</em>}
                  </td>
                  <td>
                    <Delta kind={r.kind} a={a} b={b} better={r.better} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>

      {/* -------------------------------------------------- a moment in time */}
      <div className="lgr-cmx-at">
        <div className="lgr-cmx-at-head">
          <span>בעוד</span>
          <div className="lgr-cmx-seg" role="radiogroup" aria-label="נקודת זמן">
            {HORIZONS.map((y) => (
              <button key={y} type="button" role="radio" aria-checked={years === y} onClick={() => setYears(y)}>
                {y}
              </button>
            ))}
          </div>
          <span>שנים</span>
        </div>
        <table className="lgr-cmx-table lgr-cmx-table-at">
          {cols}
          <tbody>
            {atRows.map((r) => (
              <tr key={r.label} className="lgr-cmx-row">
                <th scope="row">{r.label}</th>
                <td>
                  <Money value={r.a} weight={700} />
                </td>
                <td>
                  <Money value={r.b} weight={600} color="var(--lgr-2)" />
                </td>
                <td>
                  <Delta kind="money" a={r.a} b={r.b} better={r.better} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

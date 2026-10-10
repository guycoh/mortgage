"use client";

// השוואת תמהילים — SmartNPV's טבלה משווה, read as a decision, in half the room.
//
// TWO PANES, NOT A FULL-WIDTH TABLE. Four columns stretched across 1,250px put
// a hand's width of nothing between every figure and the one it is compared
// with, and the card ran past a thousand pixels tall. Now:
//
//   · the VERDICT pane (where the eye lands in RTL): the saving, re-counted live
//     when anything it depends on changes; the twin cost bars; and a TIME
//     SCRUBBER — the saving accumulated year by year as a small area, with a
//     handle the advisor drags to "בעוד N שנים". The four figures under it
//     (payment then, balance, principal retired, cost so far) follow the handle.
//   · the LEDGER pane: SmartNPV's figures, tight columns, grouped עלות / תזרים /
//     היקף, each difference a coloured pill that also says פחות / יותר.
//
// Figures are defined as SmartNPV defines them (lib/compare-metrics) and run on
// the board's forecast. Mix colours are the charts': violet solid for this mix,
// warm red dashed for the other.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { ArrowDown, ArrowUp, PresentationChart, Scales } from "@phosphor-icons/react";
import Money from "./Money";
import { owedOnly, type ImportedLoan } from "../lib/credit";
import { asEcon, type Assume } from "../lib/price";
import { atPayment, mixFigures, type MixFigures } from "../lib/compare-metrics";

type Mix = { id: string; mix_name: string; is_base?: boolean; loans?: ImportedLoan[] };

type Better = "lower" | "none";
type Kind = "money" | "pct" | "ratio" | "years";
type Row = {
  key: string;
  label: string;
  /** Hover text: the definition, never on the face of the card. */
  def: string;
  better: Better;
  kind: Kind;
  get: (f: MixFigures) => number | null;
  note?: (f: MixFigures) => string | null;
};

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "עלות",
    rows: [
      { key: "cost", label: "ריבית והצמדה", def: "סך התשלומים פחות הקרן", better: "lower", kind: "money", get: (f) => f.cost },
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
        note: (f) => `שנה ${f.peakYear}`,
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

const COUNT: EffectTiming = { duration: 420, easing: "cubic-bezier(0.2, 0, 0, 1)" };

const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtRatio = (v: number) => v.toFixed(2);
const fmtYears = (v: number) => v.toFixed(1);

function Figure({ kind, value, dim }: { kind: Kind; value: number | null; dim?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="lgr-cmx-na">—</span>;
  if (kind === "money") return <Money value={value} block={false} weight={dim ? 600 : 700} color={dim ? "var(--lgr-2)" : undefined} />;
  const text = kind === "pct" ? fmtPct(value) : kind === "ratio" ? fmtRatio(value) : fmtYears(value);
  return (
    <span className="lgr-cmx-num" data-dim={dim || undefined}>
      {text}
    </span>
  );
}

function Delta({ kind, a, b, better }: { kind: Kind; a: number | null; b: number | null; better: Better }) {
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
      `${fmtYears(Math.abs(raw))} ש׳`
    );
  return (
    <span className="lgr-cmx-delta" data-tone={tone} title={raw < 0 ? "פחות" : "יותר"}>
      <Dir size={10} weight="bold" aria-hidden />
      <span className="lgr-cmx-delta-mag">{mag}</span>
    </span>
  );
}

/** One mix as one bar: principal, then the cost on top, on a shared scale. */
function CostBar({ f, max, side, name }: { f: MixFigures; max: number; side: "a" | "b"; name: string }) {
  return (
    <div className="lgr-cmx-bar" data-side={side}>
      <div className="lgr-cmx-bar-top">
        <span className="lgr-cmx-tag" data-side={side} title={name}>
          <i aria-hidden />
          <span className="lgr-cmx-tag-name">{name}</span>
        </span>
        <Money value={f.cost} block={false} weight={700} />
      </div>
      <span className="lgr-cmx-bar-track" role="img" aria-label={`${name}: קרן ועוד ריבית והצמדה`}>
        <span className="lgr-cmx-bar-p" style={{ width: `${(f.principal / max) * 100}%` }} />
        <span className="lgr-cmx-bar-c" style={{ width: `${(Math.max(0, f.cost) / max) * 100}%` }} />
      </span>
    </div>
  );
}

/**
 * The saving accumulated year by year, as a small area with a draggable year.
 * Plain SVG — 30 points do not need a chart library — on the same time axis
 * as every chart on the board: year 1 at the left, the last year at the right.
 */
function Scrubber({
  cum,
  year,
  onYear,
}: {
  cum: number[];
  year: number;
  onYear: (y: number) => void;
}) {
  const W = 340;
  const H = 74;
  const n = cum.length;
  const lo = Math.min(0, ...cum);
  const hi = Math.max(0, ...cum);
  const span = hi - lo || 1;
  const x = (i: number) => (i / Math.max(1, n - 1)) * W;
  const y = (v: number) => 6 + (1 - (v - lo) / span) * (H - 12);
  const pts = cum.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const zeroY = y(0);
  const area = `M${x(0)},${zeroY} L${pts.join(" L")} L${x(n - 1)},${zeroY} Z`;
  const line = `M${pts.join(" L")}`;
  const i = Math.min(n - 1, Math.max(0, year - 1));
  const end = cum[n - 1] ?? 0;
  const tone = end >= 0 ? "good" : "bad";

  // A plain pointer, not a resize cursor: hovering previews a year (a ghost
  // line and its figure), pressing or dragging commits it. The keyboard gets
  // the same through role="slider" and the arrow keys.
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const yearAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return Math.round(t * (n - 1)) + 1;
  };
  const h = hover !== null ? Math.min(n - 1, Math.max(0, hover - 1)) : null;
  const pct = (k: number) => `${(x(k) / W) * 100}%`;

  return (
    <div
      className="lgr-cmx-scrub"
      data-tone={tone}
      data-drag={drag || undefined}
      role="slider"
      tabIndex={0}
      aria-label="שנה"
      aria-valuemin={1}
      aria-valuemax={n}
      aria-valuenow={year}
      aria-valuetext={`שנה ${year}`}
      onPointerMove={(e) => {
        const yr = yearAt(e);
        setHover(yr);
        if (drag) onYear(yr);
      }}
      onPointerLeave={() => setHover(null)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(true);
        onYear(yearAt(e));
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setDrag(false);
      }}
      onKeyDown={(e) => {
        const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "Home" ? -n : e.key === "End" ? n : 0;
        if (!step) return;
        e.preventDefault();
        onYear(Math.min(n, Math.max(1, year + step)));
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="lgr-cmx-scrub-svg">
        <line x1="0" x2={W} y1={zeroY} y2={zeroY} className="lgr-cmx-scrub-zero" />
        <path d={area} className="lgr-cmx-scrub-area" />
        <path d={line} className="lgr-cmx-scrub-line" vectorEffect="non-scaling-stroke" />
        {h !== null && h !== i && (
          <line x1={x(h)} x2={x(h)} y1="0" y2={H} className="lgr-cmx-scrub-ghost" vectorEffect="non-scaling-stroke" />
        )}
        <line x1={x(i)} x2={x(i)} y1="0" y2={H} className="lgr-cmx-scrub-mark" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* The dot is HTML, not SVG: a preserveAspectRatio="none" drawing would
          squash a circle into an ellipse. */}
      <span className="lgr-cmx-scrub-dot" style={{ left: pct(i), top: `${(y(cum[i] ?? 0) / H) * 100}%` }} aria-hidden />
      {h !== null && h !== i && (
        <span className="lgr-cmx-scrub-peek" style={{ left: pct(h) }} aria-hidden>
          <b>שנה {h + 1}</b>
          <Money value={Math.abs(cum[h] ?? 0)} block={false} weight={700} />
        </span>
      )}
      <span className="lgr-cmx-scrub-ends" aria-hidden>
        <span>שנה 1</span>
        <span>שנה {n}</span>
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
  onShare,
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
  /** הצגה ללקוח — opens the share dialog for these two mixes. */
  onShare?: (pair: { activeId: string; otherId: string }) => void;
}) {
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

  // Cumulative saving, year by year: the other mix's cost so far minus this one's.
  const cum = useMemo(() => {
    if (!A || !B) return [];
    const years = Math.ceil(Math.max(A.months, B.months) / 12);
    return Array.from({ length: years }, (_, i) => {
      const m = (i + 1) * 12;
      return atPayment(B, m).costSoFar - atPayment(A, m).costSoFar;
    });
  }, [A, B]);
  const [year, setYear] = useState(10);
  useEffect(() => {
    if (cum.length && year > cum.length) setYear(cum.length);
  }, [cum.length, year]);

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
        <div className="ms-auto lgr-cmx-head-end">
          {onShare && A && B && activeMix && otherMix && (
            <button
              type="button"
              className="lgr-btn lgr-btn-sm lgr-cmx-share"
              onClick={() => onShare({ activeId: activeMix.id, otherId: otherMix.id })}
            >
              <PresentationChart size={15} weight="bold" />
              שיתוף עם הלקוח
            </button>
          )}
          {source}
        </div>
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
  const firstGap = B.firstTyped - A.firstTyped;
  const max = Math.max(A.principal + Math.max(0, A.cost), B.principal + Math.max(0, B.cost), 1);
  const sameScale = Math.abs(A.principal - B.principal) < 1;
  const flat = !asEcon(annualInflation).forecast;

  const n = Math.min(year * 12, Math.max(A.months, B.months));
  const atA = atPayment(A, n);
  const atB = atPayment(B, n);
  const live = (f: MixFigures) => n <= f.months;
  const atRows: { label: string; a: number; b: number; better: Better }[] = [
    { label: "החזר חודשי", a: live(A) ? atA.payment : 0, b: live(B) ? atB.payment : 0, better: "lower" },
    { label: "יתרת החוב", a: live(A) ? atA.balance : 0, b: live(B) ? atB.balance : 0, better: "none" },
    { label: "ריבית והצמדה עד אז", a: atA.costSoFar, b: atB.costSoFar, better: "lower" },
  ];

  return shell(
    <div className="lgr-cmx-body">
      {/* ------------------------------------------------- the verdict pane */}
      <aside className="lgr-cmx-side" data-tone={tone}>
        <div className="lgr-cmx-hero">
          <span className="lgr-cmx-hero-label">
            {tone === "flat" ? "אותה עלות" : saving > 0 ? "חיסכון בריבית ובהצמדה" : "תוספת בריבית ובהצמדה"}
          </span>
          <span className="lgr-cmx-hero-fig">
            <span className="lgr-cur">₪</span>
            <NumberFlow value={Math.round(Math.abs(saving))} locales="he-IL" spinTiming={COUNT} transformTiming={COUNT} />
          </span>
          <span className="lgr-cmx-hero-chips">
            {tone !== "flat" && (
              <span className="lgr-cmx-chip" data-tone={tone}>
                {Math.abs(pctLess).toFixed(0)}% {saving > 0 ? "פחות" : "יותר"}
              </span>
            )}
            {Math.abs(firstGap) >= 1 && (
              <span className="lgr-cmx-chip" data-tone={firstGap > 0 ? "good" : "bad"}>
                <Money value={Math.abs(firstGap)} block={false} weight={700} /> {firstGap > 0 ? "פחות" : "יותר"} בהחזר הראשון
              </span>
            )}
          </span>
        </div>

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

        {cum.length > 1 && (
          <div className="lgr-cmx-time">
            <div className="lgr-cmx-time-head">
              <b>
                בעוד <NumberFlow value={year} locales="he-IL" spinTiming={COUNT} /> שנים
              </b>
              <span>
                נחסכו{" "}
                <Money value={Math.abs(cum[year - 1] ?? 0)} block={false} weight={700} />
              </span>
            </div>
            <Scrubber cum={cum} year={year} onYear={setYear} />
            <dl className="lgr-cmx-time-rows">
              <div className="lgr-cmx-time-key" aria-hidden>
                <dt />
                <dd>
                  <span className="lgr-cmx-time-a">
                    <i data-side="a" />
                  </span>
                  <span className="lgr-cmx-time-b">
                    <i data-side="b" />
                  </span>
                </dd>
              </div>
              {atRows.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>
                    <span className="lgr-cmx-time-a">
                      <Money value={r.a} block={false} weight={700} />
                    </span>
                    <span className="lgr-cmx-time-b">
                      <Money value={r.b} block={false} weight={500} color="var(--lgr-3)" />
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {!sameScale && (
          <p className="lgr-cmx-caveat">
            הסכומים שנלווים אינם זהים — המדד ההוגן ביניהם הוא <b>החזר לשקל</b>.
          </p>
        )}
      </aside>

      {/* -------------------------------------------------- the ledger pane */}
      <table className="lgr-cmx-table">
        <colgroup>
          <col />
          <col style={{ width: "24%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "21%" }} />
        </colgroup>
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
              const title =
                r.key === "npv" && flat ? `ערך נוכחי של התשלומים בהיוון קבוע של ${discountRate}%, פחות הקרן` : r.def;
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
    </div>
  );
}

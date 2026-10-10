"use client";

// ניתוח משכנתא on /aa105test — the bank letter, read for what should change.
//
// Same engine and the same findings as the board's StatementAnalysisModal. The
// difference is that the two questions an advisor is paid to answer are drawn,
// not tabulated: which tracks are dear AND cheap to leave (a map of rate against
// exit fee), and what moves soon (resets on a twelve-month line). Everything
// else is evidence, as rows that fit the screen.

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Bank,
  CalendarBlank,
  ChartPieSlice,
  Coins,
  IdentificationCard,
  Receipt,
  SealCheck,
  ShieldWarning,
  Target,
  TrendUp,
} from "@phosphor-icons/react";
import { TRACK_COLOR, TRACK_LABEL, trackKey, type StatementAnalysis } from "@/lib/bank-parser/analysis";
import type { BankTranche } from "@/lib/bank-parser/types";
import { PURPOSE_LABEL } from "@/lib/bank-parser/purpose";
import { FREQ_PRIME, freqLabel } from "@/lib/rate-frequency";
import { FEE_MONTHS_OF_INTEREST_CHEAP } from "@/lib/verdicts";
import { BankIcon } from "@/app/aa102test/components/bankIcons";
import { docFromStatement } from "../lib/brief";
import { ShareTable } from "./BriefView";
import Logo from "@/app/aa102test/components/Logo";
import Stage from "./Stage";
import {
  Dash,
  Facts,
  Findings,
  Kpis,
  RateCell,
  RowList,
  Sec,
  SevCounts,
  Shekel,
  Sub,
  TermCell,
  pct,
  rate2,
  useLit,
  type FindingItem,
  type RowCol,
} from "./DeepKit";

const rateHeat = (r: number | null) => (r === null ? null : r >= 6 ? "hot" : r >= 4.5 ? "warm" : null);

/** A tranche's own name for itself, falling back to its classification. */
function trackName(t: BankTranche): string {
  const raw = (t.rawTrack || "").trim();
  if (raw) return raw.length > 52 ? `${raw.slice(0, 51)}…` : raw;
  const kind = t.rateKind === "prime" ? "פריים" : t.rateKind === "variable" ? "משתנה" : "קבועה";
  const link = t.linkage === "linked" ? "צמודה" : t.linkage === "fx" ? 'מט"ח' : "לא צמודה";
  return `${kind} ${link}`;
}

function TrancheIdent({ t }: { t: BankTranche }) {
  return (
    <span className="brf-ident">
      <i className="brf-ident-dot" style={{ background: TRACK_COLOR[trackKey(t)] ?? "#8b93a7" }} />
      <span className="brf-ident-text">
        <b title={t.rawTrack}>{trackName(t)}</b>
        {(t.balanceApportioned || (t.arrears ?? 0) > 0) && (
          <span className="brf-ident-chips">
            {(t.arrears ?? 0) > 0 && <span data-tone="neg">בפיגור ₪{(t.arrears ?? 0).toLocaleString("he-IL")}</span>}
            {t.balanceApportioned && (
              <span title="חושבה מתוך יתרת ההלוואה; אינה יתרה נפרדת שהבנק דיווח.">
                יתרה מוערכת
              </span>
            )}
          </span>
        )}
      </span>
    </span>
  );
}

/** A blank fee is "לא דווח", never "ללא" — the engine keeps the two apart, and so does every cell. */
function Fee({ t }: { t: BankTranche }) {
  if (t.breakFee === null) return <span className="brf-unrep">לא דווח</span>;
  if (t.breakFee === 0) return <span className="brf-free">ללא עמלה</span>;
  return <Shekel value={t.breakFee} />;
}

/* --------------------------------------------- the recycle map: rate × fee */

function RecycleMap({ a }: { a: StatementAnalysis }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const pts = a.recycle
    .filter((c) => c.feeInMonthsOfInterest !== null && c.tranche.rate !== null)
    .map((c) => ({ c, x: c.tranche.rate as number, y: c.feeInMonthsOfInterest as number, b: c.tranche.balance ?? 0 }));
  const missing = a.recycle.length - pts.length;
  if (!pts.length) return null;

  const W = 960;
  const H = 320;
  const P = { l: 46, r: 18, t: 18, b: 40 };
  const xs = pts.map((p) => p.x);
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - 0.6));
  const x1 = Math.ceil(Math.max(...xs, 6) + 0.4);
  const y1 = Math.max(4, Math.ceil(Math.max(...pts.map((p) => p.y)) + 1));
  const X = (v: number) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - (v / y1) * (H - P.t - P.b);
  const maxB = Math.max(...pts.map((p) => p.b), 1);
  const R = (b: number) => 7 + 17 * Math.sqrt(b / maxB);
  const cheap = FEE_MONTHS_OF_INTEREST_CHEAP;
  const dear = 4.5;
  const ticksX = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i);
  const ticksY = Array.from({ length: Math.floor(y1 / 2) + 1 }, (_, i) => i * 2);
  const hp = pts.find((p) => p.c.tranche.uid === hover);

  return (
    <figure className="brf-map">
      <div className="brf-map-plot">
        <svg viewBox={`0 0 ${W} ${H}`} direction="ltr" role="img" aria-label="ריבית מול עמלת יציאה לכל מסלול">
          {/* The corner worth a call: a dear rate that is cheap to leave. */}
          <rect x={X(Math.max(dear, x0))} y={Y(cheap)} width={Math.max(0, X(x1) - X(Math.max(dear, x0)))} height={Y(0) - Y(cheap)} className="brf-map-sweet" rx={10} />
          {ticksY.map((v) => (
            <g key={`y${v}`}>
              <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} className="brf-map-grid" />
              <text x={P.l - 10} y={Y(v) + 4} className="brf-map-tick" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {ticksX.map((v) => (
            <text key={`x${v}`} x={X(v)} y={H - P.b + 22} className="brf-map-tick" textAnchor="middle">
              {v}%
            </text>
          ))}
          <line x1={P.l} x2={W - P.r} y1={Y(cheap)} y2={Y(cheap)} className="brf-map-rule" />
          {pts.map((p, i) => (
            <motion.circle
              key={p.c.tranche.uid}
              cx={X(p.x)}
              cy={Y(p.y)}
              initial={{ r: 0 }}
              animate={{ r: R(p.b) }}
              transition={{ type: "spring", stiffness: 220, damping: 18, delay: reduce ? 0 : 0.1 + i * 0.06 }}
              fill={TRACK_COLOR[trackKey(p.c.tranche)] ?? "#8b93a7"}
              className="brf-map-dot"
              data-on={hover === p.c.tranche.uid || undefined}
              onPointerEnter={() => setHover(p.c.tranche.uid)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {hp && (
          <div className="brf-map-tip" style={{ left: `${(X(hp.x) / W) * 100}%`, top: `${(Y(hp.y) / H) * 100}%` }}>
            <b>{trackName(hp.c.tranche)}</b>
            <span>
              <Shekel value={hp.b} />, ריבית {rate2(hp.x)}
            </span>
            <span>עמלה: {hp.y === 0 ? "ללא" : `${hp.y} חודשי ריבית`}</span>
          </div>
        )}
      </div>
      <figcaption className="brf-map-key">
        {Array.from(new Set(pts.map((p) => trackKey(p.c.tranche)))).map((k) => (
          <span key={k}>
            <i style={{ background: TRACK_COLOR[k] ?? "#8b93a7", borderRadius: 999 }} />
            {TRACK_LABEL[k] ?? k}
          </span>
        ))}
        <span>
          <i data-k="sweet" />
          ריבית מ-{dear}% ועמלה עד {cheap} חודשי ריבית
        </span>
        <span>אנכי: עמלה בחודשי ריבית, אופקי: ריבית, גודל: יתרה</span>
        {missing > 0 && <span>{missing === 1 ? "מסלול אחד שלא דווחה בו עמלה אינו במפה" : `${missing} מסלולים שלא דווחה בהם עמלה אינם במפה`}</span>}
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------- resets, as the dates they fall on */

/**
 * Each date a rate is reset, with what resets on it. Tracks of one loan usually
 * share the date, so they are said once under it rather than drawn as dots that
 * land on top of each other.
 */
function ResetDates({ a, lit }: { a: StatementAnalysis; lit?: Set<string> }) {
  const parse = (d: string) => {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(d || "");
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  };
  const from = parse(a.statement.statementDate) ?? new Date();
  const byDate = new Map<string, { d: Date; items: BankTranche[] }>();
  for (const t of a.upcomingResets) {
    const d = parse(t.nextReset);
    if (!d) continue;
    const k = t.nextReset;
    byDate.set(k, { d, items: [...(byDate.get(k)?.items ?? []), t] });
  }
  const dates = Array.from(byDate.values()).sort((x, y) => x.d.getTime() - y.d.getTime());
  if (!dates.length) return null;
  const inMonths = (d: Date) => Math.max(0, (d.getFullYear() - from.getFullYear()) * 12 + d.getMonth() - from.getMonth());
  return (
    <ol className="brf-rd">
      {dates.map(({ d, items }) => {
        const n = inMonths(d);
        const sum = items.reduce((s, t) => s + (t.balance ?? 0), 0);
        return (
          <li key={d.toISOString()} className="brf-rd-row">
            <div className="brf-rd-date">
              <b className="brf-num">{`${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`}</b>
              <span className="brf-num">{d.getFullYear()}</span>
              <em>{n === 0 ? "החודש" : n === 1 ? "בעוד חודש" : `בעוד ${n} חודשים`}</em>
            </div>
            <ul className="brf-rd-items">
              {items.map((t) => (
                <li key={t.uid} data-lit={lit?.has(t.uid) || undefined}>
                  <i style={{ background: TRACK_COLOR[trackKey(t)] ?? "#8b93a7" }} />
                  <span className="brf-rd-name">{trackName(t)}</span>
                  <span className="brf-rd-rate">{t.rate !== null ? `ריבית כיום ${rate2(t.rate)}` : ""}</span>
                  <span className="brf-rd-freq">{freqLabel(t.resetMonths) || (t.rateKind === "prime" ? FREQ_PRIME : "")}</span>
                  <Shekel value={t.balance ?? 0} />
                </li>
              ))}
            </ul>
            {items.length > 1 && (
              <div className="brf-rd-sum">
                <span>סה״כ במועד זה</span>
                <Shekel value={sum} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------- principal and what the CPI added */

function IndexBars({ a, lit }: { a: StatementAnalysis; lit?: Set<string> }) {
  const rows = a.live.filter((t) => (t.indexation ?? 0) !== 0 || t.baseIndex);
  const max = Math.max(...rows.map((t) => (t.principal ?? 0) + Math.max(0, t.indexation ?? 0)), 1);
  return (
    <ul className="brf-ibars">
      {rows.map((t) => {
        const p = t.principal ?? 0;
        const ix = Math.max(0, t.indexation ?? 0);
        return (
          <li key={t.uid} data-lit={lit?.has(t.uid) || undefined}>
            <span className="brf-ibars-name">
              <i style={{ background: TRACK_COLOR[trackKey(t)] ?? "#8b93a7" }} />
              {trackName(t)}
            </span>
            <span className="brf-ibars-bar" aria-hidden>
              <span className="brf-ibars-p" style={{ width: `${(p / max) * 100}%` }} />
              <span className="brf-ibars-x" style={{ width: `${(ix / max) * 100}%` }} />
            </span>
            <span className="brf-ibars-fig">
              <Shekel value={ix} heat={ix > 0 ? "hot" : undefined} />
              <span className="brf-cell-sub">{p > 0 ? `${((ix / p) * 100).toFixed(1)}% מהקרן` : ""}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------- main */

export default function MortgageDeepDive({ analysis: a, onClose }: { analysis: StatementAnalysis; onClose: () => void }) {
  const [lit, setLit] = useLit();
  const st = a.statement;
  const doc = useMemo(() => docFromStatement(a), [a]);
  const purposes = st.loans
    .filter((l) => l.purposeKind !== "unknown")
    .map((l) => PURPOSE_LABEL[l.purposeKind])
    .filter((label, i, all) => all.indexOf(label) === i);
  const eligibility = st.loans.some((l) => l.funding === "eligibility");
  const L = (s: string) => (lit?.section === s ? lit.uids : undefined);
  const worst = (["critical", "high", "medium"] as const).find((s) => a.findings.some((f) => f.severity === s));

  const tabs = [
    a.findings.length ? { id: "findings", label: "ממצאים", count: a.findings.length, tone: worst } : null,
    { id: "mix", label: "תמהיל" },
    { id: "tranches", label: "מסלולים", count: a.live.length },
    a.recycle.length ? { id: "recycle", label: "בדיקת מיחזור" } : null,
    a.totals.breakFee > 0 || a.feeUnreported.length ? { id: "fees", label: "עמלות פירעון מוקדם" } : null,
    a.upcomingResets.length ? { id: "resets", label: "שינויי ריבית", count: a.upcomingResets.length } : null,
    a.totals.indexation !== 0 ? { id: "index", label: "הצמדה" } : null,
    { id: "meta", label: "פרטי המסמך" },
  ].filter(Boolean) as { id: string; label: string; count?: number; tone?: "critical" | "high" | "medium" }[];

  const findings: FindingItem[] = a.findings.map((f) => ({
    id: f.id,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
    amount: f.amount,
    section: f.section,
    uids: f.uids,
  }));

  const anyMonthly = a.live.some((t) => (t.monthly ?? 0) > 0);
  const trancheCols: RowCol<BankTranche>[] = [
    { key: "who", head: "", w: "minmax(0, 1.9fr)", lead: true, cell: (t) => <TrancheIdent t={t} /> },
    {
      key: "bal",
      head: "יתרה",
      w: "minmax(0, 1fr)",
      cell: (t) => (
        <>
          <Shekel value={t.balance ?? 0} />
          {(t.indexation ?? 0) > 0 && (
            <span className="brf-cell-sub">
              מזה הצמדה <Shekel value={t.indexation ?? 0} />
            </span>
          )}
        </>
      ),
    },
    { key: "rate", head: "ריבית", w: "minmax(0, 0.85fr)", cell: (t) => <RateCell rate={t.rate} heat={rateHeat(t.rate)} max={8} /> },
    ...(anyMonthly
      ? [{ key: "mon", head: "החזר חודשי", w: "minmax(0, 0.8fr)", cell: (t: BankTranche) => (t.monthly ? <Shekel value={t.monthly} /> : <Dash />) }]
      : []),
    {
      key: "term",
      head: "תקופה",
      w: "minmax(0, 1.15fr)",
      cell: (t) => <TermCell start={t.startDate} end={t.endDate} asOf={st.statementDate} months={t.months} />,
    },
    ...(a.live.some((t) => t.anchor)
      ? [
    {
      key: "anchor",
      head: "עוגן ותוספת",
      w: "minmax(0, 0.9fr)",
      cell: (t) =>
        t.anchor ? (
          <span className="brf-anchor">
            <b>{t.anchor}</b>
            {t.margin !== null && <span className="brf-num">{`${t.margin > 0 ? "+" : ""}${t.margin}%`}</span>}
          </span>
        ) : (
          <Dash />
        ),
    } as RowCol<BankTranche>,
        ]
      : []),
    { key: "fee", head: "עמלת פירעון מוקדם", w: "minmax(0, 0.85fr)", cell: (t) => <Fee t={t} /> },
  ];

  const recycleCols: RowCol<(typeof a.recycle)[number]>[] = [
    { key: "who", head: "", w: "minmax(0, 1.9fr)", lead: true, cell: (c) => <TrancheIdent t={c.tranche} /> },
    { key: "bal", head: "יתרה", w: "minmax(0, 1fr)", cell: (c) => <Shekel value={c.tranche.balance ?? 0} /> },
    { key: "rate", head: "ריבית", w: "minmax(0, 0.85fr)", cell: (c) => <RateCell rate={c.tranche.rate} heat={rateHeat(c.tranche.rate)} max={8} /> },
    { key: "fee", head: "עמלת פירעון מוקדם", w: "minmax(0, 0.9fr)", cell: (c) => <Fee t={c.tranche} /> },
    {
      key: "months",
      head: "בחודשי ריבית",
      w: "minmax(0, 0.8fr)",
      cell: (c) =>
        c.feeInMonthsOfInterest === null || c.feeInMonthsOfInterest === 0 ? (
          <Dash />
        ) : (
          <span className="brf-num" data-heat={c.feeInMonthsOfInterest <= FEE_MONTHS_OF_INTEREST_CHEAP ? "good" : undefined}>
            {c.feeInMonthsOfInterest}
          </span>
        ),
    },
    {
      key: "left",
      head: "אומדן ריבית שנותרה",
      w: "minmax(0, 1fr)",
      cell: (c) =>
        c.remainingInterest !== null ? (
          <Shekel value={c.remainingInterest} />
        ) : c.remainingInterestWhy ? (
          <span className="brf-unrep" title={c.remainingInterestWhy}>
            לא חושב
          </span>
        ) : (
          <Dash />
        ),
    },
  ];

  const feeRows = a.live.filter((t) => (t.breakFee ?? 0) > 0 || t.breakFee === null);
  const feeMax = Math.max(...feeRows.map((t) => t.breakFee ?? 0), 1);

  return (
    <Stage
      label="ניתוח משכנתא"
      nav="rail"
      tabs={tabs}
      who={
        <>
          {st.client.name || st.bankLabel}
          {st.statementDate && <span className="brf-bar-date">{st.statementDate}</span>}
        </>
      }
      onClose={onClose}
    >
      <article className="brf-sheet brf-sheet-dd">
        <header className="brf-mast">
          <span className="brf-mark">
            <Logo size={24} />
            <span>מורגי</span>
          </span>
          <span className="brf-mast-doc">
            ניתוח משכנתא
            {st.statementDate && <span className="brf-num">{st.statementDate}</span>}
          </span>
        </header>
        <div className="brf-who">
          <h1>{st.client.name || "ניתוח משכנתא"}</h1>
          <span className="brf-who-bank">
            <BankIcon source={st.bankLabel} size={20} />
            {st.bankLabel}
          </span>
          {(purposes.length > 0 || eligibility || st.client.idNumber) && (
            <span className="brf-who-meta">
              {[purposes.join(", "), eligibility ? "זכאות" : "", st.client.idNumber ? `ת״ז ${st.client.idNumber}` : ""].filter(Boolean).join(", ")}
            </span>
          )}
        </div>

        <Kpis
          items={[
            {
              label: "יתרת המשכנתא",
              value: a.totals.balance,
              kind: "money",
              tone: "primary",
              sub: `${a.live.length} מסלולים, ${st.loans.length > 1 ? `${st.loans.length} הלוואות` : "הלוואה אחת"}`,
            },
            {
              label: "החזר חודשי",
              value: a.totals.monthly > 0 ? a.totals.monthly : null,
              kind: "money",
              sub: a.totals.longestMonths ? `המסלול האחרון מסתיים בעוד כ-${Math.round(a.totals.longestMonths / 12)} שנים` : undefined,
            },
            {
              label: "ריבית ממוצעת משוקללת",
              value: a.totals.rate,
              kind: "rate",
              sub: a.totals.forecastRate !== null ? `ריבית כוללת חזויה ${rate2(a.totals.forecastRate)}` : undefined,
            },
            {
              label: "סכום לסילוק",
              value: a.totals.payoff,
              kind: "money",
              sub: st.statementDate ? `נכון ל-${st.statementDate}, כולל ריבית ועמלות` : "כולל ריבית ועמלות",
            },
            {
              label: "עמלת פירעון מוקדם",
              value: a.totals.breakFee,
              kind: "money",
              tone: a.totals.breakFee / (a.totals.balance || 1) >= 0.02 ? "warn" : undefined,
              sub:
                a.totals.balance > 0
                  ? `${((a.totals.breakFee / a.totals.balance) * 100).toFixed(2)}% מהיתרה${
                      a.feeUnreported.length ? `, לא דווחה ל-${a.feeUnreported.length === 1 ? "מסלול אחד" : `${a.feeUnreported.length} מסלולים`}` : ""
                    }`
                  : undefined,
            },
          ]}
        />

        {findings.length > 0 && (
          <Sec id="findings" icon={<ShieldWarning size={18} weight="fill" />} title="ממצאים" aside={<SevCounts items={findings} />} lit={lit?.section === "findings"}>
            <Findings items={findings} onGo={(f) => f.section && setLit({ section: f.section, uids: new Set(f.uids ?? []) })} />
          </Sec>
        )}

        <Sec
          id="mix"
          icon={<ChartPieSlice size={18} weight="fill" />}
          title="תמהיל המסלולים"
          aside={`${pct(a.exposure.variableShare)} משתנה, ${pct(a.exposure.linkedShare)} צמוד${a.exposure.fxShare > 0 ? `, ${pct(a.exposure.fxShare)} מט"ח` : ""}`}
          lit={lit?.section === "mix"}
        >
          <ShareTable doc={doc} />
        </Sec>

        <Sec
          id="tranches"
          icon={<Coins size={18} weight="fill" />}
          title="המסלולים"
          aside={a.live.some((t) => t.monthsDerived) ? "יתרת התקופה חושבה מתאריך הסיום" : undefined}
          lit={lit?.section === "tranches"}
        >
          <RowList rows={a.live} cols={trancheCols} rowKey={(t) => t.uid} lit={L("tranches")} bad={(t) => (t.arrears ?? 0) > 0} />
        </Sec>

        {a.recycle.length > 0 && (
          <Sec id="recycle" icon={<TrendUp size={18} weight="bold" />} title="בדיקת מיחזור" lit={lit?.section === "recycle"}>
            <RecycleMap a={a} />
            <p className="brf-sec-note">
              העמלה מוצגת בשקלים וביחס לריבית של חודש אחד, לפי היתרה והריבית הנוכחיות. לבדיקת חיסכון יש להשוות להצעה חלופית, כולל התקופה
              והעלויות הנלוות.
            </p>
            <RowList rows={a.recycle} cols={recycleCols} rowKey={(c) => c.tranche.uid} lit={L("recycle")} />
            <p className="brf-sec-note">
              אומדן הריבית שנותרה: ההחזר החודשי הנוכחי כפול החודשים שנותרו, פחות היתרה — לא מהוון, ובהנחה שההחזר אינו משתנה. לא חושב
              למסלולי בלון, לקרן שווה, או כשההחזר אינו מכסה את היתרה.
            </p>
          </Sec>
        )}

        {(a.totals.breakFee > 0 || a.feeUnreported.length > 0) && (
          <Sec id="fees" icon={<Receipt size={18} weight="fill" />} title="עמלות פירעון מוקדם" aside={<Shekel value={a.totals.breakFee} />} lit={lit?.section === "fees"}>
            <ul className="brf-fees">
              {feeRows.map((t) => (
                <li key={t.uid} data-lit={L("fees")?.has(t.uid) || undefined}>
                  <span className="brf-fees-name">
                    <i style={{ background: TRACK_COLOR[trackKey(t)] ?? "#8b93a7" }} />
                    {trackName(t)}
                  </span>
                  <span className="brf-fees-bar" aria-hidden>
                    {t.breakFee !== null && <span style={{ width: `${Math.max(1.5, ((t.breakFee ?? 0) / feeMax) * 100)}%` }} />}
                  </span>
                  <span className="brf-fees-fig">
                    <Fee t={t} />
                    <span className="brf-cell-sub">
                      {t.breakFee === null
                        ? "המסמך אינו מציין עמלה"
                        : t.breakFeeParts.map((p) => `${p.label} ₪${Math.round(p.amount).toLocaleString("he-IL")}`).join(", ")}
                    </span>
                  </span>
                </li>
              ))}
              {a.totals.operationalFee > 0 && (
                <li>
                  <span className="brf-fees-name">עמלה תפעולית</span>
                  <span className="brf-fees-bar" aria-hidden />
                  <span className="brf-fees-fig">
                    <Shekel value={a.totals.operationalFee} />
                    <span className="brf-cell-sub">חד-פעמית, ברמת ההלוואה</span>
                  </span>
                </li>
              )}
            </ul>
            {a.freeToBreak.length > 0 && (
              <p className="brf-payoff-free">
                <SealCheck size={20} weight="fill" />
                <span>
                  <Shekel value={a.freeToBreak.reduce((s, t) => s + (t.balance ?? 0), 0)} /> ב{a.freeToBreak.length === 1 ? "מסלול אחד" : `-${a.freeToBreak.length} מסלולים`} שהמסמך
                  מציין להם עמלה של 0 ₪. עלויות נלוות של העברה אינן כלולות.
                </span>
              </p>
            )}
            {a.feeUnreported.length > 0 && (
              <p className="brf-sec-note">
                ל{a.feeUnreported.length === 1 ? "מסלול אחד" : `-${a.feeUnreported.length} מסלולים`} לא דווחה עמלה (יתרה של{" "}
                <Shekel value={a.feeUnreported.reduce((s, t) => s + (t.balance ?? 0), 0)} />
                ); אין להניח שהיא 0, והסכום הכולל חלקי.
              </p>
            )}
          </Sec>
        )}

        {a.upcomingResets.length > 0 && (
          <Sec
            id="resets"
            icon={<CalendarBlank size={18} weight="fill" />}
            title="עדכוני ריבית ב-12 החודשים הקרובים"
            aside={<Shekel value={a.exposure.resettingWithinYear} />}
            lit={lit?.section === "resets"}
          >
            <ResetDates a={a} lit={L("resets")} />
            <p className="brf-sec-note">לפני כל מועד עדכון יש לבדוק מול הבנק את עמלת הפירעון הצפויה בו, ולהשוות לעמלה שבמסמך.</p>
          </Sec>
        )}

        {a.totals.indexation !== 0 && (
          <Sec
            id="index"
            icon={<TrendUp size={18} weight="fill" />}
            title="הצמדה ומדדים"
            aside={`הפרשי הצמדה: ${(a.exposure.indexationDrag * 100).toFixed(1)}% מיתרת הקרן`}
            lit={lit?.section === "index"}
          >
            <Facts
              items={[
                { label: "יתרת קרן", value: <Shekel value={a.totals.principal} /> },
                { label: "הפרשי הצמדה", value: <Shekel value={a.totals.indexation} heat={a.totals.indexation > 0 ? "hot" : undefined} />, tone: a.totals.indexation > 0 ? "neg" : undefined },
                { label: "ריבית לסילוק", value: <Shekel value={a.totals.accruedInterest} /> },
              ]}
            />
            <Sub>קרן והצמדה לפי מסלול</Sub>
            <IndexBars a={a} lit={L("index")} />
          </Sec>
        )}

        <Sec id="meta" icon={<IdentificationCard size={18} weight="bold" />} title="פרטי המסמך" fold="הצגה" forceOpen={lit?.section === "meta"} lit={lit?.section === "meta"}>
          <div className="brf-tablewrap">
            <table className="brf-table">
              <thead>
                <tr>
                  <th data-text>בנק</th>
                  <th data-text>לקוח</th>
                  <th data-text>ת״ז</th>
                  <th data-text>חשבון / תיק</th>
                  <th>תאריך המסמך</th>
                  <th>הלוואות</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-text><span className="brf-td-name">{st.bankLabel}</span></td>
                  <td data-text>{st.client.name || <Dash />}</td>
                  <td data-text><span className="brf-num">{st.client.idNumber || "—"}</span></td>
                  <td data-text><span className="brf-num">{st.accountNumber || "—"}</span></td>
                  <td><span className="brf-num">{st.statementDate || "—"}</span></td>
                  <td><span className="brf-num">{st.loans.length}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {st.loans.length > 0 && (
            <>
              <Sub>יתרות כפי שהבנק הדפיס</Sub>
              <div className="brf-tablewrap">
                <table className="brf-table">
                  <thead>
                    <tr>
                      <th data-text>הלוואה</th>
                      <th data-text>מטרה</th>
                      <th>מסלולים</th>
                      <th>יתרה</th>
                      <th>לסילוק</th>
                      <th>החזר חודשי</th>
                      <th>עמלה תפעולית</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.loans.map((l) => (
                      <tr key={l.loanNumber}>
                        <td data-text><span className="brf-num">{l.loanNumber}</span></td>
                        <td data-text>
                          {l.purpose || PURPOSE_LABEL[l.purposeKind]}
                          {l.funding === "eligibility" ? ", זכאות" : ""}
                        </td>
                        <td><span className="brf-num">{l.tranches.length}</span></td>
                        <td>{l.printed.balance ? <Shekel value={l.printed.balance} /> : <Dash />}</td>
                        <td>{l.printed.payoff ? <Shekel value={l.printed.payoff} /> : <Dash />}</td>
                        <td>{l.printed.monthly ? <Shekel value={l.printed.monthly} /> : <Dash />}</td>
                        <td>{l.printed.operationalFee ? <Shekel value={l.printed.operationalFee} /> : <Dash />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {a.warnings.length > 0 && (
            <ul className="brf-warns">
              {a.warnings.map((w, i) => (
                <li key={`${i}:${w}`}>{w}</li>
              ))}
            </ul>
          )}
          <p className="brf-sec-note">
            הניתוח נגזר אוטומטית מתדפיס הבנק ואינו תחליף לקריאת המסמך המקורי. עמלות פירעון מוקדם משתנות מדי יום ותקפות למועד המסמך בלבד.
          </p>
        </Sec>
      </article>
    </Stage>
  );
}

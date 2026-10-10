"use client";

// ניתוח חיווי אשראי on /aa105test — the credit report as an underwriter reads it,
// full-screen.
//
// The same reading as the board's AnalysisModal and the same engine: findings
// first, each pointing at the rows it was drawn from, then the evidence. What
// changes is how it is read — a side index that follows the scroll, a band of
// headline figures, one sheet per section, colour spent on severity and on
// nothing else, and the tables cut to the columns that have something to say.

import { useMemo } from "react";
import {
  Bank,
  CalendarBlank,
  Certificate,
  ChartPieSlice,
  Gavel,
  IdentificationCard,
  MagnifyingGlass,
  Pulse,
  ShieldWarning,
  Warning,
} from "@phosphor-icons/react";
import { rateHeat, utilisationHeat } from "@/lib/verdicts";
import { lenderLabel } from "@/app/aa102test/lib/lenders";
import { CATEGORY_LABEL, type Analysis, type DebtLine } from "@/app/aa102test/lib/analysis";
import { BankIcon } from "@/app/aa102test/components/bankIcons";
import Stage from "./Stage";
import { Flow } from "./BriefView";
import { docFromCredit } from "../lib/brief";
import {
  Bars,
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
  pct,
  rate2,
  TermCell,
  UseCell,
  useLit,
  type FindingItem,
  type RowCol,
} from "./DeepKit";

/** The five facility kinds in the board's two families — ink for mortgage, copper for loans. */
const FAMILY_COLOR: Record<string, string> = {
  mortgage: "#5b54d6",
  loan: "#e07b39",
  card: "#0d8b9b",
  overdraft: "#a6642f",
  other: "#8b93a7",
};
const TRACK_COLOR = ["#2563eb", "#0d8b9b", "#14905a", "#ad7804", "#c62370", "#5b54d6", "#8b93a7"];

/* ------------------------------------------------------------- debt rows */

const BENIGN_STATUS = /כסדרה|תקין|שוטף/;

function Ident({ l }: { l: DebtLine }) {
  const bad = l.overdue > 0 || !!l.arrearsRange;
  const sub = [l.category === "mortgage" ? l.track : l.type, l.category === "mortgage" ? "" : l.track].filter(Boolean).join(" · ");
  return (
    <span className="brf-ident">
      <BankIcon source={l.bank} size={32} />
      <span className="brf-ident-text">
        <b title={l.bank}>{lenderLabel(l.bank) || l.bank}</b>
        {sub && <span className="brf-ident-sub">{sub}</span>}
        {(bad || l.shared || l.balloon || (l.status && !BENIGN_STATUS.test(l.status))) && (
          <span className="brf-ident-chips">
            {bad && <span className="brf-chip brf-chip-xs" data-tone="neg">{l.arrearsRange || "בפיגור"}{l.overdue > 0 ? ` · ₪${l.overdue.toLocaleString("he-IL")}` : ""}</span>}
            {l.balloon && <span className="brf-chip brf-chip-xs" data-tone="warn">בלון</span>}
            {l.shared && <span className="brf-chip brf-chip-xs" title="הופיע ביותר מדוח אחד ונספר פעם אחת">משותף</span>}
            {l.status && !BENIGN_STATUS.test(l.status) && <span className="brf-chip brf-chip-xs" data-tone="neg">{l.status}</span>}
          </span>
        )}
      </span>
    </span>
  );
}

const money = (v: number) => (v ? <Shekel value={v} /> : <Dash />);

/** The columns that suit a family: amortising debts read by term, facilities by limit. */
function DebtRows({ lines, kind, lit, asOf }: { lines: DebtLine[]; kind: "amort" | "revolving" | "plain"; lit?: Set<string>; asOf?: string }) {
  const lead: RowCol<DebtLine> = { key: "who", head: "", w: "minmax(0, 1.75fr)", lead: true, cell: (l) => <Ident l={l} /> };
  const balance: RowCol<DebtLine> = {
    key: "bal",
    head: "יתרה",
    w: "minmax(0, 1fr)",
    cell: (l) => (
      <>
        <Shekel value={l.balance} />
        {l.original > 0 && kind === "amort" && (
          <span className="brf-cell-sub">
            מתוך <Shekel value={l.original} />
          </span>
        )}
      </>
    ),
  };
  const rate: RowCol<DebtLine> = {
    key: "rate",
    head: "ריבית",
    w: "minmax(0, 0.9fr)",
    cell: (l) => {
      const fam = l.category === "mortgage" ? "mortgage" : l.category === "loan" ? "loan" : "card";
      const r = kind === "revolving" ? l.rateOnDrawn ?? l.rate : l.rate;
      return <RateCell rate={r} heat={rateHeat(r, fam)} max={fam === "mortgage" ? 8 : 18} />;
    },
  };
  const cols: RowCol<DebtLine>[] =
    kind === "amort"
      ? [
          lead,
          balance,
          rate,
          { key: "mon", head: "החזר חודשי", w: "minmax(0, 0.85fr)", cell: (l) => money(l.monthly) },
          { key: "term", head: "תקופה", w: "minmax(0, 1.25fr)", cell: (l) => <TermCell start={l.startDate} end={l.endDate} asOf={asOf} months={l.months} /> },
        ]
      : kind === "revolving"
        ? [
            lead,
            balance,
            {
              key: "use",
              head: "ניצול המסגרת",
              w: "minmax(0, 1.25fr)",
              cell: (l) => <UseCell used={l.balance} limit={l.limit} heat={utilisationHeat(l.utilization === null ? null : l.utilization / 100)} />,
            },
            {
              key: "charge",
              head: "חיוב חודשי",
              w: "minmax(0, 0.95fr)",
              cell: (l) => (
                <>
                  {money(l.monthly)}
                  {l.paidActually > 0 && (
                    <span className="brf-cell-sub" data-heat={l.monthly - l.paidActually > 1 ? "hot" : undefined}>
                      שולם <Shekel value={l.paidActually} heat={l.monthly - l.paidActually > 1 ? "hot" : undefined} />
                    </span>
                  )}
                </>
              ),
            },
            rate,
          ]
        : [
            lead,
            balance,
            { key: "mon", head: "החזר חודשי", w: "minmax(0, 0.9fr)", cell: (l) => money(l.monthly) },
            { key: "term", head: "תקופה", w: "minmax(0, 1.25fr)", cell: (l) => <TermCell start={l.startDate} end={l.endDate} asOf={asOf} months={l.months} /> },
          ];
  return <RowList rows={lines} cols={cols} rowKey={(l) => l.uid} lit={lit} bad={(l) => l.overdue > 0 || !!l.arrearsRange} />;
}

/* ------------------------------------------------------------ arrears grid */

const MONTHS_HE = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];

function ArrearsGrid({ rows }: { rows: { year: string; months: (number | null)[] }[] }) {
  return (
    <div className="brf-tablewrap">
      <table className="brf-heat">
        <thead>
          <tr>
            <th />
            {MONTHS_HE.map((m) => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <th className="brf-num">{r.year}</th>
              {r.months.map((v, i) => (
                <td key={i} data-b={v ? Math.min(v, 6) : undefined} title={v ? `${r.year} · ${MONTHS_HE[i]} · דרגת פיגור ${v}` : `${r.year} · ${MONTHS_HE[i]} · ללא פיגור`}>
                  {v ? <span className="brf-num">{v}</span> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------- main */

export default function CreditDeepDive({ analysis: a, onClose }: { analysis: Analysis; onClose: () => void }) {
  const [lit, setLit] = useLit();
  const doc = useMemo(() => docFromCredit(a), [a]);

  const own = a.lines.filter((l) => l.role === "debtor");
  const mortgages = own.filter((l) => l.category === "mortgage");
  const consumer = own.filter((l) => l.category === "loan");
  const revolving = own.filter((l) => l.category === "card" || l.category === "overdraft");
  const otherDebts = own.filter((l) => l.category === "other");
  const guarantees = a.lines.filter((l) => l.role === "guarantor");
  const collateral = mortgages.flatMap((l) => l.collateral.map((c) => ({ ...c, bank: l.bank })));
  const behaviour = a.behaviour.arrears.length > 0 || a.behaviour.checksPresented > 0 || a.behaviour.debitsPresented > 0;
  const inquiries = a.inquiries.total > 0 || a.inquiries.pending.length > 0;
  const legal = a.legal.execution.length > 0 || a.legal.insolvency.length > 0 || a.legal.nonPayment.length > 0;
  const disagrees = a.reconcile.balanceDisagrees || a.reconcile.limitDisagrees || a.reconcile.originalDisagrees;

  const worst = (["critical", "high", "medium"] as const).find((s) => a.flags.some((f) => f.severity === s));
  const tabs = [
    a.flags.length ? { id: "flags", label: "ממצאים", count: a.flags.length, tone: worst } : null,
    { id: "picture", label: "תמונת החוב" },
    mortgages.length ? { id: "mortgage", label: "משכנתאות", count: mortgages.length } : null,
    consumer.length ? { id: "consumer", label: "הלוואות", count: consumer.length } : null,
    revolving.length ? { id: "revolving", label: 'מסגרות ועו"ש', count: revolving.length } : null,
    otherDebts.length ? { id: "other", label: "התחייבויות אחרות", count: otherDebts.length } : null,
    guarantees.length ? { id: "guarantees", label: "ערבויות", count: guarantees.length } : null,
    behaviour ? { id: "behaviour", label: "התנהגות תשלומים" } : null,
    inquiries ? { id: "inquiries", label: "פניות" } : null,
    legal ? { id: "legal", label: "הליכים", tone: "critical" as const } : null,
    a.sources.length ? { id: "sources", label: "תמצית לפי מקור" } : null,
    collateral.length ? { id: "collateral", label: "בטוחות" } : null,
    { id: "meta", label: "פרטי הדוח" },
  ].filter(Boolean) as { id: string; label: string; count?: number; tone?: "critical" | "high" | "medium" }[];

  const findings: FindingItem[] = useMemo(
    () =>
      a.flags.map((f) => ({
        id: f.id,
        severity: f.severity,
        title: f.title,
        detail: f.detail,
        amount: f.amount,
        where: f.where,
        section: f.target?.section,
        uids: f.target?.uids,
      })),
    [a.flags]
  );

  const L = (s: string) => (lit?.section === s ? lit.uids : undefined);
  const names = a.clients.map((c) => c.name).filter(Boolean);

  return (
    <Stage
      label="ניתוח חיווי אשראי"
      nav="rail"
      tabs={tabs}
      who={
        <>
          ניתוח חיווי אשראי
          {names.length ? ` · ${names.join(" ו")}` : ""}
          {a.clients[0]?.reportDate ? ` · ${a.clients[0].reportDate}` : ""}
        </>
      }
      onClose={onClose}
    >
      <div className="brf-page brf-page-dd">
        {/* ---------------------------------------------------- the head */}
        <header className="brf-dd-head">
          <h1 className="brf-h1">ניתוח חיווי אשראי</h1>
          <div className="brf-dd-who">
            {a.clients.map((c, i) => (
              <span key={`${c.idNumber}-${i}`} className="brf-chip brf-chip-id">
                <IdentificationCard size={15} />
                {c.name || "ללא שם"}
                {c.idNumber && <span className="brf-num">{c.idNumber}</span>}
              </span>
            ))}
            {a.clients[0]?.reportDate && <span className="brf-chip">דוח מ-{a.clients[0].reportDate}</span>}
          </div>
        </header>

        <Kpis
          items={[
            { label: "סך ההתחייבויות", value: a.totals.balance, kind: "money", tone: "primary", sub: `${own.length} התחייבויות פעילות` },
            {
              label: "החזר חודשי",
              value: a.totals.monthlyRepayment,
              kind: "money",
              sub: a.consumer.shareOfMonthly > 0 ? `${pct(a.consumer.shareOfMonthly)} מזה הלוואות צרכניות` : "משכנתאות והלוואות",
            },
            {
              label: "חיוב חודשי בכרטיסים",
              value: a.cards.monthlyCharge,
              kind: "money",
              tone: a.cards.rolled > 0 ? "warn" : undefined,
              sub:
                a.cards.rolled > 0
                  ? `₪${a.cards.rolled.toLocaleString("he-IL")} לא נפרעו וגולגלו`
                  : a.cards.count
                    ? `${a.cards.count} מסגרות · נפרע במלואו`
                    : "אין חיוב מדווח",
            },
            {
              label: "ריבית ממוצעת משוקללת",
              value: a.totals.rate,
              kind: "rate",
              sub:
                a.mortgage.rate !== null
                  ? `משכנתא ${rate2(a.mortgage.rate)}${a.consumer.rate !== null ? ` · צרכני ${rate2(a.consumer.rate)}` : ""}`
                  : a.consumer.rate !== null
                    ? `צרכני ${rate2(a.consumer.rate)}`
                    : undefined,
            },
            {
              label: "יתרות בפיגור",
              value: a.totals.overdue,
              kind: "money",
              tone: a.totals.overdue > 0 ? "neg" : undefined,
              sub: a.behaviour.arrearsMonths ? `${a.behaviour.arrearsMonths} חודשי פיגור בהיסטוריה` : "אין פיגור פעיל",
            },
          ]}
        />

        {/* ------------------------------------------------------ findings */}
        {findings.length > 0 && (
          <Sec id="flags" icon={<ShieldWarning size={18} weight="fill" />} title="ממצאים" aside={<SevCounts items={findings} />} lit={lit?.section === "flags"}>
            <Findings items={findings} onGo={(f) => f.section && setLit({ section: f.section, uids: new Set(f.uids ?? []) })} />
          </Sec>
        )}

        {/* ------------------------------------------------- debt picture */}
        <Sec
          id="picture"
          icon={<ChartPieSlice size={18} weight="fill" />}
          title="תמונת החוב"
          aside={a.lines.some((l) => l.shared) ? "התחייבויות משותפות נספרו פעם אחת" : undefined}
          lit={lit?.section === "picture"}
        >
          <Flow doc={doc} bare />
          <div className="brf-tablewrap">
            <table className="brf-table">
              <thead>
                <tr>
                  <th data-text>סוג</th>
                  <th>מספר</th>
                  <th>יתרה</th>
                  <th>החזר חודשי</th>
                  <th>ריבית</th>
                  <th>מסגרת</th>
                  <th>בפיגור</th>
                </tr>
              </thead>
              <tbody>
                {a.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td data-text>
                      <span className="brf-td-name">
                        <i className="brf-dot" style={{ background: FAMILY_COLOR[c.category] }} />
                        {CATEGORY_LABEL[c.category]}
                      </span>
                    </td>
                    <td><span className="brf-num">{c.count}</span></td>
                    <td><Shekel value={c.balance} /></td>
                    <td>{c.monthly ? <Shekel value={c.monthly} /> : <Dash />}</td>
                    <td>{c.rate === null ? <Dash /> : <span className="brf-num">{rate2(c.rate)}</span>}</td>
                    <td>{c.limit ? <Shekel value={c.limit} /> : <Dash />}</td>
                    <td>{c.overdue ? <Shekel value={c.overdue} heat="hot" /> : <Dash />}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td data-text>סה״כ</td>
                  <td><span className="brf-num">{own.length}</span></td>
                  <td><Shekel value={a.totals.balance} /></td>
                  <td><Shekel value={a.totals.monthly} /></td>
                  <td>{a.totals.rate === null ? <Dash /> : <span className="brf-num">{rate2(a.totals.rate)}</span>}</td>
                  <td><Shekel value={a.totals.limit} /></td>
                  <td>{a.totals.overdue ? <Shekel value={a.totals.overdue} heat="hot" /> : <Dash />}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Sec>

        {/* ---------------------------------------------------- mortgages */}
        {mortgages.length > 0 && (
          <Sec
            id="mortgage"
            icon={<Bank size={18} weight="fill" />}
            title="משכנתאות"
            aside={`${pct(a.mortgage.variableShare)} משתנה · ${pct(a.mortgage.linkedShare)} צמוד${a.mortgage.ltv !== null ? ` · יחס מימון ${pct(a.mortgage.ltv)}` : ""}`}
            lit={lit?.section === "mortgage"}
          >
            {a.mortgage.tracks.length > 0 && (
              <>
                <Sub>פיזור המסלולים</Sub>
                <Bars
                  parts={a.mortgage.tracks.map((t, i) => ({
                    key: `${t.label}-${i}`,
                    label: t.label,
                    amount: t.amount,
                    share: t.share,
                    color: TRACK_COLOR[i % TRACK_COLOR.length],
                    note: t.rate !== null ? rate2(t.rate) : undefined,
                  }))}
                />
              </>
            )}
            <DebtRows lit={L("mortgage")} lines={mortgages} kind="amort" asOf={a.clients[0]?.reportDate} />
            {a.mortgage.collateralValue > 0 && (
              <p className="brf-sec-note">
                שווי בטוחות מדווח <Shekel value={a.mortgage.collateralValue} /> מול יתרה של <Shekel value={a.mortgage.balance} />.
              </p>
            )}
          </Sec>
        )}

        {/* ------------------------------------------------------ consumer */}
        {consumer.length > 0 && (
          <Sec
            id="consumer"
            icon={<Pulse size={18} weight="bold" />}
            title="הלוואות צרכניות"
            aside={`ריבית ממוצעת ${rate2(a.consumer.rate)}${a.consumer.worstRate !== null ? ` · הגבוהה ${rate2(a.consumer.worstRate)}` : ""}`}
            lit={lit?.section === "consumer"}
          >
            <DebtRows lit={L("consumer")} lines={consumer} kind="amort" asOf={a.clients[0]?.reportDate} />
          </Sec>
        )}

        {/* ----------------------------------------------------- revolving */}
        {revolving.length > 0 && (
          <Sec
            id="revolving"
            icon={<Certificate size={18} weight="fill" />}
            title='מסגרות אשראי וחשבונות עו"ש'
            aside={
              a.revolving.utilization !== null
                ? `ניצול ${a.revolving.utilization}%${a.revolving.peak > 0 ? ` · שיא בחודש הדיווח ₪${a.revolving.peak.toLocaleString("he-IL")}` : ""}`
                : undefined
            }
            lit={lit?.section === "revolving"}
          >
            {a.cards.monthlyCharge > 0 && (
              <Facts
                items={[
                  { label: "חיוב חודשי", value: <Shekel value={a.cards.monthlyCharge} /> },
                  { label: "שולם בפועל", value: <Shekel value={a.cards.paidActually} /> },
                  { label: "גולגל לחודש הבא", value: <Shekel value={a.cards.rolled} heat={a.cards.rolled > 0 ? "hot" : undefined} />, tone: a.cards.rolled > 0 ? "neg" : undefined },
                ]}
              />
            )}
            <DebtRows lit={L("revolving")} lines={revolving} kind="revolving" asOf={a.clients[0]?.reportDate} />
          </Sec>
        )}

        {/* --------------------------------------------------------- other */}
        {otherDebts.length > 0 && (
          <Sec id="other" icon={<Warning size={18} weight="fill" />} title="התחייבויות אחרות" lit={lit?.section === "other"}>
            <DebtRows lit={L("other")} lines={otherDebts} kind="plain" asOf={a.clients[0]?.reportDate} />
          </Sec>
        )}

        {/* ---------------------------------------------------- guarantees */}
        {guarantees.length > 0 && (
          <Sec
            id="guarantees"
            icon={<Certificate size={18} weight="bold" />}
            title="ערבויות"
            aside="אינן החזר של הלקוח, אך נספרות כחשיפה בבדיקת בנק"
            lit={lit?.section === "guarantees"}
          >
            <DebtRows lit={L("guarantees")} lines={guarantees} kind="plain" asOf={a.clients[0]?.reportDate} />
          </Sec>
        )}

        {/* ----------------------------------------------------- behaviour */}
        {behaviour && (
          <Sec id="behaviour" icon={<CalendarBlank size={18} weight="fill" />} title="התנהגות תשלומים" lit={lit?.section === "behaviour"}>
            <Facts
              items={[
                { label: "שיקים שהוצגו", v: a.behaviour.checksPresented, bad: false },
                { label: 'שיקים שחזרו (אכ"מ)', v: a.behaviour.checksReturned, bad: a.behaviour.checksReturned > 0 },
                { label: "הוראות קבע שהוצגו", v: a.behaviour.debitsPresented, bad: false },
                { label: "הוראות קבע שלא כובדו", v: a.behaviour.debitsDishonored, bad: a.behaviour.debitsDishonored > 0 },
              ]
                .filter((x) => x.v > 0)
                .map((x) => ({ label: x.label, value: <span className="brf-num">{x.v}</span>, tone: x.bad ? ("neg" as const) : undefined }))}
            />
            {a.behaviour.arrears.length > 0 && (
              <>
                <Sub>היסטוריית פיגורים · 1 = 30–59 ימים … 6 = 180 ימים ומעלה</Sub>
                <ArrearsGrid rows={a.behaviour.arrears} />
              </>
            )}
          </Sec>
        )}

        {/* ----------------------------------------------------- inquiries */}
        {inquiries && (
          <Sec
            id="inquiries"
            icon={<MagnifyingGlass size={18} weight="bold" />}
            title="פניות ובקשות אשראי"
            aside={`${a.inquiries.last3} ב-3 החודשים האחרונים · ${a.inquiries.last12} בשנה`}
            lit={lit?.section === "inquiries"}
          >
            {a.inquiries.pending.length > 0 && (
              <>
                <Sub>בקשות אשראי שטרם הבשילו לעסקה</Sub>
                <div className="brf-tablewrap">
                  <table className="brf-table">
                    <thead>
                      <tr>
                        <th data-text>גורם</th>
                        <th data-text>סוג</th>
                        <th data-text>מטרה</th>
                        <th>סכום</th>
                        <th>תאריך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.inquiries.pending.map((q, i) => (
                        <tr key={`${q.user}-${i}`}>
                          <td data-text><span className="brf-td-name">{q.user || "—"}</span></td>
                          <td data-text>{q.transactionType || <Dash />}</td>
                          <td data-text>{q.purpose || <Dash />}</td>
                          <td><span className="brf-num">{q.amount || "—"}</span></td>
                          <td><span className="brf-num">{q.date || "—"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {a.inquiries.byPurpose.length > 0 && (
              <div className="brf-chips brf-chips-lg">
                {a.inquiries.byPurpose.map((p) => (
                  <span key={p.purpose} className="brf-chip">
                    {p.purpose}
                    <b className="brf-num">{p.count}</b>
                  </span>
                ))}
              </div>
            )}
          </Sec>
        )}

        {/* --------------------------------------------------------- legal */}
        {legal && (
          <Sec id="legal" icon={<Gavel size={18} weight="fill" />} title="הליכים ואי עמידה בפירעון" lit={lit?.section === "legal"}>
            {a.legal.nonPayment.length > 0 && (
              <>
                <Sub>נתונים המעידים על אי עמידה בפירעון</Sub>
                <div className="brf-tablewrap">
                  <table className="brf-table">
                    <thead>
                      <tr>
                        <th data-text>מקור</th>
                        <th>תאריך</th>
                        <th data-text>תיאור</th>
                        <th>מונע/מבטל</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.legal.nonPayment.map((n, i) => (
                        <tr key={`${n.id}-${i}`} data-bad>
                          <td data-text><span className="brf-td-name" title={n.source || undefined}>{lenderLabel(n.source) || "—"}</span></td>
                          <td><span className="brf-num">{n.reportDate || "—"}</span></td>
                          <td data-text>{n.description || <Dash />}</td>
                          <td>{n.prevents ? "כן" : "לא"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {a.legal.execution.length > 0 && (
              <>
                <Sub>תיקי הוצאה לפועל</Sub>
                <div className="brf-tablewrap">
                  <table className="brf-table">
                    <thead>
                      <tr>
                        <th data-text>מספר תיק</th>
                        <th data-text>סוג</th>
                        <th>נפתח</th>
                        <th>חוב בפתיחה</th>
                        <th>יתרה אחרונה</th>
                        <th>נסגר</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.legal.execution.map((c, i) => (
                        // A closed file with nothing owing is history, not live debt.
                        <tr key={`${c["197-003"]}-${i}`} data-bad={!c["197-013"] || Number(String(c["197-009"]).replace(/[^\d.]/g, "")) > 0 || undefined}>
                          <td data-text><span className="brf-num">{c["197-003"] || "—"}</span></td>
                          <td data-text>{c["197-004"] || <Dash />}</td>
                          <td><span className="brf-num">{c["197-006"] || "—"}</span></td>
                          <td><span className="brf-num">{c["197-007"] || "—"}</span></td>
                          <td><span className="brf-num">{c["197-009"] || "—"}</span></td>
                          <td><span className="brf-num">{c["197-013"] || "פתוח"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {a.legal.insolvency.length > 0 && (
              <>
                <Sub>הליכי חדלות פירעון ושיקום כלכלי</Sub>
                <div className="brf-tablewrap">
                  <table className="brf-table">
                    <thead>
                      <tr>
                        <th data-text>תיק</th>
                        <th data-text>סוג הליך</th>
                        <th>נפתח</th>
                        <th>חוב מוצהר</th>
                        <th data-text>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.legal.insolvency.map((c, i) => (
                        <tr key={`${c["151-001"]}-${i}`} data-bad>
                          <td data-text><span className="brf-num">{c["151-001"] || "—"}</span></td>
                          <td data-text>{c["151-003"] || <Dash />}</td>
                          <td><span className="brf-num">{c["151-005"] || "—"}</span></td>
                          <td><span className="brf-num">{c["151-009"] || c["151-007"] || "—"}</span></td>
                          <td data-text>{c["151-015"] || <Dash />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Sec>
        )}

        {/* ------------------------------------------------------- sources */}
        {a.sources.length > 0 && (
          <Sec
            id="sources"
            icon={<Bank size={18} weight="bold" />}
            title="תמצית הדוח לפי מקור"
            // Reference: it restates the tables above lender by lender, so it
            // stays folded unless it disagrees with them.
            fold={disagrees ? undefined : `${a.sources.length} שורות`}
            forceOpen={lit?.section === "sources"}
            aside={
              disagrees ? (
                <span className="brf-neg">
                  פער מול הפירוט: ₪{a.reconcile.balanceGap.toLocaleString("he-IL")} יתרה · ₪{a.reconcile.limitGap.toLocaleString("he-IL")} מסגרת · ₪
                  {a.reconcile.originalGap.toLocaleString("he-IL")} סכום מקורי
                </span>
              ) : (
                "תואם לפירוט העסקאות"
              )
            }
            lit={lit?.section === "sources"}
          >
            <div className="brf-tablewrap">
              <table className="brf-table">
                <thead>
                  <tr>
                    <th data-text>מקור</th>
                    <th data-text>סוג עסקה</th>
                    <th data-text>תפקיד</th>
                    <th>מספר</th>
                    <th>מסגרת</th>
                    <th>יתרה</th>
                    <th>בפיגור</th>
                  </tr>
                </thead>
                <tbody>
                  {a.sources.map((s, i) => (
                    <tr key={`${s.source}-${s.transactionType}-${i}`} data-bad={s.overdue > 0 || undefined}>
                      <td data-text><span className="brf-td-name" title={s.source || undefined}>{lenderLabel(s.source) || "—"}</span></td>
                      <td data-text>{s.transactionType}</td>
                      <td data-text>{s.role === "guarantor" ? "ערב" : "חייב"}</td>
                      <td><span className="brf-num">{s.count || "—"}</span></td>
                      <td>{s.limit ? <Shekel value={s.limit} /> : <Dash />}</td>
                      <td>{s.balance ? <Shekel value={s.balance} /> : <Dash />}</td>
                      <td>{s.overdue ? <Shekel value={s.overdue} heat="hot" /> : <Dash />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {a.reconcile.missingCounts.length > 0 && (
              <ul className="brf-warns">
                {a.reconcile.missingCounts.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </Sec>
        )}

        {/* ---------------------------------------------------- collateral */}
        {collateral.length > 0 && (
          <Sec id="collateral" icon={<Bank size={18} weight="bold" />} title="בטוחות" lit={lit?.section === "collateral"}>
            <div className="brf-tablewrap">
              <table className="brf-table">
                <thead>
                  <tr>
                    <th data-text>מקור</th>
                    <th data-text>סוג בטוחה</th>
                    <th>שווי</th>
                    <th data-text>מזהה תיק</th>
                  </tr>
                </thead>
                <tbody>
                  {collateral.map((c, i) => (
                    <tr key={`${c.fileId}-${i}`}>
                      <td data-text><span className="brf-td-name" title={c.bank}>{lenderLabel(c.bank) || c.bank}</span></td>
                      <td data-text>{c.type || <Dash />}</td>
                      <td><span className="brf-num">{c.value || "—"}</span></td>
                      <td data-text><span className="brf-num">{c.fileId || "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sec>
        )}

        {/* ---------------------------------------------------- the report */}
        <Sec id="meta" icon={<IdentificationCard size={18} weight="bold" />} title="פרטי הדוח" fold="הצגה" forceOpen={lit?.section === "meta"} lit={lit?.section === "meta"}>
          <div className="brf-tablewrap">
            <table className="brf-table">
              <thead>
                <tr>
                  <th data-text>לקוח</th>
                  <th data-text>ת״ז</th>
                  <th data-text>הגדרה</th>
                  <th data-text>סטטוס במערכת</th>
                  <th>תחילת איסוף</th>
                  <th>תאריך דוח</th>
                </tr>
              </thead>
              <tbody>
                {a.clients.map((c, i) => (
                  <tr key={`${c.idNumber}-${i}`}>
                    <td data-text><span className="brf-td-name">{c.name || "—"}</span></td>
                    <td data-text><span className="brf-num">{c.idNumber || "—"}</span></td>
                    <td data-text>{c.clientType || <Dash />}</td>
                    <td data-text data-heat={c.systemStatus && !/רגיל|תקין/.test(c.systemStatus) ? "hot" : undefined}>{c.systemStatus || <Dash />}</td>
                    <td><span className="brf-num">{c.collectionStart || "—"}</span></td>
                    <td><span className="brf-num">{c.reportDate || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a.legal.adminActions.length > 0 && (
            <>
              <Sub>פניות מול מערכת נתוני אשראי</Sub>
              <div className="brf-tablewrap">
                <table className="brf-table">
                  <thead>
                    <tr>
                      <th data-text>אסמכתא</th>
                      <th>תאריך</th>
                      <th data-text>סוג</th>
                      <th data-text>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.legal.adminActions.map((x, i) => (
                      <tr key={`${x.ref}-${i}`}>
                        <td data-text><span className="brf-num">{x.ref || "—"}</span></td>
                        <td><span className="brf-num">{x.date || "—"}</span></td>
                        <td data-text>{x.type || <Dash />}</td>
                        <td data-text data-heat={/הסתיים|טופל/.test(x.status || "") ? undefined : "warm"}>{x.status || <Dash />}</td>
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
            הניתוח נגזר אוטומטית מדוח ריכוז הנתונים ואינו תחליף לקריאת המסמך המקורי. סכומים המופיעים בכמה דוחות של אותו משק
            בית נספרים פעם אחת בלבד.
          </p>
        </Sec>
      </div>
    </Stage>
  );
}

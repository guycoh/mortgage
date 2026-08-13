"use client";

// The mortgage statement, read for what should change.
//
// The credit-report analysis asks whether a household is bankable. This asks the
// narrower question an advisor is actually paid to answer: given this mortgage
// exactly as it stands, what is worth moving, and what would moving it cost?
//
// The statement is the only document that can answer both halves. It prices every
// tranche and states what breaking each one costs today — so the recycle case is
// a comparison it contains outright, rather than one that has to be guessed at.
//
// Same shape as the credit analysis on purpose: findings first, each pointing at
// its own evidence, then the material those findings were drawn from.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bank,
  CalendarBlank,
  ChartPieSlice,
  Coins,
  IdentificationCard,
  Printer,
  Receipt,
  SealCheck,
  ShieldWarning,
  Target,
  TrendUp,
  Warning,
  X,
} from "@phosphor-icons/react";
import Money, { fmt } from "./Money";
import {
  SEVERITY_LABEL,
  TRACK_COLOR,
  trackKey,
  type Finding,
  type Severity,
  type StatementAnalysis,
} from "@/lib/bank-parser/analysis";
import type { BankTranche } from "@/lib/bank-parser/types";
import { PURPOSE_LABEL } from "@/lib/bank-parser/purpose";
import { FREQ_PRIME, freqLabel } from "@/lib/rate-frequency";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const rate = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}%`);

/**
 * Ease a scroll container to an offset.
 *
 * `scrollTo({behavior:"smooth"})` silently does nothing in some engines, and a
 * finding that appears to ignore the click is worse than one that never offered
 * to move. Driven by frame, with a timer that lands it anyway if frames are
 * being withheld.
 */
function easeScroll(el: HTMLElement, to: number) {
  const from = el.scrollTop;
  const dist = to - from;
  if (Math.abs(dist) < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.scrollTop = to;
    return;
  }
  const ms = Math.min(700, Math.max(260, Math.abs(dist) * 0.42));
  const t0 = performance.now();
  let framed = false;
  const step = (now: number) => {
    framed = true;
    const p = Math.min(1, (now - t0) / ms);
    el.scrollTop = from + dist * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  window.setTimeout(() => {
    if (!framed) el.scrollTop = to;
  }, 140);
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="lgr-label">{children}</div>;
}

function Section({
  id,
  icon,
  title,
  note,
  lit,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  note?: React.ReactNode;
  lit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="lgr-sec" data-hl={lit || undefined}>
      <header className="lgr-sec-head">
        <span className="lgr-sec-ico">{icon}</span>
        <h3 className="lgr-display text-[15px]">{title}</h3>
        {note && (
          <span className="text-[11.5px]" style={{ color: "var(--lgr-4)" }}>
            {note}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "neg" | "warn" | "primary";
}) {
  return (
    <div className="lgr-kpi" data-tone={tone}>
      <div className="lgr-kpi-rule" aria-hidden />
      <Label>{label}</Label>
      <div className="lgr-kpi-val">{value}</div>
      <div className="lgr-kpi-sub">{sub ?? " "}</div>
    </div>
  );
}

function FlagRow({ flag, onGo }: { flag: Finding; onGo: (f: Finding) => void }) {
  return (
    <li
      className="lgr-flag"
      data-sev={flag.severity}
      data-go=""
      role="button"
      tabIndex={0}
      onClick={() => onGo(flag)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onGo(flag);
        }
      }}
    >
      <span className="lgr-flag-sev">{SEVERITY_LABEL[flag.severity]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>
            {flag.title}
          </span>
          {flag.amount !== undefined && flag.amount > 0 && (
            <Money value={flag.amount} block={false} size={12.5} weight={700} />
          )}
        </div>
        <p className="mt-0.5 text-[12px] leading-[1.55]" style={{ color: "var(--lgr-3)" }}>
          {flag.detail}
        </p>
        <span className="lgr-flag-go">
          הצג במסמך
          <ArrowLeft size={11} weight="bold" />
        </span>
      </div>
    </li>
  );
}

function ShareBar({ parts }: { parts: { label: string; share: number; color: string; note?: string; amount: number }[] }) {
  const shown = parts.filter((p) => p.share > 0);
  if (!shown.length) return null;
  return (
    <div>
      <div className="lgr-split" role="img" aria-label="תמהיל">
        {shown.map((p) => (
          <span key={p.label} style={{ width: `${Math.max(p.share * 100, 1.5)}%`, background: p.color }} title={`${p.label} · ${pct(p.share)}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {shown.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5 text-[11.5px]">
            <i className="size-2 flex-none rounded-full" style={{ background: p.color }} />
            <span style={{ color: "var(--lgr-2)" }}>{p.label}</span>
            <span className="lgr-fig font-bold">{pct(p.share)}</span>
            <span className="lgr-fig" style={{ color: "var(--lgr-4)" }}>₪{fmt(p.amount)}</span>
            {p.note && <span style={{ color: "var(--lgr-4)" }}>· {p.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A tranche's own name for itself, falling back to its classification. */
function trackName(t: BankTranche): string {
  const raw = (t.rawTrack || "").trim();
  if (raw) return raw.length > 44 ? `${raw.slice(0, 43)}…` : raw;
  const kind = t.rateKind === "prime" ? "פריים" : t.rateKind === "variable" ? "משתנה" : "קבועה";
  const link = t.linkage === "linked" ? "צמודה" : t.linkage === "fx" ? 'מט"ח' : "לא צמודה";
  return `${kind} ${link}`;
}

export default function StatementAnalysisModal({
  analysis,
  onClose,
}: {
  analysis: StatementAnalysis;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("findings");
  const [lit, setLit] = useState<{ section: string; uids: Set<string> } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (!lit) return;
    const t = setTimeout(() => setLit(null), 2600);
    return () => clearTimeout(t);
  }, [lit]);

  const a = analysis;
  const st = a.statement;

  // One chip per distinct purpose in the file. A statement usually holds one,
  // but Leumi ships two mortgages in a single PDF and they need not agree.
  // A purpose the lender did not state gets no chip: an empty header is honest,
  // "לא צוין" beside the bank's name reads like a finding.
  const purposes = st.loans
    .filter((l) => l.purposeKind !== "unknown")
    .map((l) => PURPOSE_LABEL[l.purposeKind])
    .filter((label, i, all) => all.indexOf(label) === i);
  const eligibility = st.loans.some((l) => l.funding === "eligibility");

  const goTo = (id: string) => {
    setTab(id);
    const body = bodyRef.current;
    const el = body?.querySelector<HTMLElement>(`#${id}`);
    if (!body || !el) return;
    easeScroll(body, Math.max(0, el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 6));
  };

  const goToFinding = (f: Finding) => {
    setTab(f.section);
    setLit({ section: f.section, uids: new Set(f.uids ?? []) });
    window.setTimeout(() => goTo(f.section), 0);
  };

  const nav = [
    a.findings.length ? { id: "findings", label: "ממצאים" } : null,
    { id: "mix", label: "תמהיל" },
    { id: "tranches", label: "מסלולים" },
    a.recycle.length ? { id: "recycle", label: "כדאיות מיחזור" } : null,
    a.totals.breakFee > 0 ? { id: "fees", label: "עמלות יציאה" } : null,
    a.upcomingResets.length ? { id: "resets", label: "שינויי ריבית" } : null,
    a.totals.indexation !== 0 ? { id: "index", label: "הצמדה" } : null,
    { id: "meta", label: "פרטי המסמך" },
  ].filter(Boolean) as { id: string; label: string }[];

  const bySeverity = (["critical", "high", "medium", "info"] as Severity[])
    .map((s) => ({ s, n: a.findings.filter((f) => f.severity === s).length }))
    .filter((x) => x.n > 0);

  const row = (t: BankTranche) => (
    <tr key={t.uid} data-hl={lit?.uids.has(t.uid) || undefined} data-bad={(t.arrears ?? 0) > 0 || undefined}>
      <td>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 flex-none rounded-full" style={{ background: TRACK_COLOR[trackKey(t)] }} />
          <span className="font-semibold">{trackName(t)}</span>
        </span>
        {t.balanceApportioned && (
          <span className="lgr-chip !ms-1.5 !h-[17px] !px-1 !text-[9.5px]" title="הבנק אינו מפרט יתרה למסלול; חולקה לפי לוח הסילוקין">
            מחולק
          </span>
        )}
      </td>
      <td><Money value={t.balance ?? 0} block={false} /></td>
      <td>{t.monthly ? <Money value={t.monthly} block={false} /> : "—"}</td>
      <td className="lgr-fig" data-heat={t.rate !== null && t.rate >= 6 ? "hot" : t.rate !== null && t.rate >= 4.5 ? "warm" : undefined}>
        {rate(t.rate)}
      </td>
      <td className="lgr-fig">{t.months ?? "—"}{t.monthsDerived && t.months ? "*" : ""}</td>
      <td className="lgr-fig">{t.endDate || "—"}</td>
      <td className="lgr-fig">{t.anchor ? `${t.anchor}${t.margin !== null ? ` ${t.margin > 0 ? "+" : ""}${t.margin}%` : ""}` : "—"}</td>
      <td>{t.breakFee !== null && t.breakFee > 0 ? <Money value={t.breakFee} block={false} /> : "—"}</td>
    </tr>
  );

  return createPortal(
    <div
      dir="rtl"
      className="lgr-vars lgr-printable fixed inset-0 z-[120] grid place-items-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(14,21,36,.55)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="ניתוח תדפיס משכנתא"
      >
        <header className="lgr-head">
          <h2 className="lgr-title">ניתוח משכנתא</h2>
          <span className="lgr-chip" style={{ color: "var(--lgr-2)" }}>
            <Bank size={12} />
            {st.bankLabel}
          </span>
          {st.client.name && (
            <span className="lgr-chip" style={{ color: "var(--lgr-2)" }}>
              <IdentificationCard size={12} />
              {st.client.name}
              {st.client.idNumber && <span className="lgr-fig" style={{ color: "var(--lgr-4)" }}>{st.client.idNumber}</span>}
            </span>
          )}
          {/* מטרת ההלוואה. Four lenders word it four ways ("רכישת דירה יד שניה",
              "הלוואה לדיור לרכישה", "לווה פרטי-מגורים", "דיור"), so the chip
              carries the normalised label and the lender's own words sit in the
              loans table below. A זכאות is called out separately: it is state
              money on its own terms, not a variety of purpose. */}
          {purposes.length > 0 && (
            <span className="lgr-chip" style={{ color: "var(--lgr-2)" }}>
              <Target size={12} />
              {purposes.join(" · ")}
            </span>
          )}
          {eligibility && (
            <span className="lgr-chip" style={{ color: "var(--lgr-2)" }}>
              <SealCheck size={12} weight="fill" />
              זכאות
            </span>
          )}
          {st.statementDate && (
            <span className="text-[11.5px]" style={{ color: "var(--lgr-4)" }}>נכון ל-{st.statementDate}</span>
          )}
          <div className="lgr-noprint ms-auto flex items-center gap-1.5">
            <button className="lgr-btn lgr-btn-sm" onClick={() => window.print()}>
              <Printer size={13} weight="bold" />
              הדפסה
            </button>
            <button className="lgr-act" onClick={onClose} aria-label="סגירה">
              <X size={15} weight="bold" />
            </button>
          </div>
        </header>

        <div className="lgr-kpis">
          <Kpi
            label="יתרת המשכנתא"
            tone="primary"
            value={<Money value={a.totals.balance} size={24} weight={800} />}
            sub={`${a.live.length} מסלולים · ${st.loans.length > 1 ? `${st.loans.length} הלוואות` : "הלוואה אחת"}`}
          />
          <Kpi
            label="החזר חודשי"
            value={<Money value={a.totals.monthly} size={24} weight={800} />}
            sub={a.totals.longestMonths ? `המסלול הארוך: ${Math.round(a.totals.longestMonths / 12)} שנים` : undefined}
          />
          <Kpi
            label="ריבית ממוצעת משוקללת"
            value={<span className="lgr-fig lgr-kpi-num">{rate(a.totals.rate)}</span>}
            sub={a.totals.forecastRate !== null ? `ריבית כוללת חזויה ${rate(a.totals.forecastRate)}` : undefined}
          />
          <Kpi
            label="לסילוק מלא היום"
            value={<Money value={a.totals.payoff} size={24} weight={800} />}
            sub={`כולל ריבית ועמלות`}
          />
          <Kpi
            label="עמלת פירעון מוקדם"
            tone={a.totals.breakFee / (a.totals.balance || 1) >= 0.02 ? "warn" : undefined}
            value={<Money value={a.totals.breakFee} size={24} weight={800} />}
            sub={
              a.totals.balance > 0
                ? `${((a.totals.breakFee / a.totals.balance) * 100).toFixed(2)}% מהיתרה`
                : undefined
            }
          />
        </div>

        <div className="lgr-navbar">
          {nav.map((n) => (
            <button key={n.id} className="lgr-tab" data-on={tab === n.id || undefined} onClick={() => goTo(n.id)}>
              {n.label}
            </button>
          ))}
        </div>

        <div ref={bodyRef} className="lgr-analysis min-h-0 flex-1 overflow-y-auto">
          {a.findings.length > 0 && (
            <Section
              id="findings"
              icon={<ShieldWarning size={15} weight="fill" />}
              title="ממצאים לתשומת לב היועץ"
              lit={lit?.section === "findings"}
              note={
                <span className="flex items-center gap-2">
                  {bySeverity.map(({ s, n }) => (
                    <span key={s} className="lgr-flag-sev !static" data-sev={s}>
                      {n} {SEVERITY_LABEL[s]}
                    </span>
                  ))}
                </span>
              }
            >
              <ul className="grid gap-1.5">
                {a.findings.map((f) => (
                  <FlagRow key={f.id} flag={f} onGo={goToFinding} />
                ))}
              </ul>
            </Section>
          )}

          {/* ------------------------------------------------------------ mix */}
          <Section
            id="mix"
            icon={<ChartPieSlice size={15} weight="fill" />}
            title="תמהיל המסלולים"
            lit={lit?.section === "mix"}
            note={
              <>
                {pct(a.exposure.variableShare)} משתנה · {pct(a.exposure.linkedShare)} צמוד
                {a.exposure.fxShare > 0 && ` · ${pct(a.exposure.fxShare)} מט"ח`}
              </>
            }
          >
            <ShareBar
              parts={a.tracks.map((t) => ({
                label: t.label,
                share: t.share,
                amount: t.balance,
                color: TRACK_COLOR[t.key] ?? "#8b93a7",
                note: t.rate !== null ? rate(t.rate) : undefined,
              }))}
            />
            <div className="mt-3 overflow-x-auto">
              <table className="lgr-table lgr-mini">
                <thead>
                  <tr>
                    <th>מסלול</th>
                    <th>מסלולים</th>
                    <th>יתרה</th>
                    <th>חלק</th>
                    <th>החזר חודשי</th>
                    <th>ריבית</th>
                  </tr>
                </thead>
                <tbody>
                  {a.tracks.map((t) => (
                    <tr key={t.key}>
                      <td>
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <i className="size-2 rounded-full" style={{ background: TRACK_COLOR[t.key] }} />
                          {t.label}
                        </span>
                      </td>
                      <td className="lgr-fig">{t.count}</td>
                      <td><Money value={t.balance} block={false} /></td>
                      <td className="lgr-fig">{pct(t.share)}</td>
                      <td><Money value={t.monthly} block={false} /></td>
                      <td className="lgr-fig">{rate(t.rate)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="font-bold">סה״כ</td>
                    <td className="lgr-fig font-bold">{a.live.length}</td>
                    <td><Money value={a.totals.balance} block={false} weight={800} /></td>
                    <td className="lgr-fig font-bold">100%</td>
                    <td><Money value={a.totals.monthly} block={false} weight={800} /></td>
                    <td className="lgr-fig font-bold">{rate(a.totals.rate)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          {/* ------------------------------------------------------- tranches */}
          <Section
            id="tranches"
            icon={<Coins size={15} weight="fill" />}
            title="פירוט המסלולים"
            lit={lit?.section === "tranches"}
            note={a.live.some((t) => t.monthsDerived) ? "* יתרת התקופה חושבה מתאריך הסיום" : undefined}
          >
            <div className="overflow-x-auto">
              <table className="lgr-table lgr-mini">
                <thead>
                  <tr>
                    <th>מסלול</th>
                    <th>יתרה</th>
                    <th>החזר חודשי</th>
                    <th>ריבית</th>
                    <th>חודשים</th>
                    <th>סיום</th>
                    <th>עוגן ומרווח</th>
                    <th>עמלת יציאה</th>
                  </tr>
                </thead>
                <tbody>{a.live.map(row)}</tbody>
              </table>
            </div>
          </Section>

          {/* -------------------------------------------------------- recycle */}
          {a.recycle.length > 0 && (
            <Section
              id="recycle"
              icon={<TrendUp size={15} weight="bold" />}
              title="כדאיות מיחזור לפי מסלול"
              lit={lit?.section === "recycle"}
              note="מדורג לפי ריבית, ואז לפי כמה זול לצאת"
            >
              <p className="mb-2.5 text-[12px] leading-relaxed" style={{ color: "var(--lgr-3)" }}>
                עמלת יציאה נמדדת כאן בחודשי ריבית של אותו מסלול, ולא בשקלים: עמלה בגובה חודשיים ריבית על
                מסלול ב-7% היא זולה, אותה עמלה על מסלול ב-2% אינה. כך אפשר להשוות בין מסלולים בגדלים שונים.
              </p>
              <div className="overflow-x-auto">
                <table className="lgr-table lgr-mini">
                  <thead>
                    <tr>
                      <th>מסלול</th>
                      <th>יתרה</th>
                      <th>ריבית</th>
                      <th>עמלת יציאה</th>
                      <th>שווה ל-</th>
                      <th>ריבית שנותרה לשלם</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.recycle.map((c) => (
                      <tr key={c.tranche.uid} data-hl={lit?.uids.has(c.tranche.uid) || undefined}>
                        <td>
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <i className="size-2 rounded-full" style={{ background: TRACK_COLOR[trackKey(c.tranche)] }} />
                            {trackName(c.tranche)}
                          </span>
                        </td>
                        <td><Money value={c.tranche.balance ?? 0} block={false} /></td>
                        <td className="lgr-fig" data-heat={(c.tranche.rate ?? 0) >= 6 ? "hot" : (c.tranche.rate ?? 0) >= 4.5 ? "warm" : undefined}>
                          {rate(c.tranche.rate)}
                        </td>
                        <td>{c.tranche.breakFee ? <Money value={c.tranche.breakFee} block={false} /> : "ללא"}</td>
                        <td className="lgr-fig">
                          {c.feeInMonthsOfInterest === null
                            ? "—"
                            : c.feeInMonthsOfInterest === 0
                              ? "—"
                              : `${c.feeInMonthsOfInterest} חודשי ריבית`}
                        </td>
                        <td>{c.remainingInterest !== null ? <Money value={c.remainingInterest} block={false} /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ----------------------------------------------------------- fees */}
          {a.totals.breakFee > 0 && (
            <Section
              id="fees"
              icon={<Receipt size={15} weight="fill" />}
              title="עמלות פירעון מוקדם"
              lit={lit?.section === "fees"}
              note={`סה"כ ${fmt(a.totals.breakFee)} ₪`}
            >
              <div className="overflow-x-auto">
                <table className="lgr-table lgr-mini">
                  <thead>
                    <tr>
                      <th>מסלול</th>
                      <th>עמלה</th>
                      <th>מרכיבי העמלה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.live
                      .filter((t) => (t.breakFee ?? 0) > 0)
                      .map((t) => (
                        <tr key={t.uid} data-hl={lit?.uids.has(t.uid) || undefined}>
                          <td className="font-semibold">{trackName(t)}</td>
                          <td><Money value={t.breakFee ?? 0} block={false} /></td>
                          <td style={{ color: "var(--lgr-3)" }}>
                            {t.breakFeeParts.length
                              ? t.breakFeeParts.map((p) => `${p.label} ₪${fmt(p.amount)}`).join(" · ")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    {a.totals.operationalFee > 0 && (
                      <tr>
                        <td className="font-semibold">עמלה תפעולית</td>
                        <td><Money value={a.totals.operationalFee} block={false} /></td>
                        <td style={{ color: "var(--lgr-3)" }}>
                          תשלום חד-פעמי ברמת ההלוואה, שאינו משויך למסלול
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {a.freeToBreak.length > 0 && (
                <p className="mt-2.5 text-[12px]" style={{ color: "var(--pos)" }}>
                  {a.freeToBreak.length} מסלולים ללא עמלת יציאה כלל — ₪{fmt(a.freeToBreak.reduce((s, t) => s + (t.balance ?? 0), 0))} שניתן להזיז בלי עלות.
                </p>
              )}
            </Section>
          )}

          {/* --------------------------------------------------------- resets */}
          {a.upcomingResets.length > 0 && (
            <Section
              id="resets"
              icon={<CalendarBlank size={15} weight="fill" />}
              title="שינויי ריבית בשנה הקרובה"
              lit={lit?.section === "resets"}
              note={`₪${fmt(a.exposure.resettingWithinYear)} מהיתרה`}
            >
              <div className="overflow-x-auto">
                <table className="lgr-table lgr-mini">
                  <thead>
                    <tr>
                      <th>מסלול</th>
                      <th>יתרה</th>
                      <th>ריבית כיום</th>
                      <th>מועד השינוי</th>
                      <th>תדירות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.upcomingResets.map((t) => (
                      <tr key={t.uid} data-hl={lit?.uids.has(t.uid) || undefined}>
                        <td className="font-semibold">{trackName(t)}</td>
                        <td><Money value={t.balance ?? 0} block={false} /></td>
                        <td className="lgr-fig">{rate(t.rate)}</td>
                        <td className="lgr-fig">{t.nextReset || "—"}</td>
                        <td>{freqLabel(t.resetMonths) || (t.rateKind === "prime" ? FREQ_PRIME : "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed" style={{ color: "var(--lgr-3)" }}>
                מועד שינוי הריבית הוא גם המועד שבו עמלת ההיוון מתאפסת. פירעון או מיחזור באותו מועד חוסך את
                מרכיב ההיוון של העמלה במלואו.
              </p>
            </Section>
          )}

          {/* ---------------------------------------------------------- index */}
          {a.totals.indexation !== 0 && (
            <Section
              id="index"
              icon={<TrendUp size={15} weight="fill" />}
              title="הצמדה ומדדים"
              lit={lit?.section === "index"}
              note={`${(a.exposure.indexationDrag * 100).toFixed(1)}% מעל הקרן`}
            >
              <div className="lgr-facts mb-3">
                <div>
                  <Label>קרן</Label>
                  <Money value={a.totals.principal} size={17} weight={800} />
                </div>
                <div>
                  <Label>הצמדה שנצברה</Label>
                  <Money value={a.totals.indexation} size={17} weight={800} color={a.totals.indexation > 0 ? "var(--neg)" : undefined} />
                </div>
                <div>
                  <Label>ריבית לסילוק</Label>
                  <Money value={a.totals.accruedInterest} size={17} weight={800} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="lgr-table lgr-mini">
                  <thead>
                    <tr>
                      <th>מסלול</th>
                      <th>קרן</th>
                      <th>הצמדה</th>
                      <th>מדד בסיס</th>
                      <th>מדד נוכחי</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.live
                      .filter((t) => t.baseIndex || t.indexation)
                      .map((t) => (
                        <tr key={t.uid} data-hl={lit?.uids.has(t.uid) || undefined}>
                          <td className="font-semibold">{trackName(t)}</td>
                          <td><Money value={t.principal ?? 0} block={false} /></td>
                          <td>{t.indexation ? <Money value={t.indexation} block={false} /> : "—"}</td>
                          <td className="lgr-fig">{t.baseIndex ?? "—"}</td>
                          <td className="lgr-fig">{t.currentIndex ?? "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ----------------------------------------------------------- meta */}
          <Section id="meta" icon={<IdentificationCard size={15} weight="bold" />} title="פרטי המסמך" lit={lit?.section === "meta"}>
            <div className="overflow-x-auto">
              <table className="lgr-table lgr-mini">
                <thead>
                  <tr>
                    <th>בנק</th>
                    <th>לקוח</th>
                    <th>ת״ז</th>
                    <th>חשבון / תיק</th>
                    <th>תאריך המסמך</th>
                    <th>הלוואות</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">{st.bankLabel}</td>
                    <td>{st.client.name || "—"}</td>
                    <td className="lgr-fig">{st.client.idNumber || "—"}</td>
                    <td className="lgr-fig">{st.accountNumber || "—"}</td>
                    <td className="lgr-fig">{st.statementDate || "—"}</td>
                    <td className="lgr-fig">{st.loans.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {st.loans.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <Label>יתרות כפי שהודפסו על ידי הבנק</Label>
                <table className="lgr-table lgr-mini mt-1.5">
                  <thead>
                    <tr>
                      <th>הלוואה</th>
                      <th className="text-start">מטרה</th>
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
                        <td className="lgr-fig">{l.loanNumber}</td>
                        {/* The lender's own wording, because on this table an
                            advisor is reconciling against the printed page. The
                            normalised label goes in the header chip instead. */}
                        <td className="text-start" style={{ color: "var(--lgr-3)" }}>
                          {l.purpose || PURPOSE_LABEL[l.purposeKind]}
                          {l.funding === "eligibility" && (
                            <span className="lgr-fig" style={{ color: "var(--lgr-4)" }}> · זכאות</span>
                          )}
                        </td>
                        <td className="lgr-fig">{l.tranches.length}</td>
                        <td>{l.printed.balance ? <Money value={l.printed.balance} block={false} /> : "—"}</td>
                        <td>{l.printed.payoff ? <Money value={l.printed.payoff} block={false} /> : "—"}</td>
                        <td>{l.printed.monthly ? <Money value={l.printed.monthly} block={false} /> : "—"}</td>
                        <td>{l.printed.operationalFee ? <Money value={l.printed.operationalFee} block={false} /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {a.warnings.length > 0 && (
              <ul className="mt-2.5 grid gap-1">
                {a.warnings.map((w, i) => (
                  <li key={`${i}:${w}`} className="flex items-start gap-1.5 text-[11.5px]" style={{ color: "var(--lgr-4)" }}>
                    <Warning size={12} weight="fill" className="mt-0.5 flex-none" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: "var(--lgr-4)" }}>
              הניתוח נגזר אוטומטית מתדפיס הבנק ואינו תחליף לקריאת המסמך המקורי. עמלות פירעון מוקדם משתנות
              מדי יום ותקפות למועד המסמך בלבד.
            </p>
          </Section>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

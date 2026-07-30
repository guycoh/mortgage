"use client";

// The page you turn around and show the client.
//
// Not a smaller version of the analysis — a different document for a different
// reader. The analysis is written for someone who will act on it and wants the
// evidence; this is written for someone seeing their own finances laid out for
// the first time, across a desk, in about a minute.
//
// It selects nothing and decides nothing. Every row, every sentence and both
// footer figures come from `analysis.clientView`, built in the engine beside the
// flags. That is deliberate: while this component chose its own rows and wrote its
// own worries with its own thresholds, it announced ₪372,873 of arrears above rows
// accounting for ₪33,825, printed a ₪799,555 footer over ₪451,962 of visible
// balances, and silently omitted five of the nine critical findings. All three were
// the same bug — two populations with no arithmetic tying them together.
//
// One debt per lender for mortgages and loans: a מסלול is an artefact of how the
// bank booked the loan, and fourteen near-identical rows tell a client nothing they
// would recognise. Cards are the opposite — one row per facility, because what each
// card costs every month is the whole point of that section.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Printer, WarningCircle, X } from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa4test/components/bankIcons";
import { shortBank } from "@/app/aa4test/debtTags";
import { rateHeat, utilisationHeat } from "@/lib/verdicts";
import Money from "./Money";
import type { Analysis, ClientRow, ClientSection } from "../lib/analysis";

/** Lenders past this fold into one line — the page has to stay a page. */
const MAX_ROWS = 5;

const ils = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * How much longer this runs, said properly.
 *
 * Only amortising debts have a remaining term — a revolving facility rolls
 * indefinitely, and the report's "months" for one is an artefact, not a fact to
 * tell a client. And Hebrew does not say "נותרו 1 תשלומים".
 */
function remaining(r: ClientRow): string {
  if (r.family === "card" || !r.months || r.months <= 0) return "";
  if (r.months === 1) return "נותר תשלום אחד";
  if (r.months < 24) return `נותרו ${r.months} תשלומים`;
  return `עוד כ-${Math.round(r.months / 12)} שנים`;
}

const NOUN: Record<ClientRow["family"], [string, string]> = {
  mortgage: ["מסלול", "מסלולים"],
  loan: ["הלוואה", "הלוואות"],
  card: ["מסגרת", "מסגרות"],
};

/** "ריבית 5.2%" — or the spread, when one lender holds several at once. */
function rateText(r: ClientRow): string {
  if (r.minRate === null || r.maxRate === null || r.maxRate <= 0) return "";
  const lo = r.minRate.toFixed(1).replace(/\.0$/, "");
  const hi = r.maxRate.toFixed(1).replace(/\.0$/, "");
  return lo === hi ? `ריבית ${lo}%` : `ריבית ${lo}%–${hi}%`;
}

/* ------------------------------------------------- mortgages and loans */

function LenderRow({ r }: { r: ClientRow }) {
  const [one, many] = NOUN[r.family];
  const rate = rateText(r);
  const dear = rateHeat(r.maxRate, r.family) === "hot";
  const bits = [r.parts > 1 ? `${r.parts} ${many}` : one, remaining(r)].filter(Boolean);

  return (
    <li className="lgr-cs-row">
      <BankIcon source={r.bank} size={30} />
      <div className="min-w-0 flex-1">
        <div className="lgr-cs-bank">{shortBank(r.bank) || r.bank}</div>
        <div className="lgr-cs-meta">
          {bits.join(" · ")}
          {rate && (
            <>
              {bits.length ? " · " : ""}
              <span className={dear ? "lgr-cs-warn" : undefined}>{rate}</span>
            </>
          )}
          {r.late && (
            <span className="lgr-cs-warn">
              {" · בפיגור"}
              {r.overdue > 0 ? ` ${ils(r.overdue)} ₪` : ""}
            </span>
          )}
        </div>
      </div>
      <div className="lgr-cs-amt">
        <Money value={r.balance} size={17} weight={800} />
      </div>
      <div className="lgr-cs-amt">
        <Money value={r.monthly} size={17} weight={800} color={r.late ? "var(--neg)" : undefined} />
      </div>
    </li>
  );
}

/* ---------------------------------------------------- one card, one row */

/**
 * What this facility costs, and what it would cost if it were used.
 *
 * Two rates rather than one, because the report answers two different questions and
 * collapsing them lies in both directions: a card drawn on an interest-free track
 * is not a free card, and a rate quoted on an unused limit is not the price of the
 * balance. A facility with no drawn rate on record says "עד X%" rather than passing
 * off the dearest quote as what is being paid.
 */
function cardPricing(r: ClientRow): { text: string; hot: boolean } | null {
  const drawn = r.rate;
  const max = r.rateMaxQuoted;
  if (drawn !== null && drawn > 0) {
    const hot = rateHeat(drawn, "card") === "hot";
    const tail = max !== null && max > drawn ? ` · עד ${max.toFixed(2)}% על יתר המסגרת` : "";
    return { text: `ריבית ${drawn.toFixed(2)}% על היתרה${tail}`, hot };
  }
  if (r.interestFree && max !== null)
    return { text: `היתרה ללא ריבית · עד ${max.toFixed(2)}% על יתר המסגרת`, hot: rateHeat(max, "card") === "hot" };
  if (max !== null) return { text: `עד ${max.toFixed(2)}%`, hot: rateHeat(max, "card") === "hot" };
  return null;
}

function CardRow({ r }: { r: ClientRow }) {
  const price = cardPricing(r);
  const util = r.utilization === null ? null : r.utilization / 100;
  const utilHeat = utilisationHeat(util);
  // A balance drawn against a ceiling the document prints as zero is the one case
  // where the balance itself is the alarm.
  const noCeiling = r.reported.limit && r.limit === 0 && r.balance > 0;
  const enforced = r.remarks.some((x) => /הוצאה לפועל|לא התקבל כל תשלום/.test(x));

  const meta: React.ReactNode[] = [];
  if (r.reported.limit && r.limit > 0) {
    meta.push(
      <span key="limit">
        מסגרת {ils(r.limit)} ₪
        {util !== null && (
          <span className={utilHeat === "hot" ? "lgr-cs-warn" : utilHeat === "warm" ? "lgr-cs-warm" : undefined}>
            {" "}· נוצלו {Math.round(r.utilization ?? 0)}%
          </span>
        )}
      </span>
    );
  } else if (noCeiling) {
    meta.push(
      <span key="nolimit" className="lgr-cs-warn">
        אין מסגרת מאושרת בדוח
      </span>
    );
  }
  // Only worth saying when the month told a different story than the closing date.
  if (r.reported.peak && r.peak > r.balance * 1.15)
    meta.push(<span key="peak">שיא בחודש {ils(r.peak)} ₪</span>);
  if (price) meta.push(<span key="rate" className={price.hot ? "lgr-cs-warn" : undefined}>{price.text}</span>);
  if (r.late)
    meta.push(
      <span key="late" className="lgr-cs-warn">
        בפיגור {r.overdue > 0 ? `${ils(r.overdue)} ₪` : ""}
        {r.arrearsRange ? ` · ${r.arrearsRange}` : ""}
      </span>
    );
  if (enforced)
    meta.push(
      <span key="enf" className="lgr-cs-warn">
        בטיפול ההוצאה לפועל
      </span>
    );

  return (
    <li className="lgr-cs-row" data-alarm={r.late || enforced || undefined}>
      <BankIcon source={r.bank} size={30} />
      <div className="min-w-0 flex-1">
        <div className="lgr-cs-bank">
          {shortBank(r.bank) || r.bank}
          <span className="lgr-cs-kind">{r.type}</span>
        </div>
        <div className="lgr-cs-meta lgr-cs-meta-wrap">
          {meta.map((m, i) => (
            <span key={i} className="lgr-cs-bit">
              {m}
            </span>
          ))}
        </div>
      </div>

      <div className="lgr-cs-amt">
        <Money value={r.balance} size={17} weight={800} color={noCeiling ? "var(--neg)" : undefined} />
      </div>

      {/* The number the client asked about: what this card takes each month. */}
      <div className="lgr-cs-amt">
        {r.reported.monthly ? (
          <>
            <Money
              value={r.monthly}
              size={17}
              weight={800}
              color={r.rolled > 0 ? "var(--neg)" : undefined}
            />
            {r.rolled > 0 && <div className="lgr-cs-rolled">מזה {ils(r.rolled)} ₪ לא נפרעו</div>}
          </>
        ) : (
          <span className="lgr-cs-none">לא דווח</span>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------- the page */

function Section({ sec }: { sec: ClientSection }) {
  const shown = sec.rows.slice(0, MAX_ROWS);
  const rest = sec.rows.slice(MAX_ROWS);
  const restMonthly = rest.reduce((s, r) => s + r.monthly, 0);
  const restBalance = rest.reduce((s, r) => s + r.balance, 0);
  const total = sec.rows.reduce((s, r) => s + r.balance, 0);
  const totalMonthly = sec.rows.reduce((s, r) => s + r.monthly, 0);

  return (
    <section className="lgr-cs-group">
      <h3 className="lgr-cs-title" style={{ ["--fam" as string]: sec.accent }}>
        {sec.title}
      </h3>
      <div className="lgr-cs-cols" aria-hidden>
        <span className="lgr-cs-colspacer" />
        <span className="flex-1" />
        <span className="lgr-cs-amt">יתרה</span>
        <span className="lgr-cs-amt">לחודש</span>
      </div>
      <ul>
        {shown.map((r) =>
          sec.key === "card" ? <CardRow key={r.uids.join()} r={r} /> : <LenderRow key={r.uids.join()} r={r} />
        )}
        {rest.length > 0 && (
          <li className="lgr-cs-more">
            ועוד {rest.length} {rest.length === 1 ? "מלווה" : "מלווים"}
            {restBalance > 0 && (
              <>
                {" · "}
                <Money value={restBalance} block={false} weight={700} /> יתרה
              </>
            )}
            {restMonthly > 0 && (
              <>
                {" · "}
                <Money value={restMonthly} block={false} weight={700} /> לחודש
              </>
            )}
          </li>
        )}
      </ul>
      {/* A per-section subtotal, so the footer is arrived at rather than asserted. */}
      {sec.rows.length > 1 && (
        <div className="lgr-cs-sub">
          <span className="flex-1">סה״כ {sec.title}</span>
          <span className="lgr-cs-amt">
            <Money value={total} size={14} weight={800} />
          </span>
          <span className="lgr-cs-amt">
            <Money value={totalMonthly} size={14} weight={800} />
          </span>
        </div>
      )}
    </section>
  );
}

export default function ClientSummaryModal({
  analysis,
  onClose,
}: {
  analysis: Analysis;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const a = analysis;
  const v = a.clientView;

  return createPortal(
    <div
      dir="rtl"
      className="lgr-vars lgr-printable fixed inset-0 z-[130] grid place-items-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(14,21,36,.55)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="סיכום ללקוח"
      >
        <header className="lgr-head">
          <div className="min-w-0">
            <h2 className="lgr-display text-[19px] leading-tight">
              {a.clients[0]?.name || "סיכום ההתחייבויות"}
            </h2>
            <div className="mt-0.5 text-[12px]" style={{ color: "var(--lgr-4)" }}>
              סיכום ההתחייבויות{a.clients[0]?.reportDate ? ` · נכון ל-${a.clients[0].reportDate}` : ""}
            </div>
          </div>
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

        <div className="lgr-cs min-h-0 flex-1 overflow-y-auto">
          {v.sections.map((sec) => (
            <Section key={sec.title} sec={sec} />
          ))}

          {!v.sections.length && (
            <p className="px-1 py-6 text-center text-[14px]" style={{ color: "var(--lgr-3)" }}>
              לא נמצאו התחייבויות פעילות בדוח.
            </p>
          )}

          {v.worries.length > 0 && (
            <section className="lgr-cs-worry">
              <div className="lgr-cs-worry-head">
                <WarningCircle size={17} weight="fill" />
                מה חשוב לשים לב אליו
              </div>
              <ul>
                {v.worries.map((w) => (
                  <li key={w.say} data-sev={w.severity}>
                    {w.say}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="lgr-cs-foot">
          <div>
            <div className="lgr-cs-foot-cap">סך ההתחייבויות</div>
            <Money value={v.footer.balance} size={19} weight={800} style={{ textAlign: "start" }} block={false} />
            {/* Cannot normally fire — the engine asserts it. Rendered rather than
                trusted, so a future regression is visible instead of silent. */}
            {v.unshownBalance !== 0 && (
              <div className="lgr-cs-none">
                מזה {ils(Math.abs(v.unshownBalance))} ₪ ללא שורה בעמוד
              </div>
            )}
            {/* Not part of the total, but the reason the mix board shows a larger
                one — said here so the two never differ without explanation. */}
            {v.guaranteedBalance > 0 && (
              <div className="lgr-cs-none">
                ובנוסף {ils(v.guaranteedBalance)} ₪ בערבות — לא ההחזר שלכם
              </div>
            )}
          </div>
          <div className="text-end">
            <div className="lgr-cs-foot-cap">יוצא מהחשבון כל חודש</div>
            <Money value={v.footer.monthly} size={22} weight={800} style={{ textAlign: "start" }} block={false} />
          </div>
        </footer>
      </motion.div>
    </div>,
    document.body
  );
}

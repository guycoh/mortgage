"use client";

// Two reads on the same mix, both keyed to the track palette so a colour means
// the same thing everywhere on the page:
//   · composition — how the money splits across tracks and families, right now
//   · runoff      — how the balance and the payment behave over the term
// Both series come from calculateLoan, so the charts and the grid can never
// disagree about the maths.

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { Bank, ChartPieSlice, HandCoins, TrendDown } from "@phosphor-icons/react";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import Money from "./Money";
import type { RunoffSeries } from "./RunoffChart";
import { FAMILY, PATH_LABEL, TRACK_HEX, type ImportedLoan } from "../lib/credit";

// ECharts is canvas-only — browser render, no SSR pass.
const RunoffChart = dynamic(() => import("./RunoffChart"), {
  ssr: false,
  loading: () => <div className="ink-skel m-3 h-[244px]" />,
});

const TRACKS = [1, 2, 3, 4, 5] as const;

/* ------------------------------------------------------------- composition */

function Composition({ loans }: { loans: ImportedLoan[] }) {
  const total = loans.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const byTrack = TRACKS.map((id) => {
    const rows = loans.filter((l) => l.path_id === id);
    const amount = rows.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const monthly = rows.reduce((s, l) => s + calculateLoan(l, 0).monthlyPayment, 0);
    return { id, amount, monthly, count: rows.length };
  }).filter((t) => t.amount > 0);

  if (!total) {
    return <div className="ink-empty">הזינו סכומים או גררו דוח כדי לראות את הרכב התמהיל</div>;
  }

  return (
    <div className="px-3.5 pb-3.5 pt-3">
      {/* one bar, every track in proportion */}
      <div className="ink-bar" dir="ltr">
        {byTrack.map((t, i) => {
          const pct = (t.amount / total) * 100;
          return (
            <motion.div
              key={t.id}
              className="ink-bar-seg"
              style={{ background: TRACK_HEX[t.id] }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.62, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              title={`${PATH_LABEL[t.id]} · ${Math.round(t.amount).toLocaleString("he-IL")} ₪`}
            >
              {pct > 8.5 && <span className="ink-bar-pct">{Math.round(pct)}%</span>}
            </motion.div>
          );
        })}
      </div>

      {/* the legend doubles as the numbers table */}
      <div className="mt-3 flex flex-col">
        {byTrack.map((t) => (
          <div
            key={t.id}
            className="grid items-center gap-x-2 border-b py-[5px] text-[12px] last:border-b-0"
            style={{ borderColor: "var(--line)", gridTemplateColumns: "auto 1fr auto auto" }}
          >
            <span className="ink-dot" style={{ background: TRACK_HEX[t.id] }} />
            <span className="flex items-baseline gap-1.5" style={{ color: "var(--ink-2)" }}>
              {PATH_LABEL[t.id]}
              <span className="ink-fig text-[10.5px]" style={{ color: "var(--ink-4)" }}>
                ({t.count})
              </span>
            </span>
            <Money value={t.amount} weight={600} block={false} style={{ minWidth: 92 }} />
            <Money
              value={t.monthly}
              per="ח׳"
              block={false}
              size={11.5}
              color="var(--ink-3)"
              style={{ minWidth: 86 }}
            />
          </div>
        ))}
      </div>

      {/* the same money, split the other way: by family */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["mortgage", "loan"] as const).map((k) => {
          const rows = loans.filter((l) => (k === "loan" ? l.group === "loan" : l.group !== "loan"));
          const amount = rows.reduce((s, l) => s + (Number(l.amount) || 0), 0);
          const monthly = rows.reduce((s, l) => s + calculateLoan(l, 0).monthlyPayment, 0);
          const pct = total ? Math.round((amount / total) * 100) : 0;
          const fam = FAMILY[k];
          return (
            <div
              key={k}
              className="relative overflow-hidden rounded-[var(--r-sm)] border px-2.5 py-2"
              style={{ borderColor: fam.line, background: fam.tint }}
            >
              {/* the share, drawn as a quiet fill behind the figure */}
              <motion.span
                className="absolute inset-y-0 start-0 block"
                style={{ background: fam.color, opacity: 0.07 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                aria-hidden
              />
              <div className="relative flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: fam.text }}>
                {k === "mortgage" ? <Bank size={12} weight="fill" /> : <HandCoins size={12} weight="fill" />}
                {fam.plural}
                <span className="ink-fig ms-auto opacity-80">{pct}%</span>
              </div>
              <Money value={amount} className="relative mt-1" size={16} weight={600} color="var(--ink)" style={{ textAlign: "start" }} />
              <Money value={monthly} per="ח׳" className="relative" size={11.5} color="var(--ink-3)" style={{ textAlign: "start" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ runoff */

function Runoff({ loans, annualInflation }: { loans: ImportedLoan[]; annualInflation: number }) {
  const [mode, setMode] = useState<"balance" | "payment">("balance");

  const { months, series, maxMonth } = useMemo(() => {
    const priced = loans.filter((l) => (Number(l.amount) || 0) > 0 && (Number(l.months) || 0) > 0);
    const results = priced.map((l) => ({ loan: l, res: calculateLoan(l, annualInflation) }));
    const longest = results.reduce((m, r) => Math.max(m, r.res.schedule.length), 0);
    if (!longest) return { months: [] as number[], series: [] as RunoffSeries[], maxMonth: 0 };

    // Sampled so a 30-year mix doesn't render 360 points per track.
    const step = longest > 240 ? 3 : longest > 96 ? 2 : 1;
    const ms: number[] = [];
    for (let m = 1; m <= longest; m += step) ms.push(m);

    const out: RunoffSeries[] = [];
    for (const id of TRACKS) {
      const mine = results.filter((r) => r.loan.path_id === id);
      if (!mine.length) continue;
      const values = ms.map((m) =>
        mine.reduce((s, { res }) => {
          const row = res.schedule[m - 1];
          if (!row) return s;
          return s + (mode === "balance" ? row.closingBalance : row.payment);
        }, 0)
      );
      if (values.some((v) => v > 0)) out.push({ id, values: values.map((v) => Math.round(v)) });
    }
    return { months: ms, series: out, maxMonth: longest };
  }, [loans, annualInflation, mode]);

  if (!months.length) {
    return <div className="ink-empty">צריך סכום ומספר חודשים כדי לצייר את מהלך התמהיל</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 px-3.5 pt-3">
        {(
          [
            ["balance", "יתרת חוב"],
            ["payment", "החזר חודשי"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className="ink-tab !h-7 !text-[11.5px]" data-on={mode === k} onClick={() => setMode(k)}>
            {label}
          </button>
        ))}
        <span className="ms-auto flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-4)" }}>
          <span className="ink-fig">{Math.round(maxMonth / 12)}</span> שנים
        </span>
      </div>

      <div className="px-1 pb-1 pt-2">
        <RunoffChart months={months} series={series} mode={mode} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- shell */

export default function Charts({
  loans,
  annualInflation,
}: {
  loans: ImportedLoan[];
  annualInflation: number;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_1.3fr]">
      <section className="ink-card overflow-hidden">
        <header className="ink-head">
          <ChartPieSlice size={14} weight="fill" style={{ color: "var(--ink-3)" }} />
          <h2 className="ink-title">הרכב התמהיל</h2>
          <span className="ink-sub ms-auto">לפי מסלול</span>
        </header>
        <Composition loans={loans} />
      </section>

      <section className="ink-card overflow-hidden">
        <header className="ink-head">
          <TrendDown size={14} weight="fill" style={{ color: "var(--ink-3)" }} />
          <h2 className="ink-title">מהלך התמהיל</h2>
          <span className="ink-sub ms-auto">מצטבר לפי מסלול</span>
        </header>
        <Runoff loans={loans} annualInflation={annualInflation} />
      </section>
    </div>
  );
}

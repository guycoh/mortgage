"use client";

// Two reads on the same mix, both keyed to the track palette so a colour means
// the same thing everywhere on the page:
//   · composition — how the money splits across tracks, right now
//   · runoff      — how the balance and the payment behave over the term
// Both series come from calculateLoan, so the charts and the grid can never
// disagree about the maths.

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import { Bank, ChartPieSlice, HandCoins, TrendDown } from "@phosphor-icons/react";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import { FAMILY, PATH_LABEL, TRACK_HEX, type ImportedLoan } from "../lib/credit";

const TRACKS = [1, 2, 3, 4, 5] as const;

const nis = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;
const short = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `${Math.round(n / 1000)}K`
      : String(Math.round(n));

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
    return <div className="fin-empty">הזינו סכומים או גררו דוח כדי לראות את הרכב התמהיל</div>;
  }

  return (
    <div className="px-3.5 pb-3.5 pt-3">
      {/* one bar, every track in proportion */}
      <div className="flex h-11 w-full overflow-hidden rounded-md border" style={{ borderColor: "var(--line-2)" }} dir="ltr">
        {byTrack.map((t, i) => (
          <motion.div
            key={t.id}
            className="relative grid place-items-center"
            style={{ background: TRACK_HEX[t.id] }}
            initial={{ width: 0 }}
            animate={{ width: `${(t.amount / total) * 100}%` }}
            transition={{ duration: 0.65, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            title={`${PATH_LABEL[t.id]} · ${nis(t.amount)}`}
          >
            {t.amount / total > 0.085 && (
              <span className="fin-fig text-[11px] font-bold text-white">
                {Math.round((t.amount / total) * 100)}%
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* the legend doubles as the numbers table */}
      <div className="mt-2.5 flex flex-col">
        {byTrack.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 border-b py-1.5 text-[12px] last:border-b-0"
            style={{ borderColor: "var(--line)" }}
          >
            <span className="fin-dot" style={{ background: TRACK_HEX[t.id] }} />
            <span style={{ color: "var(--ink-2)" }}>{PATH_LABEL[t.id]}</span>
            <span className="fin-fig text-[10.5px]" style={{ color: "var(--ink-4)" }}>
              ({t.count})
            </span>
            <span className="fin-fig ms-auto font-bold">{nis(t.amount)}</span>
            <span className="fin-fig w-[86px] text-left text-[11.5px]" style={{ color: "var(--ink-3)" }}>
              {nis(t.monthly)}/ח׳
            </span>
          </div>
        ))}
      </div>

      {/* the same money, split the other way: by family */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["mortgage", "loan"] as const).map((k) => {
          const rows = loans.filter((l) => (k === "loan" ? l.group === "loan" : l.group !== "loan"));
          const amount = rows.reduce((s, l) => s + (Number(l.amount) || 0), 0);
          const monthly = rows.reduce((s, l) => s + calculateLoan(l, 0).monthlyPayment, 0);
          const fam = FAMILY[k];
          return (
            <div
              key={k}
              className="rounded-[var(--r-sm)] border px-2.5 py-2"
              style={{ borderColor: fam.line, background: fam.tint }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: fam.color }}>
                {k === "mortgage" ? <Bank size={12} weight="fill" /> : <HandCoins size={12} weight="fill" />}
                {fam.plural}
                <span className="fin-fig ms-auto opacity-70">
                  {total ? Math.round((amount / total) * 100) : 0}%
                </span>
              </div>
              <div className="fin-fig mt-1 text-[15px] font-bold" style={{ color: "var(--ink)" }}>
                {Math.round(amount).toLocaleString("he-IL")}
                <span className="fin-cur">₪</span>
              </div>
              <div className="fin-fig text-[11px]" style={{ color: "var(--ink-3)" }}>
                {Math.round(monthly).toLocaleString("he-IL")} ₪/ח׳
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ runoff */

type Row = { month: number; balance: number; payment: number } & Record<string, number>;

function Runoff({ loans, annualInflation }: { loans: ImportedLoan[]; annualInflation: number }) {
  const [mode, setMode] = useState<"balance" | "payment">("balance");

  const { data, activeTracks, maxMonth } = useMemo(() => {
    const priced = loans.filter((l) => (Number(l.amount) || 0) > 0 && (Number(l.months) || 0) > 0);
    const results = priced.map((l) => ({ loan: l, res: calculateLoan(l, annualInflation) }));
    const longest = results.reduce((m, r) => Math.max(m, r.res.schedule.length), 0);
    if (!longest) return { data: [] as Row[], activeTracks: [] as number[], maxMonth: 0 };

    // Sampled so a 30-year mix doesn't render 360 points.
    const step = longest > 240 ? 3 : longest > 96 ? 2 : 1;
    const rows: Row[] = [];
    for (let m = 1; m <= longest; m += step) {
      const row = { month: m, balance: 0, payment: 0 } as Row;
      for (const id of TRACKS) row[`t${id}`] = 0;
      for (const { loan, res } of results) {
        const s = res.schedule[m - 1];
        if (!s) continue;
        row.balance += s.closingBalance;
        row.payment += s.payment;
        row[`t${loan.path_id}`] += mode === "balance" ? s.closingBalance : s.payment;
      }
      rows.push(row);
    }
    const active = TRACKS.filter((id) => rows.some((r) => (r[`t${id}`] ?? 0) > 0));
    return { data: rows, activeTracks: active, maxMonth: longest };
  }, [loans, annualInflation, mode]);

  if (!data.length) {
    return <div className="fin-empty">צריך סכום ומספר חודשים כדי לצייר את מהלך התמהיל</div>;
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
          <button key={k} className="fin-tab !h-7 !text-[11.5px]" data-on={mode === k} onClick={() => setMode(k)}>
            {label}
          </button>
        ))}
        <span className="fin-fig ms-auto text-[11px]" style={{ color: "var(--ink-4)" }}>
          {Math.round(maxMonth / 12)} שנים
        </span>
      </div>

      <div className="h-[228px] w-full px-1 pb-2 pt-3" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -14 }}>
            <defs>
              {activeTracks.map((id) => (
                <linearGradient key={id} id={`fg${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TRACK_HEX[id]} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={TRACK_HEX[id]} stopOpacity={0.06} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={(m) => `${Math.round(m / 12)}שנ׳`}
              tick={{ fontSize: 10, fill: "var(--ink-4)", fontFamily: "var(--num)" }}
              axisLine={{ stroke: "var(--line-2)" }}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tickFormatter={short}
              width={52}
              tick={{ fontSize: 10, fill: "var(--ink-4)", fontFamily: "var(--num)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--line-2)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--line-2)",
                boxShadow: "var(--shadow-lift)",
                fontFamily: "var(--ui)",
                fontSize: 12,
                direction: "rtl",
              }}
              formatter={((v: unknown, name: unknown) => [
                nis(Number(v) || 0),
                PATH_LABEL[Number(String(name).replace("t", ""))] ?? String(name),
              ]) as never}
              labelFormatter={(m) => `חודש ${m}`}
            />
            {activeTracks.map((id) => (
              <Area
                key={id}
                type="monotone"
                dataKey={`t${id}`}
                stackId="1"
                stroke={TRACK_HEX[id]}
                strokeWidth={1.5}
                fill={`url(#fg${id})`}
                isAnimationActive
                animationDuration={600}
              />
            ))}
            {mode === "payment" && (
              <Line type="monotone" dataKey="payment" stroke="var(--ink)" strokeWidth={1} dot={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
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
      <section className="fin-card overflow-hidden">
        <header className="fin-head">
          <ChartPieSlice size={14} weight="fill" style={{ color: "var(--ink-3)" }} />
          <h2 className="fin-title">הרכב התמהיל</h2>
          <span className="fin-sub ms-auto">לפי מסלול</span>
        </header>
        <Composition loans={loans} />
      </section>

      <section className="fin-card overflow-hidden">
        <header className="fin-head">
          <TrendDown size={14} weight="fill" style={{ color: "var(--ink-3)" }} />
          <h2 className="fin-title">מהלך התמהיל</h2>
          <span className="fin-sub ms-auto">מצטבר לפי מסלול</span>
        </header>
        <Runoff loans={loans} annualInflation={annualInflation} />
      </section>
    </div>
  );
}

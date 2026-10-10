"use client";

// The client's one-pager — a refinance offer, read on a phone from a WhatsApp
// link as often as on a desk.
//
// One idea carries the page: the money saved is the SPACE BETWEEN two monthly
// payments. The hero draws both curves as the page opens and fills the gap
// between them in emerald, under a single sentence whose figure counts up.
// Everything after is quiet and in ink: today's payment against the new one,
// what is left to pay year by year, the saving as it accumulates, the two
// mortgages side by side, the new mix, and who to call.
//
// No grey captions anywhere — hierarchy is size and weight. The current
// mortgage is slate, not red: it is not bad, only dearer. Violet is the new mix
// (the מורגי identity); emerald is only ever the saving.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import NumberFlow from "@number-flow/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { EChartsCoreOption } from "echarts/core";
import { Phone, WhatsappLogo } from "@phosphor-icons/react";
import Logo from "@/app/aa102test/components/Logo";
import { TOOLTIP, axisBase, moneyAxis, nis, tipHead, tipRow } from "@/app/aa102test/components/EChart";
import type { OfferPayload, OfferSide } from "@/app/aa102test/lib/offer";

const EChart = dynamic(() => import("@/app/aa102test/components/EChart"), {
  ssr: false,
  loading: () => <div className="ofr-chart-skel" />,
});

const C = {
  ink: "#12141a",
  now: "#9aa3b2",
  next: "#5b54d6",
  save: "#0e7a4e",
};

const EASE = [0.16, 1, 0.3, 1] as const;
const money = (n: number) => `₪${nis(n)}`;
const yrs = (m: number) => {
  const y = Math.round((m / 12) * 10) / 10;
  return Number.isInteger(y) ? `${y} שנים` : `${y.toFixed(1)} שנים`;
};
const dmy = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/* ------------------------------------------------------------ the hero chart */

/**
 * Both monthly payments over the life of the loans, the gap between them
 * filled. Drawn as SVG so the lines can draw themselves (pathLength) and the
 * gap can fill after them — one orchestrated moment, the page's only
 * unprompted motion.
 */
function Divergence({ now, next }: { now: number[]; next: number[] }) {
  const reduce = useReducedMotion();
  const W = 1000;
  const H = 300;
  const n = Math.max(now.length, next.length);
  // The scale starts just under the lowest payment, not at zero: the story is
  // the gap between the two lines, and a zero floor leaves it a sliver.
  const live = [...now, ...next].filter((v) => v > 0);
  const hi = Math.max(...live) * 1.04;
  const lo = Math.min(...live) * 0.7;
  const x = (i: number) => (i / Math.max(1, n - 1)) * W;
  const y = (v: number) => H - (Math.max(0, v - lo) / (hi - lo)) * (H - 16);
  const path = (arr: number[]) => {
    let d = "";
    arr.forEach((v, i) => {
      const px = x(i).toFixed(1);
      // Payments step, they do not slide: draw each month flat, then step.
      d += i === 0 ? `M${px},${y(v).toFixed(1)}` : ` H${px} V${y(v).toFixed(1)}`;
    });
    return d + ` H${x(arr.length - 1).toFixed(1)}`;
  };
  const under = (arr: number[]) => `${path(arr)} V${H} H0 Z`;
  const draw = { duration: reduce ? 0 : 1.6, ease: EASE };

  // Touch or hover anywhere on the drawing: a guide at that month and a card
  // with both payments. Vertical scrolling keeps working on a phone.
  const [at, setAt] = useState<number | null>(null);
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setAt(Math.round(t * (n - 1)));
  };
  const a = at !== null ? now[at] ?? 0 : 0;
  const b = at !== null ? next[at] ?? 0 : 0;
  const left = at !== null ? (x(at) / W) * 100 : 0;
  const cvar = (c: string) => ({ ["--c" as string]: c }) as React.CSSProperties;

  return (
    <div className="ofr-div" role="img" aria-label="ההחזר החודשי לאורך השנים: המשכנתא הנוכחית מול התמהיל החדש">
      <div className="ofr-div-plot" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setAt(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="ofr-div-svg">
          <defs>
            <linearGradient id="ofr-gap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.save} stopOpacity="0.34" />
              <stop offset="1" stopColor={C.save} stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {/* The saving: the area under today's payment, with the new payment's
              area laid over it in the stage colour — what shows is the gap. */}
          <motion.path
            d={under(now)}
            fill="url(#ofr-gap)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : 1.05, duration: reduce ? 0 : 1, ease: "easeOut" }}
          />
          <path d={under(next)} className="ofr-div-mask" />
          <motion.path
            d={path(now)}
            fill="none"
            stroke={C.now}
            strokeWidth={2}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={draw}
          />
          <motion.path
            d={path(next)}
            fill="none"
            stroke={C.next}
            strokeWidth={2.75}
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ ...draw, delay: reduce ? 0 : 0.18 }}
          />
        </svg>
        {at !== null && (
          <>
            <span className="ofr-div-guide" style={{ left: `${left}%` }} aria-hidden />
            <span className="ofr-div-dot" style={{ left: `${left}%`, top: `${(y(a) / H) * 100}%`, ...cvar(C.now) }} aria-hidden />
            <span className="ofr-div-dot" style={{ left: `${left}%`, top: `${(y(b) / H) * 100}%`, ...cvar(C.next) }} aria-hidden />
            <span className="ofr-div-card" data-flip={left > 62 || undefined} style={{ left: `${left}%` }} aria-hidden>
              <b>שנה {Math.floor(at / 12) + 1}</b>
              <span>
                <i data-dash style={cvar(C.now)} />
                <span dir="ltr">{money(a)}</span>
              </span>
              <span>
                <i style={cvar(C.next)} />
                <span dir="ltr">{money(b)}</span>
              </span>
            </span>
          </>
        )}
      </div>
      <div className="ofr-div-axis" dir="ltr">
        <span>היום</span>
        <span>{`שנה ${Math.ceil(n / 12)}`}</span>
      </div>
    </div>
  );
}

/** Today's payment, struck through as it scrolls into view, and the new one
 *  counting down from it — the one sentence the section exists to say. */
function Month({ now, next }: { now: number; next: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -120px 0px" });
  const [shown, setShown] = useState(now);
  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(() => setShown(next), reduce ? 0 : 420);
    return () => clearTimeout(t);
  }, [seen, next, reduce]);
  const diff = now - next;
  return (
    <section ref={ref} className="ofr-month" data-seen={seen || undefined}>
      <div className="ofr-month-col">
        <span className="ofr-month-label">היום</span>
        <span className="ofr-month-fig" data-side="now" dir="ltr">
          <span className="ofr-month-cur">₪</span>
          {nis(now)}
          <span className="ofr-month-strike" aria-hidden />
        </span>
      </div>
      <div className="ofr-month-arrow" aria-hidden>
        <svg viewBox="0 0 40 12" width="40" height="12">
          <path d="M39 6H2M7 1L2 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="ofr-month-col">
        <span className="ofr-month-label">בתמהיל החדש</span>
        <span className="ofr-month-fig" data-side="next" dir="ltr">
          <span className="ofr-month-cur">₪</span>
          <NumberFlow
            value={Math.round(shown)}
            locales="he-IL"
            spinTiming={{ duration: reduce ? 0 : 1100, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            transformTiming={{ duration: reduce ? 0 : 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </span>
      </div>
      {diff > 0 && (
        <p className="ofr-month-line">
          <b dir="ltr">{money(diff)}</b> פחות בהחזר החודשי הראשון
        </p>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- charts */

const GRID = { top: 16, bottom: 28, left: 8, right: 16, outerBoundsMode: "same" as const, outerBoundsContain: "axisLabel" as const };

const yearsAxis = (n: number) => ({
  type: "value" as const,
  min: 0,
  max: n,
  interval: n > 24 ? 5 : n > 12 ? 3 : 2,
  ...axisBase,
  axisLine: { show: true, lineStyle: { color: "rgba(18,20,26,0.14)" } },
  splitLine: { show: false },
  axisLabel: { ...axisBase.axisLabel, color: "#3b3f4a", formatter: (v: number) => (v === 0 ? "" : String(v)) },
});

function balanceOption(a: OfferSide, b: OfferSide): EChartsCoreOption {
  const n = Math.max(a.balances.length, b.balances.length) - 1;
  const pts = (s: OfferSide) => s.balances.map((v, i) => [i, v]);
  return {
    grid: GRID,
    tooltip: {
      ...TOOLTIP,
      formatter: (p: unknown) => {
        const arr = p as { seriesName: string; value: [number, number]; color: string }[];
        if (!arr.length) return "";
        return tipHead(`סוף שנה ${arr[0].value[0]}`) + arr.map((s) => tipRow(s.color, s.seriesName, money(s.value[1]))).join("");
      },
    },
    xAxis: yearsAxis(n),
    yAxis: { ...moneyAxis(), axisLabel: { ...moneyAxis().axisLabel, color: "#3b3f4a" } },
    series: [
      { name: "המשכנתא הנוכחית", type: "line", showSymbol: false, smooth: 0.2, lineStyle: { width: 2, color: C.now, type: [6, 5] }, itemStyle: { color: C.now }, data: pts(b), animationDuration: 1100 },
      {
        name: "התמהיל החדש",
        type: "line",
        showSymbol: false,
        smooth: 0.2,
        lineStyle: { width: 2.75, color: C.next },
        itemStyle: { color: C.next },
        areaStyle: { color: C.next, opacity: 0.07 },
        data: pts(a),
        animationDuration: 1300,
      },
    ],
  };
}

function savingOption(cum: number[]): EChartsCoreOption {
  return {
    grid: GRID,
    tooltip: {
      ...TOOLTIP,
      formatter: (p: unknown) => {
        const arr = p as { value: [number, number] }[];
        if (!arr.length) return "";
        const [yr, v] = arr[0].value;
        return tipHead(`עד סוף שנה ${yr}`) + tipRow(C.save, v >= 0 ? "חיסכון" : "תוספת לתשלום", money(Math.abs(v)), true);
      },
    },
    xAxis: yearsAxis(cum.length),
    yAxis: { ...moneyAxis(), axisLabel: { ...moneyAxis().axisLabel, color: "#3b3f4a" } },
    series: [
      {
        type: "line",
        showSymbol: false,
        smooth: 0.25,
        lineStyle: { width: 2.75, color: C.save },
        itemStyle: { color: C.save },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(14,122,78,0.26)" },
              { offset: 1, color: "rgba(14,122,78,0.02)" },
            ],
          },
        },
        data: [[0, 0], ...cum.map((v, i) => [i + 1, v])],
        animationDuration: 1500,
      },
    ],
  };
}

/** Mount a chart only once it is on screen, so its draw-in is seen, not missed. */
function InView({ children, height }: { children: ReactNode; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });
  return (
    <div ref={ref} style={{ minHeight: height }}>
      {seen ? children : null}
    </div>
  );
}

/** The saving at four moments a client plans around — a ruler of dots. */
function Milestones({ cum }: { cum: number[] }) {
  const reduce = useReducedMotion();
  const marks = [5, 10, 15, 20].filter((y) => y <= cum.length);
  if (cum.length && !marks.includes(cum.length) && cum.length - (marks[marks.length - 1] ?? 0) >= 3) marks.push(cum.length);
  return (
    <ol className="ofr-miles">
      {marks.map((y, i) => (
        <motion.li
          key={y}
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -40px 0px" }}
          transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.09 * i, ease: EASE }}
        >
          <span className="ofr-miles-when">{y === cum.length ? "בסוף התקופה" : `אחרי ${y} שנים`}</span>
          <span className="ofr-miles-fig" dir="ltr">
            {money(Math.max(0, cum[y - 1] ?? 0))}
          </span>
        </motion.li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ page */

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="ofr-sec">
      <header className="ofr-sec-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

function Key({ items }: { items: { color: string; label: string; dash?: boolean; fill?: boolean }[] }) {
  return (
    <span className="ofr-key">
      {items.map((k) => (
        <span key={k.label}>
          <i data-dash={k.dash || undefined} data-fill={k.fill || undefined} style={{ ["--c" as string]: k.color }} />
          {k.label}
        </span>
      ))}
    </span>
  );
}

export default function OfferView({ offer, expiresAt }: { offer: OfferPayload; expiresAt: string }) {
  const reduce = useReducedMotion();
  const { current: now, proposed: next } = offer;
  const saving = now.cost - next.cost;
  const monthly = now.firstPayment - next.firstPayment;

  // The figure counts up once the hero is on screen — from zero, once.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(Math.max(0, Math.round(saving))), reduce ? 0 : 350);
    return () => clearTimeout(t);
  }, [saving, reduce]);

  const cum = useMemo(() => {
    const n = Math.max(now.costByYear.length, next.costByYear.length);
    return Array.from({ length: n }, (_, i) => (now.costByYear[Math.min(i, now.costByYear.length - 1)] ?? 0) - (next.costByYear[Math.min(i, next.costByYear.length - 1)] ?? 0));
  }, [now, next]);
  const balOpt = useMemo(() => balanceOption(next, now), [next, now]);
  const savOpt = useMemo(() => savingOption(cum), [cum]);

  const rows: { label: string; a: string; b: string; d?: string }[] = [
    { label: "החזר חודשי ראשון", a: money(now.firstPayment), b: money(next.firstPayment), d: monthly > 0 ? money(monthly) : undefined },
    {
      label: "ההחזר החודשי הגבוה ביותר",
      a: `${money(now.peak)}`,
      b: `${money(next.peak)}`,
      d: now.peak - next.peak > 0 ? money(now.peak - next.peak) : undefined,
    },
    { label: "סך הריבית וההצמדה", a: money(now.cost), b: money(next.cost), d: saving > 0 ? money(saving) : undefined },
    { label: "סך כל התשלומים", a: money(now.totalPaid), b: money(next.totalPaid), d: now.totalPaid - next.totalPaid > 0 ? money(now.totalPaid - next.totalPaid) : undefined },
    { label: "החזר לכל שקל שלוויתם", a: now.perShekel.toFixed(2), b: next.perShekel.toFixed(2) },
    { label: "תקופה", a: yrs(now.months), b: yrs(next.months) },
    { label: "סכום המשכנתא", a: money(now.principal), b: money(next.principal) },
  ];

  const phone = offer.advisor.phone.replace(/[^\d+]/g, "");
  const intl = phone.startsWith("0") ? `972${phone.slice(1)}` : phone.replace(/^\+/, "");
  const rise = (i: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.08 * i, ease: EASE },
  });

  return (
    <main className="ofr-root" dir="rtl">
      <div className="ofr-page">
        <motion.header className="ofr-top" {...rise(0)}>
          <span className="ofr-mark">
            <Logo size={30} />
            <span>מורגי</span>
          </span>
          <span className="ofr-top-date">{dmy(offer.createdAt)}</span>
        </motion.header>

        {/* ------------------------------------------------------- hero */}
        <section className="ofr-hero">
          {offer.client && (
            <motion.p className="ofr-hello" {...rise(1)}>
              {offer.client},
            </motion.p>
          )}
          <motion.h1 className="ofr-lede" {...rise(2)}>
            {saving > 0 ? "בתמהיל החדש אתם צפויים לחסוך" : "הצעת המשכנתא שהכנו עבורכם"}
          </motion.h1>
          <div className="ofr-stage">
          {saving > 0 && (
            <motion.div className="ofr-big" {...rise(3)}>
              <span className="ofr-big-fig" dir="ltr">
                <span className="ofr-big-cur">₪</span>
                <NumberFlow
                  value={shown}
                  locales="he-IL"
                  spinTiming={{ duration: reduce ? 0 : 1500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                  transformTiming={{ duration: reduce ? 0 : 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
                />
              </span>
              <span className="ofr-big-cap">בריבית ובהצמדה לאורך חיי המשכנתא</span>
            </motion.div>
          )}
          <motion.div {...rise(4)}>
            <Divergence now={now.payments} next={next.payments} />
            <Key
              items={[
                { color: C.now, label: "המשכנתא הנוכחית", dash: true },
                { color: C.next, label: "התמהיל החדש" },
                ...(saving > 0 ? [{ color: C.save, label: "החיסכון", fill: true }] : []),
              ]}
            />
          </motion.div>
          </div>
        </section>

        {/* ------------------------------------------------- the month */}
        <Month now={now.firstPayment} next={next.firstPayment} />

        {/* ------------------------------------------------ the charts */}
        <Section title="יתרת המשכנתא לאורך השנים" aside={<Key items={[{ color: C.now, label: "הנוכחית", dash: true }, { color: C.next, label: "החדשה" }]} />}>
          <InView height={240}>
            <EChart option={balOpt} height={240} />
          </InView>
        </Section>

        {saving > 0 && (
          <Section title="החיסכון המצטבר">
            <InView height={240}>
              <EChart option={savOpt} height={240} />
            </InView>
            <Milestones cum={cum} />
          </Section>
        )}

        {/* ---------------------------------------------- side by side */}
        <Section title="השוואת המשכנתאות">
          <table className="ofr-table">
            <thead>
              <tr>
                <th />
                <th>
                  <span className="ofr-col" data-side="now">
                    <i />
                    הנוכחית
                  </span>
                </th>
                <th>
                  <span className="ofr-col" data-side="next">
                    <i />
                    החדשה
                  </span>
                </th>
                <th className="ofr-table-d">הפרש</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td>
                    <bdi>{r.a}</bdi>
                  </td>
                  <td data-side="next">
                    <bdi>{r.b}</bdi>
                  </td>
                  <td className="ofr-table-d" dir="ltr">
                    {r.d ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* ------------------------------------------------- the advisor */}
        {(offer.advisor.name || phone) && (
          <section className="ofr-contact">
            <div>
              <p className="ofr-contact-q">שאלות? נשמח לעבור איתכם על ההצעה.</p>
              {offer.advisor.name && <p className="ofr-contact-name">{offer.advisor.name}</p>}
            </div>
            {phone && (
              <div className="ofr-contact-acts">
                <a className="ofr-btn" data-primary href={`tel:${phone}`}>
                  <Phone size={18} weight="fill" />
                  התקשרו
                </a>
                <a className="ofr-btn" href={`https://wa.me/${intl}`} target="_blank" rel="noopener noreferrer">
                  <WhatsappLogo size={19} weight="fill" />
                  וואטסאפ
                </a>
              </div>
            )}
          </section>
        )}

        <footer className="ofr-foot">
          <p>
            החישוב הוא תחזית המבוססת על {offer.basis}. ההחזרים בפועל ישתנו בהתאם לריבית ולמדד. ההצעה בתוקף עד {dmy(expiresAt)}.
          </p>
          <span className="ofr-mark ofr-mark-sm">
            <Logo size={22} />
            <span>מורגי</span>
          </span>
        </footer>
      </div>
    </main>
  );
}

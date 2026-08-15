"use client";

// The shell.
//
// Deliberately not a card grid with an icon sidebar. The rail is set as a
// numbered index — the way a report lists its sections — and the head of the
// page is a nameplate rather than a toolbar: a monospaced kicker carrying the
// range, one large Hebrew word for the screen, and a measured rule under it.
// The console should read like an instrument someone printed, not like a
// template someone installed.
//
// Two kinds of navigation live here and they behave differently on purpose.
// Switching SCREEN is client-side and instant — same data, another projection
// of it. Switching RANGE is a server round-trip, because it is a different
// query; while it is in flight the current screen is held and dimmed rather
// than replaced by a skeleton, so nothing jumps and the eye keeps its place.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { Scope } from "./ui/marks";
import type { Dashboard } from "./aggregate";
import { Activity, Health, Overview, People, Work } from "./Views";
import Palette, { type PaletteAction } from "./ui/Palette";
import { Button, Segmented, SegmentedItem, TooltipProvider } from "./ui/kit";
import { ago } from "./lib/time";
import { num } from "./lib/labels";

import "@fontsource-variable/rubik";
import "@fontsource-variable/jetbrains-mono";
import "./theme.css";
import "./console.css";

type ViewKey = "work" | "activity" | "overview" | "people" | "health";

const VIEWS: { key: ViewKey; label: string; title: string; hint: string }[] = [
  {
    key: "work",
    label: "פעילות",
    title: "כל הפעולות",
    hint: "כל ייבוא דוח וכל ייצוא אקסל — מי, על מי, ומתי",
  },
  {
    key: "activity",
    label: "ביקורים",
    title: "ביקורים",
    hint: "כל ישיבת עבודה בבורד, על ציר הזמן",
  },
  {
    key: "overview",
    label: "סקירה",
    title: "סקירה",
    hint: "נפח, מקצב ומסלול העבודה בחלון הנבחר",
  },
  {
    key: "people",
    label: "נציגים",
    title: "נציגים ולקוחות",
    hint: "מי משתמש בכלי ועל מי",
  },
  {
    key: "health",
    label: "תקינות",
    title: "תקינות",
    hint: "מה נשבר, מה נדחה, ומאיפה המסך קורא",
  },
];

const RANGES = [7, 30, 90];

export default function Console({
  data,
  sources,
}: {
  data: Dashboard;
  sources: { supabase: boolean; file: boolean };
}) {
  const [view, setView] = useState<ViewKey>("work");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const current = VIEWS.find((v) => v.key === view)!;

  // Each badge counts the thing its screen is about; the overview is about
  // everything, so it counts nothing rather than repeating a neighbour.
  const counts: Record<ViewKey, { n: number | null; bad?: boolean }> = {
    work: { n: data.actions.length },
    activity: { n: data.visits.length },
    overview: { n: null },
    people: { n: data.byOperator.length },
    health: { n: data.kpis.errorsWindow, bad: data.kpis.errorsWindow > 0 },
  };

  const setRange = (days: number) => {
    startTransition(() => router.push(`/console?days=${days}`, { scroll: false }));
  };

  const actions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = VIEWS.map((v) => ({
      group: "מסכים",
      id: `view-${v.key}`,
      label: v.title,
      hint: v.hint,
      run: () => setView(v.key),
    }));
    for (const d of RANGES) {
      list.push({
        group: "טווח",
        id: `range-${d}`,
        label: `${d} ימים אחרונים`,
        run: () => setRange(d),
      });
    }
    for (const op of data.byOperator.slice(0, 12)) {
      list.push({
        group: "נציגים",
        id: `op-${op.operator}`,
        label: op.operator,
        hint: `${num(op.visits)} ביקורים`,
        run: () => setView("people"),
      });
    }
    for (const lead of data.byLead.slice(0, 12)) {
      list.push({
        group: "לקוחות",
        id: `lead-${lead.leadId ?? lead.lead}`,
        label: lead.lead,
        hint: lead.clients[0],
        run: () => setView("work"),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.byOperator, data.byLead]);

  return (
    <TooltipProvider>
      <div className="cns cns-plane min-h-screen text-cns-fg" dir="rtl">
        <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)] items-start">
          {/* ------------------------------------------------------- rail */}
          <aside className="sticky top-0 flex h-screen flex-col border-s border-cns-line bg-cns-card px-3 py-5">
            <div className="flex items-center gap-2.5 px-2 pb-5">
              <span className="grid size-8 flex-none place-items-center rounded-[9px] bg-cns-primary text-white">
                <Scope size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] leading-tight font-semibold tracking-tight">
                  מוקד הסימולטור
                </span>
                <span className="block font-[family-name:var(--cns-mono)] text-[9px] tracking-[0.18em] text-cns-mutedfg uppercase">
                  control
                </span>
              </span>
            </div>

            <div className="px-2 pb-2 font-[family-name:var(--cns-mono)] text-[9px] tracking-[0.18em] text-cns-mutedfg uppercase">
              מסכים
            </div>

            {/* A numbered index, not an icon menu. */}
            <nav className="flex flex-col">
              {VIEWS.map((v, i) => {
                const c = counts[v.key];
                const on = v.key === view;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setView(v.key)}
                    aria-current={on ? "page" : undefined}
                    className={
                      "group relative flex items-center gap-2.5 rounded-md px-2 py-[7px] text-start text-[13px] transition-colors " +
                      (on ? "bg-cns-muted font-semibold text-cns-fg" : "text-cns-fg2 hover:bg-cns-muted/60 hover:text-cns-fg")
                    }
                  >
                    <span
                      className={
                        "font-[family-name:var(--cns-mono)] text-[10px] tabular-nums " +
                        (on ? "text-cns-accent" : "text-cns-mutedfg/70")
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {v.label}
                    {c.n != null ? (
                      <span
                        className={
                          "cns-num ms-auto text-[11px] " +
                          (c.bad ? "text-cns-bad" : on ? "text-cns-fg2" : "text-cns-mutedfg/80")
                        }
                      >
                        {num(c.n)}
                      </span>
                    ) : null}
                    {on ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 -end-3 w-[2px] rounded-full bg-cns-accent"
                      />
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto flex flex-col gap-2 border-t border-cns-line pt-3">
              <div className="flex items-center gap-2 rounded-lg bg-cns-muted px-2.5 py-2 text-[11.5px] text-cns-fg2">
                <span
                  className="cns-dot"
                  data-tone={sources.supabase ? "good" : sources.file ? "warn" : undefined}
                  data-live={sources.supabase ? "" : undefined}
                />
                <span className="truncate">
                  {sources.supabase
                    ? "מחובר ל-Supabase"
                    : sources.file
                      ? "קובץ מקומי בלבד"
                      : "אין נתונים עדיין"}
                </span>
              </div>
              <a
                href="/console/auth?logout"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-cns-mutedfg transition-colors hover:bg-cns-bad/10 hover:text-cns-bad"
              >
                <LogOut className="size-4" strokeWidth={1.8} />
                יציאה
              </a>
            </div>
          </aside>

          {/* ------------------------------------------------------- main */}
          <main
            className={
              "min-w-0 pb-14 transition-opacity duration-200 " +
              (pending ? "pointer-events-none opacity-50" : "")
            }
          >
            <div className="sticky top-0 z-20 bg-gradient-to-b from-[var(--cns-bg)] from-65% to-transparent px-6 pt-5 backdrop-blur-[2px]">
              <div className="flex items-end justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-[family-name:var(--cns-mono)] text-[10px] tracking-[0.16em] text-cns-mutedfg uppercase">
                    <span>{data.days} ימים אחרונים</span>
                    {data.lastEventAt ? (
                      <>
                        <span className="text-cns-line2">/</span>
                        <span>אירוע אחרון {ago(data.lastEventAt, +new Date(data.generatedAt))}</span>
                      </>
                    ) : null}
                  </div>
                  <h1 className="mt-1 truncate text-[29px] leading-[1.15] font-semibold tracking-[-0.025em]">
                    {current.title}
                  </h1>
                  <p className="mt-0.5 truncate text-[12.5px] text-cns-mutedfg">{current.hint}</p>
                </div>

                <div className="flex flex-none items-center gap-2 pb-1">
                  <Segmented>
                    {RANGES.map((d) => (
                      <SegmentedItem key={d} active={d === data.days} onClick={() => setRange(d)}>
                        {d} ימים
                      </SegmentedItem>
                    ))}
                  </Segmented>
                  <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)}>
                    <Search />
                    חיפוש
                    <kbd className="cns-num rounded bg-cns-muted px-1 text-[10px] text-cns-mutedfg">
                      ⌘K
                    </kbd>
                  </Button>
                </div>
              </div>
              <div className="cns-rule mt-3.5 mb-4" aria-hidden />
            </div>

            <div className="flex flex-col gap-3.5 px-6">
              {view === "work" ? (
                <Work data={data} sources={sources} />
              ) : view === "activity" ? (
                <Activity data={data} />
              ) : view === "overview" ? (
                <Overview data={data} />
              ) : view === "people" ? (
                <People data={data} />
              ) : (
                <Health data={data} sources={sources} />
              )}
            </div>
          </main>
        </div>

        <Palette open={paletteOpen} onOpenChange={setPaletteOpen} actions={actions} />
      </div>
    </TooltipProvider>
  );
}

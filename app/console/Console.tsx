"use client";

// The shell: a fixed rail on the right, a masthead, and one of five screens.
//
// Two different kinds of navigation live here and they behave differently on
// purpose. Switching SCREEN is client-side and instant — same data, another
// projection of it. Switching RANGE is a server round-trip, because it is a
// different query; while it is in flight the current screen is held and dimmed
// rather than replaced by a skeleton, so nothing jumps and the eye keeps its
// place.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity as ActivityIcon,
  FileText,
  Gauge,
  LogOut,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { Dashboard } from "./aggregate";
import { Activity, Health, Overview, People, Work } from "./Views";
import Palette, { type PaletteAction } from "./ui/Palette";
import { Awaiting } from "./ui/parts";
import { ago } from "./lib/time";
import { num } from "./lib/labels";

import "@fontsource/ibm-plex-sans-hebrew/400.css";
import "@fontsource/ibm-plex-sans-hebrew/500.css";
import "@fontsource/ibm-plex-sans-hebrew/600.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-400.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-500.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./console.css";

type ViewKey = "work" | "activity" | "overview" | "people" | "health";

const VIEWS: {
  key: ViewKey;
  label: string;
  title: string;
  hint: string;
  Icon: typeof Gauge;
}[] = [
  {
    key: "work",
    label: "פעילות",
    title: "פעילות",
    hint: "כל ייבוא דוח וכל ייצוא אקסל — מי, על מי, ומתי",
    Icon: FileText,
  },
  {
    key: "activity",
    label: "ביקורים",
    title: "ביקורים",
    hint: "כל ישיבת עבודה בבורד, על ציר הזמן",
    Icon: ActivityIcon,
  },
  {
    key: "overview",
    label: "סקירה",
    title: "סקירה",
    hint: "נפח, מקצב ומסלול העבודה בחלון הנבחר",
    Icon: Gauge,
  },
  {
    key: "people",
    label: "נציגים ולקוחות",
    title: "נציגים ולקוחות",
    hint: "מי משתמש בכלי ועל מי",
    Icon: Users,
  },
  {
    key: "health",
    label: "תקינות",
    title: "תקינות",
    hint: "מה נשבר, מה נדחה, ומאיפה המסך קורא",
    Icon: ShieldAlert,
  },
];

const RANGES = [7, 30, 90];

function Mark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 17.5 8.5 11l4 4.2L21 6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="11" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="15.2" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
      label: v.label,
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
        run: () => setView("activity"),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.byOperator, data.byLead]);

  return (
    <div className="cns" dir="rtl">
      <div className="cns-shell">
        {/* ------------------------------------------------------- rail */}
        <aside className="cns-rail">
          <div className="cns-brand">
            <span className="cns-brand-mark" aria-hidden>
              <Mark />
            </span>
            <span>
              <span className="cns-brand-name">מוקד הסימולטור</span>
              <span className="cns-brand-sub">control</span>
            </span>
          </div>

          <div className="cns-rail-label">מסכים</div>
          <nav className="cns-nav">
            {VIEWS.map((v) => {
              const c = counts[v.key];
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  data-on={v.key === view || undefined}
                >
                  <v.Icon size={16} strokeWidth={1.8} />
                  {v.label}
                  {c.n != null ? (
                    <span className="cns-nav-count num" data-bad={c.bad || undefined}>
                      {num(c.n)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="cns-rail-label">טווח</div>
          <div className="cns-seg" style={{ marginInline: 8, alignSelf: "flex-start" }}>
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRange(d)}
                data-on={d === data.days || undefined}
              >
                {d} ימים
              </button>
            ))}
          </div>

          <div className="cns-rail-foot">
            <div className="cns-store">
              <span
                className="cns-dot"
                data-tone={sources.supabase ? "good" : sources.file ? "warn" : undefined}
                data-live={sources.supabase ? "" : undefined}
              />
              <span>
                {sources.supabase
                  ? "מחובר ל-Supabase"
                  : sources.file
                    ? "קובץ מקומי בלבד"
                    : "אין נתונים עדיין"}
              </span>
            </div>
            <a href="/console/auth?logout" className="cns-signout">
              <LogOut size={15} strokeWidth={1.8} />
              יציאה
            </a>
          </div>
        </aside>

        {/* ------------------------------------------------------- main */}
        <main className="cns-main" data-pending={pending || undefined}>
          <div className="cns-mast">
            <div className="cns-mast-row">
              <div>
                <h1>{current.title}</h1>
                <p className="cns-mast-sub">
                  {current.hint}
                  {data.lastEventAt ? ` · אירוע אחרון ${ago(data.lastEventAt, +new Date(data.generatedAt))}` : ""}
                </p>
              </div>
              <div className="cns-mast-tools">
                <button type="button" className="cns-btn" onClick={() => setPaletteOpen(true)}>
                  <Search size={14} strokeWidth={1.9} />
                  חיפוש
                  <kbd>⌘K</kbd>
                </button>
              </div>
            </div>
            <div className="cns-rule" aria-hidden />
          </div>

          <div className="cns-body">
            {data.empty ? (
              <Awaiting days={data.days} />
            ) : view === "work" ? (
              <Work data={data} />
            ) : view === "activity" ? (
              <Activity data={data} />
            ) : view === "overview" ? (
              <Overview data={data} />
            ) : view === "people" ? (
              <People data={data} />
            ) : (
              <Health data={data} sources={sources} />
            )}

            <p className="cns-note">
              המסך קורא בצד השרת בלבד · אין קישור לכאן מהסימולטור · תוכן הדוחות
              עצמו לא נשמר, רק מי ייבא, של מי, ומה נקרא
            </p>
          </div>
        </main>
      </div>

      <Palette open={paletteOpen} onOpenChange={setPaletteOpen} actions={actions} />
    </div>
  );
}

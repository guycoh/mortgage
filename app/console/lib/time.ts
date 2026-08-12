// One clock for the whole console.
//
// Events are stored in UTC and the panel runs on Vercel, which is also UTC —
// but the people it describes work in Israel. Left alone, a report dropped at
// 00:30 Tel Aviv time lands on the previous day's bar and the "busiest hour"
// heat map is shifted by two or three columns depending on the season.
//
// So every day, hour and printed time in this panel is resolved in
// Asia/Jerusalem explicitly, on the server and in the browser alike. That also
// makes server and client agree by construction, which is what keeps React
// from screaming about mismatched text.

export const TZ = "Asia/Jerusalem";

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface Zoned {
  ymd: string; // 2026-08-12, Israel time
  dm: string; // 12/08
  hm: string; // 14:07
  hour: number; // 0–23
  dow: number; // 0 = Sunday, the Israeli week's first day
}

export function zoned(iso: string): Zoned {
  const p = PARTS.formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const y = g("year");
  const m = g("month");
  const d = g("day");
  const hh = g("hour");
  const mm = g("minute");
  return {
    ymd: `${y}-${m}-${d}`,
    dm: `${d}/${m}`,
    hm: `${hh}:${mm}`,
    hour: Number(hh),
    dow: DOW[g("weekday")] ?? 0,
  };
}

/** "12/08 14:07" — the panel's standard stamp. */
export function stamp(iso: string): string {
  const z = zoned(iso);
  return `${z.dm} ${z.hm}`;
}

/** "לפני 4 דק׳" / "אתמול 09:12" — for the feed, where recency is the point. */
export function ago(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "הרגע";
  if (min < 60) return `לפני ${min} דק׳`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `לפני ${hrs} שע׳`;
  const days = Math.round(hrs / 24);
  if (days === 1) return `אתמול ${zoned(iso).hm}`;
  if (days < 7) return `לפני ${days} ימים`;
  return stamp(iso);
}

export const DOW_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

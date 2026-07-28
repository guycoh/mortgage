// Every refusal lands here. The reasons are deliberately coarse — telling an
// unsigned caller the difference between "no such lead" and "bad signature"
// would hand them a way to probe for which leads exist.

import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import "@fontsource-variable/rubik";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "@/app/aa100test/theme.css";

const TEXT: Record<string, { head: string; body: string }> = {
  expired: {
    head: "הקישור פג תוקף",
    body: "קישורי הסימולטור תקפים ל-12 שעות. חזרו לכרטיס הלקוח ב-Fireberry ולחצו שוב על הכפתור.",
  },
  invalid: {
    head: "אין גישה לתמהיל הזה",
    body: "הקישור אינו תקין. חזרו לכרטיס הלקוח ב-Fireberry ולחצו שוב על הכפתור.",
  },
  server: {
    head: "משהו השתבש",
    body: "לא הצלחנו לפתוח את התמהיל. נסו שוב, ואם זה חוזר — פנו למנהל המערכת.",
  },
  notoken: {
    head: "הכפתור לא העביר מזהה לקוח",
    body:
      "נראה שהקישור בכרטיס ב-Fireberry לא מחליף את מזהה הלקוח בערך האמיתי. " +
      "יש לערוך את הכפתור כך שה-href יסתיים במזהה הרשומה (accountid) ולא בשם השדה עצמו.",
  },
  unavailable: {
    head: "לא הצלחנו לאמת את הלקוח",
    body: "אין כרגע תקשורת עם Fireberry, ולכן לא ניתן לפתוח את התמהיל. נסו שוב בעוד רגע.",
  },
};

export const metadata = { title: "אין גישה · סימולטור תמהילים" };

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const key = (Array.isArray(sp.r) ? sp.r[0] : sp.r) ?? "invalid";
  const t = TEXT[key] ?? TEXT.invalid;

  return (
    <div className="fin-root grid min-h-dvh place-items-center px-6" dir="rtl">
      <div className="fin-card max-w-[430px] px-7 py-9 text-center">
        <span
          className="mx-auto mb-4 grid size-11 place-items-center rounded-full"
          style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
        >
          <WarningCircle size={22} weight="fill" />
        </span>
        <h1 className="fin-display text-[19px]">{t.head}</h1>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          {t.body}
        </p>
      </div>
    </div>
  );
}

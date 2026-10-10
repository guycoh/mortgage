// The offer is not there any more — expired, withdrawn or never existed.
// One sentence and the way forward; no figures, no blame.

import Logo from "@/app/aa102test/components/Logo";

export default function Gone({
  state,
  words,
  next = "לקבלת הצעה מעודכנת, פנו ליועץ שלכם.",
}: {
  state: "missing" | "expired" | "revoked";
  /** The page's own words — a summary is not an offer. */
  words?: Partial<Record<"missing" | "expired" | "revoked", string>>;
  next?: string;
}) {
  const line =
    words?.[state] ??
    (state === "expired"
      ? "תוקף ההצעה הסתיים."
      : state === "revoked"
        ? "ההצעה כבר לא זמינה."
        : "לא מצאנו את ההצעה.");
  return (
    <main className="ofr-root ofr-gate" dir="rtl">
      <div className="ofr-gate-card">
        <span className="ofr-mark">
          <Logo size={40} />
          <span>מורגי</span>
        </span>
        <h1 className="ofr-gate-title">{line}</h1>
        <p className="ofr-gate-text">{next}</p>
      </div>
    </main>
  );
}

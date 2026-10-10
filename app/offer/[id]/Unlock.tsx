"use client";

// The code screen. One real <input> (numeric keypad, paste, the phone's own
// one-time-code autofill) drawn as six cells; the sixth digit submits. A wrong
// code shakes the row and clears it; the right one fades into the offer.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import Logo from "@/app/aa102test/components/Logo";

const MSG: Record<string, string> = {
  wrong: "הקוד שגוי. נסו שוב.",
  locked: "יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.",
  expired: "תוקף ההצעה הסתיים.",
  revoked: "ההצעה כבר לא זמינה.",
  missing: "לא מצאנו את ההצעה.",
  net: "בעיית חיבור. נסו שוב.",
};

export default function Unlock({ id }: { id: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Keep the keyboard on the code: on arrival, and again after every answer.
  useEffect(() => {
    if (!busy && !done) input.current?.focus();
  }, [busy, done]);

  const submit = async (value: string) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/offer/${id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.refresh(), 420);
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(MSG[j.error ?? "wrong"] ?? MSG.wrong);
      await shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.42, ease: "easeOut" } });
      setCode("");
    } catch {
      setErr(MSG.net);
    } finally {
      setBusy(false);
    }
  };

  const onChange = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    if (err) setErr(null);
    if (v.length === 6 && !busy) void submit(v);
  };

  return (
    <main className="ofr-root ofr-gate" dir="rtl">
      <AnimatePresence>
        {!done && (
          <motion.div
            className="ofr-gate-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="ofr-mark">
              <Logo size={40} />
              <span>מורגי</span>
            </span>
            <h1 className="ofr-gate-title">הצעת המשכנתא שהכנו עבורכם</h1>
            <p className="ofr-gate-text">הקלידו את הקוד בן 6 הספרות שקיבלתם מהיועץ.</p>

            <motion.label className="ofr-otp" animate={shake} data-busy={busy || undefined}>
              <input
                ref={input}
                className="ofr-otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => onChange(e.target.value)}
                aria-label="קוד גישה בן 6 ספרות"
                aria-invalid={!!err || undefined}
                readOnly={busy}
              />
              <span className="ofr-otp-cells" aria-hidden dir="ltr">
                {Array.from({ length: 6 }, (_, i) => {
                  const ch = code[i];
                  const active = i === Math.min(code.length, 5) && !busy;
                  return (
                    <span key={i} className="ofr-otp-cell" data-on={active || undefined} data-full={!!ch || undefined} data-err={!!err || undefined}>
                      <AnimatePresence mode="popLayout">
                        {ch && (
                          <motion.span
                            key={ch + i}
                            initial={{ y: 8, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 520, damping: 30 }}
                          >
                            {ch}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  );
                })}
              </span>
            </motion.label>

            <p className="ofr-gate-err" role="alert" aria-live="polite">
              {err ?? " "}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

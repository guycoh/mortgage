"use client";

// /aa100test with no lead — and it stays that way.
//
// The board used to reopen whichever lead was looked at last, out of
// localStorage, which meant this URL was never actually empty and two people
// sharing a link saw different things. The lead now lives in the path
// (/aa100test/3) and nowhere else, so the bare route has exactly one job: pick
// one.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Bank } from "@phosphor-icons/react";
import LeadPicker, { type Lead } from "./components/LeadPicker";
import "@fontsource-variable/rubik";
import "@fontsource-variable/archivo";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "./theme.css";

export default function Aa100TestLanding() {
  const router = useRouter();

  // ?lead=3 was the old shape; keep links people already sent working. Read
  // from location rather than useSearchParams, which would force this page to
  // carry a Suspense boundary purely for a legacy redirect.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("lead"));
    if (Number.isFinite(id) && id > 0) router.replace(`/aa100test/${id}`);
  }, [router]);

  const go = (l: Lead) => router.push(`/aa100test/${l.id}`);

  return (
    <div className="fin-root" dir="rtl">
      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 md:px-6 md:py-7">
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="fin-display text-[30px]">סימולטור תמהילים</h1>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fin-card grid place-items-center px-6 py-16 text-center"
        >
          <span
            className="mb-4 grid size-12 place-items-center rounded-xl border"
            style={{ borderColor: "var(--line-2)", color: "var(--ink-4)", background: "var(--card-2)" }}
          >
            <Bank size={22} />
          </span>

          <h2 className="fin-display text-[19px]">בחרו ליד כדי להתחיל</h2>
          <p className="mt-1.5 max-w-[420px] text-[12.5px]" style={{ color: "var(--ink-3)" }}>
            התמהילים נשמרים על הליד עצמו. אפשר לחפש לפי שם או להקליד מספר ליד.
          </p>

          <div className="mt-5">
            <LeadPicker lead={null} onPick={go} onClear={() => {}} />
          </div>
        </motion.section>
      </div>
    </div>
  );
}

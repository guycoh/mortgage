"use client";

import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import NumberFlow from "@number-flow/react";

type Rates = { interest: number; prime: number; nextDate?: string };

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r)));

/**
 * The חכם masthead.
 *
 * The rates are set as type, not as badges. A pill implies something you can
 * press; these are a readout. Small tracked label over a tabular figure,
 * divided by a hairline — the way a rate is set on a printed term sheet —
 * reads quieter and more expensive than two coloured chips, and it stops
 * competing with the logo for attention.
 */
export default function Navbar() {
  // BOI moves the rate roughly every six weeks; an hour of dedupe still
  // catches a same-day change without refetching between calculators.
  const { data, isLoading } = useSWR<Rates>("/api/interest", fetcher, {
    dedupingInterval: 60 * 60 * 1000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const hasRates = typeof data?.interest === "number";

  return (
    <header className="sticky top-0 z-50 h-[var(--hm-nav-h)] w-full bg-[rgba(255,253,248,0.88)] backdrop-blur-md">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/hachamm/calculators" className="flex shrink-0 items-center" aria-label="חכם">
          <Image
            src="/hachamm/logo.svg"
            alt="חכם — חיסכון כספי במשכנתא"
            width={160}
            height={60}
            /* the logo carries its own near-white plate, which reads as a
               white box on the cream masthead — multiply drops it out */
            className="h-9 w-auto object-contain mix-blend-multiply sm:h-11"
            priority
          />
        </Link>

        {(isLoading || hasRates) && (
          <motion.dl
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
            className="flex shrink-0 items-stretch gap-3.5 sm:gap-5"
          >
            <Rate label="ריבית בנק ישראל" short="בנק ישראל" value={data?.interest} />
            <span aria-hidden className="w-px self-stretch bg-[var(--hm-gold-200)]" />
            <Rate label="ריבית פריים" short="פריים" value={data?.prime} emphasis />
          </motion.dl>
        )}
      </nav>

      {/* hairline of brand gold, fading at both ends */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-[var(--hm-gold-300)] to-transparent"
      />
    </header>
  );
}

function Rate({
  label,
  short,
  value,
  emphasis = false,
}: {
  label: string;
  short: string;
  value?: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col justify-center text-right">
      <dt className="text-[9px] font-semibold leading-none tracking-[0.14em] text-[var(--hm-ink-faint)] sm:text-[10px]">
        {/* the full wording only when there is room for it */}
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{short}</span>
      </dt>
      <dd
        className={
          "mt-1 text-[15px] font-bold leading-none tabular-nums sm:text-[17px] " +
          (emphasis ? "text-[var(--hm-gold-600)]" : "text-[var(--hm-ink)]")
        }
      >
        {typeof value === "number" ? (
          /* style:"percent" so Intl places the sign correctly in RTL */
          <NumberFlow
            value={value / 100}
            locales="he-IL"
            format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
        ) : (
          <span className="inline-block h-[13px] w-11 animate-pulse rounded-sm bg-[var(--hm-gold-100)]" />
        )}
      </dd>
    </div>
  );
}

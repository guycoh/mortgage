"use client";

import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Toaster } from "sonner";

import { Backdrop } from "./components/Backdrop";
import { PaperBar } from "./components/PaperBar";
import { Masthead } from "./components/Masthead";
import { ContactBar } from "./components/ContactBar";
import { PrimaryActions } from "./components/PrimaryActions";
import { ToolGrid } from "./components/ToolGrid";
import { LocationRow } from "./components/LocationRow";
import { CardFooter } from "./components/CardFooter";
import { ShareSheet } from "./components/ShareSheet";

import { stagger } from "./motion";
import { useCardActions } from "./useCardActions";

export default function DigitalCard({ fontClass }: { fontClass: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { saveContact, shareCard, copyLink } = useCardActions();

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`glc ${fontClass} relative flex min-h-[100svh] w-full justify-center sm:items-center sm:py-10`}
      >
        <Backdrop />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="glc-card glc-grain-paper relative z-10 flex min-h-[100svh] w-full max-w-[430px] flex-col overflow-hidden sm:min-h-0 sm:rounded-[26px] sm:shadow-[var(--glc-shadow-card),0_0_0_1px_var(--glc-bone-200)]"
        >
          <PaperBar onShare={() => setSheetOpen(true)} />
          <Masthead />

          {/* leftover height is split between the foil plate and these gaps, so a
              tall phone breathes evenly instead of leaving one hole at the bottom */}
          <div className="flex grow flex-col justify-between gap-[var(--glc-stack)] px-[var(--glc-gutter)] pb-[max(16px,env(safe-area-inset-bottom))]">
            <ContactBar />
            <PrimaryActions onSaveContact={saveContact} />
            <ToolGrid />
            <LocationRow />
            <CardFooter />
          </div>
        </motion.main>

        <ShareSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onShare={shareCard}
          onCopy={copyLink}
          onSaveContact={saveContact}
          fontClass={fontClass}
        />

        <Toaster
          dir="rtl"
          position="top-center"
          offset={14}
          className={fontClass}
          toastOptions={{
            style: {
              fontFamily: "var(--glc-font-sans), sans-serif",
              background: "#fffdf8",
              border: "1px solid #ece2c1",
              color: "#221d12",
              borderRadius: "14px",
              boxShadow: "0 1px 2px rgba(42,36,11,.05), 0 12px 28px -14px rgba(42,36,11,.35)",
            },
          }}
        />
      </div>
    </MotionConfig>
  );
}

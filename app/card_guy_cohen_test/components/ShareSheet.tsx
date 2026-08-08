"use client";

import { Drawer } from "vaul";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, UserPlus } from "lucide-react";
import { CARD_URL, person, type Glyph } from "../data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: () => void;
  onCopy: () => void;
  onSaveContact: () => void;
  /** the sheet portals to <body>, outside the card, so it needs the font vars too */
  fontClass: string;
};

/**
 * vaul (Radix Dialog underneath) — drag-to-dismiss bottom sheet, focus trap,
 * scroll lock and escape handling for free.
 */
export function ShareSheet({
  open,
  onOpenChange,
  onShare,
  onCopy,
  onSaveContact,
  fontClass,
}: Props) {
  const close = (fn: () => void) => () => {
    onOpenChange(false);
    fn();
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="glc-sheet-overlay fixed inset-0 z-50" />
        <Drawer.Content
          aria-describedby={undefined}
          className={`glc glc-sheet ${fontClass} fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[430px] flex-col rounded-t-[28px] pb-[max(20px,env(safe-area-inset-bottom))] outline-none`}
        >
          <div aria-hidden className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--glc-bone-200)]" />

          <div className="px-[var(--glc-gutter)] pt-4">
            <Drawer.Title className="glc-display text-center text-[22px] font-semibold tracking-[-0.015em] text-[var(--glc-ink)]">
              שיתוף הכרטיס
            </Drawer.Title>
            <p className="mt-1.5 text-center text-[13px] text-[var(--glc-ink-faint)]">
              סרקו את הקוד כדי לפתוח את הכרטיס של {person.full}
            </p>

            <div className="glc-qr-frame mx-auto mt-5 w-fit rounded-[20px] p-4">
              <QRCodeSVG
                value={CARD_URL}
                size={166}
                level="M"
                marginSize={0}
                bgColor="transparent"
                fgColor="#5b4e19"
              />
            </div>

            <div className="mt-5 grid gap-2">
              <SheetButton icon={Share2} label="שיתוף" onClick={close(onShare)} primary />
              <SheetButton icon={Copy} label="העתקת קישור" onClick={close(onCopy)} />
              <SheetButton icon={UserPlus} label="שמירה לאנשי קשר" onClick={close(onSaveContact)} />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function SheetButton({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: Glyph;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative isolate flex h-[54px] items-center justify-center gap-2 overflow-hidden rounded-[15px] text-[14.5px] font-bold active:scale-[0.985] " +
        (primary ? "glc-orb glc-btn-pigment glc-press" : "glc-btn-sheet")
      }
    >
      <Icon className="h-[19px] w-[19px]" />
      {label}
    </button>
  );
}

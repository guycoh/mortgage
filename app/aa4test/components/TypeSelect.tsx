"use client";

// High-quality custom dropdown for the mix track "סוג". Colour-coded + iconned
// per type, keyboard-operable (Arrow/Home/End/Enter/Escape), click-outside to
// close. The menu is portalled to <body> and fixed-positioned from the trigger
// so it never gets clipped by the dense ledger rows.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { MIX_TYPES, mixTypeMeta } from "./mixTypes";

const MENU_W = 184;

function Medallion({ tint, color, Icon, size = 22 }: { tint: string; color: string; Icon: React.ElementType; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[7px]" style={{ width: size, height: size, background: tint, color }}>
      <Icon className="size-3.5" weight="duotone" />
    </span>
  );
}

export default function TypeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: MENU_W });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const meta = mixTypeMeta(value);

  // Portal INTO .aa4-root (not <body>) so the scoped design tokens cascade to
  // the menu; fixed positioning stays viewport-relative (no transformed ancestor).
  useEffect(() => {
    setPortalTarget((document.querySelector(".aa4-root") as HTMLElement) || document.body);
  }, []);

  const openMenu = () => {
    const t = triggerRef.current;
    if (!t) return;
    const MENU_H = MIX_TYPES.length * 40 + 14;
    let r = t.getBoundingClientRect();
    // ensure room below: scroll the trigger up first (runs before the scroll-
    // dismiss listener is attached), so the menu can always open downward.
    const deficit = MENU_H + 12 - (window.innerHeight - r.bottom);
    if (deficit > 0) {
      window.scrollBy(0, deficit);
      r = t.getBoundingClientRect();
    }
    const minWidth = Math.max(MENU_W, r.width);
    // align the menu's inline-start (right, RTL) with the trigger's right edge
    const left = Math.max(8, Math.min(r.right - minWidth, window.innerWidth - minWidth - 8));
    setPos({ top: r.bottom + 5, left, minWidth });
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const opts = Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>("[data-opt]"));
    (opts.find((o) => o.dataset.selected === "true") || opts[0])?.focus();
  }, [open]);

  const onListKey = (e: React.KeyboardEvent) => {
    const opts = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-opt]") || []);
    const idx = opts.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      opts[Math.min(idx + 1, opts.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      opts[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      opts[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      opts[opts.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="w-full">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openMenu();
          }
        }}
        className="aa4-typetrigger"
      >
        {meta ? (
          <>
            <Medallion tint={meta.tint} color={meta.color} Icon={meta.Icon} size={22} />
            <span className="truncate" style={{ color: meta.strong }}>
              {meta.label}
            </span>
          </>
        ) : (
          <span className="truncate ps-0.5 text-[var(--ink-4)]">בחר סוג</span>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.18 }} className="ms-auto flex text-[var(--ink-4)]">
          <CaretDown className="size-3.5" weight="bold" />
        </motion.span>
      </button>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.ul
                ref={menuRef}
                role="listbox"
                aria-label={ariaLabel}
                dir="rtl"
                onKeyDown={onListKey}
                style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.minWidth }}
                initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="aa4-typemenu origin-top"
              >
                {MIX_TYPES.map((t) => {
                  const selected = t.value === value;
                  return (
                    <li key={t.value} role="none">
                      <button
                        type="button"
                        data-opt
                        data-selected={selected}
                        role="option"
                        aria-selected={selected}
                        tabIndex={-1}
                        onClick={() => {
                          onChange(t.value);
                          close();
                        }}
                        className="aa4-typeopt"
                        style={selected ? { background: t.tint } : undefined}
                      >
                        <Medallion tint={t.tint} color={t.color} Icon={t.Icon} size={24} />
                        <span style={{ color: t.strong }}>{t.label}</span>
                        {selected && <Check className="ms-auto size-4 shrink-0" style={{ color: t.color }} weight="bold" />}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          portalTarget
        )}
    </div>
  );
}

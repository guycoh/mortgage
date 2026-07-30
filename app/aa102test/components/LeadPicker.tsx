"use client";

// Which lead's board is on screen.
//
// Search runs on the server — there are thousands of leads and the list only
// ever shows a page of them. A numeric query is treated as an id first, which
// is how people refer to a lead out loud ("תפתח לי את 3").

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown, CircleNotch, MagnifyingGlass, UserCircle, X } from "@phosphor-icons/react";
import { settle, snap } from "../lib/transitions";

export type Lead = { id: number; name: string | null };

const W = 300;

export default function LeadPicker({
  lead,
  onPick,
  onClear,
}: {
  lead: Lead | null;
  onPick: (lead: Lead) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({
      top: r.bottom + 5,
      left: Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8),
    });
  }, [open]);

  // debounce, so typing a name is one request per pause rather than per key
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/aa100/leads?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled) setRows(data.leads ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, q ? 220 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // An entity, not a label: the initial in a filled disc, the name at reading
  // weight, the id demoted to a footnote. With nothing picked the disc goes
  // neutral and the name becomes the invitation.
  const name = lead ? lead.name?.trim() || "ללא שם" : "בחרו ליד";
  const initial = (lead?.name ?? "").trim().charAt(0) || (lead ? "•" : "");

  return (
    <>
      <motion.button
        ref={btnRef}
        type="button"
        className="lgr-picker"
        data-open={open || undefined}
        data-empty={!lead || undefined}
        whileTap={{ scale: 0.97 }}
        transition={snap}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={lead ? "החלפת ליד" : "בחירת הליד שאליו נשמר התמהיל"}
      >
        <span className="lgr-avatar" aria-hidden>
          {lead ? initial : <UserCircle size={16} weight="regular" />}
        </span>
        <span className="lgr-picker-name">{name}</span>
        {lead && <span className="lgr-picker-id">{lead.id}</span>}
        <CaretDown size={12} weight="bold" className="lgr-picker-caret" />
      </motion.button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={popRef}
                dir="rtl"
                className="lgr-pop lgr-vars"
                style={{ top: pos.top, left: pos.left, width: W, padding: 0, transformOrigin: "top right" }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                transition={settle}
              >
                <div className="relative border-b p-2" style={{ borderColor: "var(--line)" }}>
                  <MagnifyingGlass
                    size={14}
                    className="pointer-events-none absolute inset-y-0 end-4 my-auto"
                    style={{ color: "var(--lgr-4)" }}
                  />
                  <input
                    autoFocus
                    className="lgr-input w-full pe-8"
                    placeholder="שם או מספר ליד…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                <div className="lgr-scroll max-h-[264px] overflow-auto p-1">
                  {busy && !rows.length && (
                    <div className="flex items-center justify-center gap-2 py-6 text-[12px]" style={{ color: "var(--lgr-4)" }}>
                      <CircleNotch size={14} className="animate-spin" />
                      מחפש…
                    </div>
                  )}
                  {!busy && !rows.length && (
                    <div className="py-6 text-center text-[12px]" style={{ color: "var(--lgr-4)" }}>
                      לא נמצאו לידים
                    </div>
                  )}
                  {rows.map((l) => (
                    <button
                      key={l.id}
                      className="lgr-sel-item"
                      data-on={l.id === lead?.id || undefined}
                      onClick={() => {
                        onPick(l);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{l.name?.trim() || "ללא שם"}</span>
                      <span className="lgr-sel-note">{l.id}</span>
                    </button>
                  ))}
                </div>

                {lead && (
                  <div className="border-t p-1" style={{ borderColor: "var(--line)" }}>
                    <button
                      className="lgr-btn lgr-btn-ghost lgr-btn-sm w-full !justify-start"
                      onClick={() => {
                        onClear();
                        setOpen(false);
                      }}
                    >
                      <X size={13} weight="bold" />
                      חזרה לבחירת ליד
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

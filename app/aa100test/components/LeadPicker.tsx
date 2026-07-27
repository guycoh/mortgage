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

  const label = lead ? `${lead.name?.trim() || "ללא שם"} · ${lead.id}` : "בחרו ליד";

  return (
    <>
      <button
        ref={btnRef}
        className="fin-btn"
        data-open={open || undefined}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={lead ? "החלפת ליד" : "בחירת הליד שאליו נשמר התמהיל"}
      >
        <UserCircle size={15} weight={lead ? "fill" : "regular"} style={{ color: lead ? "var(--primary)" : undefined }} />
        <span className="max-w-[190px] truncate">{label}</span>
        <CaretDown size={12} weight="bold" style={{ color: "var(--ink-4)" }} />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={popRef}
                dir="rtl"
                className="fin-pop fin-vars"
                style={{ top: pos.top, left: pos.left, width: W, padding: 0 }}
                initial={{ opacity: 0, y: -5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.985 }}
                transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative border-b p-2" style={{ borderColor: "var(--line)" }}>
                  <MagnifyingGlass
                    size={14}
                    className="pointer-events-none absolute inset-y-0 end-4 my-auto"
                    style={{ color: "var(--ink-4)" }}
                  />
                  <input
                    autoFocus
                    className="fin-input w-full pe-8"
                    placeholder="שם או מספר ליד…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                <div className="fin-scroll max-h-[264px] overflow-auto p-1">
                  {busy && !rows.length && (
                    <div className="flex items-center justify-center gap-2 py-6 text-[12px]" style={{ color: "var(--ink-4)" }}>
                      <CircleNotch size={14} className="animate-spin" />
                      מחפש…
                    </div>
                  )}
                  {!busy && !rows.length && (
                    <div className="py-6 text-center text-[12px]" style={{ color: "var(--ink-4)" }}>
                      לא נמצאו לידים
                    </div>
                  )}
                  {rows.map((l) => (
                    <button
                      key={l.id}
                      className="fin-sel-item"
                      data-on={l.id === lead?.id || undefined}
                      onClick={() => {
                        onPick(l);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{l.name?.trim() || "ללא שם"}</span>
                      <span className="fin-sel-note">{l.id}</span>
                    </button>
                  ))}
                </div>

                {lead && (
                  <div className="border-t p-1" style={{ borderColor: "var(--line)" }}>
                    <button
                      className="fin-btn fin-btn-ghost fin-btn-sm w-full !justify-start"
                      onClick={() => {
                        onClear();
                        setOpen(false);
                      }}
                    >
                      <X size={13} weight="bold" />
                      עבודה מקומית ללא ליד
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

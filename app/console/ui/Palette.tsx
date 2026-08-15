"use client";

// ⌘K — jump anywhere.
//
// A monitoring panel is a place you arrive at with a question already formed
// ("what did דנה do today", "did anything break"). The palette lets that
// question be typed instead of navigated to: screens, time ranges, and every
// advisor and client the window knows about.

import { Command } from "cmdk";
import { useEffect } from "react";

export interface PaletteAction {
  group: string;
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export default function Palette({
  open,
  onOpenChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actions: PaletteAction[];
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const groups = actions.reduce<Record<string, PaletteAction[]>>((acc, a) => {
    (acc[a.group] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="cns-cmdk-scrim" onClick={() => onOpenChange(false)}>
      <div className="cns-cmdk" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <Command label="חיפוש" loop>
          <Command.Input autoFocus placeholder="חיפוש מסך, נציג או לקוח…" />
          <Command.List>
            <Command.Empty>לא נמצא כלום</Command.Empty>
            {Object.entries(groups).map(([group, items]) => (
              <Command.Group key={group} heading={group}>
                {items.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`${a.label} ${a.hint ?? ""}`}
                    onSelect={() => {
                      a.run();
                      onOpenChange(false);
                    }}
                  >
                    {a.label}
                    {a.hint ? (
                      <span style={{ marginInlineStart: "auto", fontSize: 11, color: "var(--ink-4)" }}>
                        {a.hint}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

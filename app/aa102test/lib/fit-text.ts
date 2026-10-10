// Figures that fit their box, at any screen width.
//
// The ledger's columns are percentages of a saturated colgroup (see Ledger's
// colgroup notes): on a 1366–1536px laptop a balance of ₪2,000,000 or a rate of
// 13.75 is wider than its input, and an input does not wrap — it clips, and the
// advisor reads "2,000,00" or "13.7". No column has width to give, so the figure
// gives instead: each input whose value is wider than its content box has its
// font stepped down to fit, never below FLOOR px, and goes back to the stylesheet
// size the moment it fits again.
//
// Measured with canvas against the input's own computed font. That is exact for
// what these inputs hold — Latin digits, commas, dots, slashes, a minus — unlike
// the Hebrew labels that lie to every intrinsic measure on this page (see
// CLAUDE.md §8). A 2px allowance covers the caret.

import { useEffect, useLayoutEffect, type RefObject } from "react";

const FLOOR = 10;
let ctx: CanvasRenderingContext2D | null = null;

function fitOne(el: HTMLInputElement) {
  if (el.type === "hidden") return;
  // The stylesheet size is the ceiling; read it with no inline override on.
  if (!el.dataset.fitBase) {
    el.style.fontSize = "";
    el.dataset.fitBase = getComputedStyle(el).fontSize;
  }
  const base = parseFloat(el.dataset.fitBase) || 13;
  const text = el.value;
  if (!text) {
    el.style.fontSize = "";
    return;
  }
  const cs = getComputedStyle(el);
  const room =
    el.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0") - 2;
  if (room <= 0) return;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${base}px ${cs.fontFamily}`;
  const spacing = parseFloat(cs.letterSpacing) || 0;
  const need = ctx.measureText(text).width + spacing * text.length;
  if (need <= room) {
    el.style.fontSize = "";
    return;
  }
  const size = Math.max(FLOOR, Math.floor(base * (room / need) * 4) / 4);
  el.style.fontSize = `${size}px`;
}

/**
 * Keep every `input.lgr-cell` inside `root` fitting its box: after each render,
 * on every keystroke, and whenever the table changes width.
 */
export function useFitInputs(root: RefObject<HTMLElement | null>, deps: unknown[]) {
  const fitAll = () => {
    const el = root.current;
    if (!el) return;
    el.querySelectorAll<HTMLInputElement>("input.lgr-cell").forEach(fitOne);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(fitAll, deps);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onInput = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement && t.classList.contains("lgr-cell")) fitOne(t);
    };
    el.addEventListener("input", onInput);
    // Fonts arriving late change every measurement once.
    document.fonts?.ready.then(fitAll).catch(() => {});
    const ro = new ResizeObserver(() => fitAll());
    ro.observe(el);
    return () => {
      el.removeEventListener("input", onInput);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);
}

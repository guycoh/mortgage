"use client";

// The client offer as a PDF — the same page the link opens, as a document.
//
// Nothing is redrawn for print: OfferView renders off screen in its STILL mode
// (every figure final, every chart drawn, nothing waiting on a scroll), the
// rendered page is captured at twice its size, and the capture is laid out on
// A4. Pages break only BETWEEN the page's own blocks (the table, the hero, the
// month, each chart section, the contact, the footer) so no section is ever
// cut in half; only a block taller than a whole page is split.
//
// It runs in the advisor's browser from the share dialog, so it needs no link,
// no database row and no server — the PDF exists the moment it is asked for.

import { createRoot } from "react-dom/client";
import { toCanvas } from "html-to-image";
import { PDFDocument } from "pdf-lib";
import OfferView from "./[id]/OfferView";
import type { OfferPayload } from "@/app/aa102test/lib/offer";
import "@fontsource-variable/inter";
import "@fontsource/assistant/hebrew-300.css";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "./offer.css";

/** A4 in PDF points. */
const A4 = { w: 595.28, h: 841.89 };
/** The page is laid out at its desktop width — the design's full composition. */
const WIDTH = 820;
/** Capture at 2× so type and hairlines stay sharp when the PDF is zoomed. */
const SCALE = 2;
/** Breathing room at the top and bottom of every PDF page, in CSS px. */
const MARGIN = 34;

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Until the fonts are in and every chart has drawn its canvas. */
async function settle(host: HTMLElement, charts: number) {
  await document.fonts.ready;
  const until = Date.now() + 8000;
  while (host.querySelectorAll(".ofr-root canvas").length < charts && Date.now() < until) await wait(100);
  await frame();
  await frame();
  await wait(250);
}

/** Slice points: [from, to] in CSS px, breaking between blocks wherever possible. */
function paginate(blocks: { top: number; bottom: number }[], total: number, room: number) {
  const cuts: [number, number][] = [];
  let y0 = 0;
  for (const b of blocks) {
    if (b.bottom - y0 <= room) continue;
    if (b.top > y0) {
      cuts.push([y0, b.top]);
      y0 = b.top;
    }
    while (b.bottom - y0 > room) {
      cuts.push([y0, y0 + room]);
      y0 += room;
    }
  }
  if (total > y0) cuts.push([y0, total]);
  return cuts;
}

export async function offerPdf(offer: OfferPayload, expiresAt: string): Promise<Blob> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;top:0;left:${-WIDTH * 3}px;width:${WIDTH}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(<OfferView offer={offer} expiresAt={expiresAt} still />);
    const saving = offer.current.cost - offer.proposed.cost;
    await settle(host, saving > 0 ? 2 : 1);

    const page = host.querySelector<HTMLElement>(".ofr-page");
    const paperEl = host.querySelector<HTMLElement>(".ofr-root");
    if (!page || !paperEl) throw new Error("offer did not render");
    const paper = getComputedStyle(paperEl).backgroundColor;

    const w = page.offsetWidth;
    const h = page.offsetHeight;
    const top = page.getBoundingClientRect().top;
    const blocks = Array.from(page.children).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - top, bottom: r.bottom - top };
    });

    const shot = await toCanvas(page, { pixelRatio: SCALE, backgroundColor: paper, width: w, height: h });

    const pageH = (w * A4.h) / A4.w;
    const cuts = paginate(blocks, h, pageH - MARGIN * 2);

    const pdf = await PDFDocument.create();
    pdf.setTitle(offer.client ? `הצעה עבור ${offer.client}` : "הצעת משכנתא");
    pdf.setAuthor(offer.advisor.name || "מורגי");
    pdf.setCreator("מורגי");

    for (const [from, to] of cuts) {
      const c = document.createElement("canvas");
      c.width = Math.round(w * SCALE);
      c.height = Math.round(pageH * SCALE);
      const g = c.getContext("2d");
      if (!g) throw new Error("no canvas");
      g.fillStyle = paper;
      g.fillRect(0, 0, c.width, c.height);
      const sy = Math.round(from * SCALE);
      const sh = Math.round((to - from) * SCALE);
      g.drawImage(shot, 0, sy, shot.width, sh, 0, Math.round(MARGIN * SCALE), c.width, sh);
      const jpg = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.92)
      );
      const img = await pdf.embedJpg(await jpg.arrayBuffer());
      pdf.addPage([A4.w, A4.h]).drawImage(img, { x: 0, y: 0, width: A4.w, height: A4.h });
    }

    const bytes = await pdf.save();
    return new Blob([bytes as BlobPart], { type: "application/pdf" });
  } finally {
    root.unmount();
    host.remove();
  }
}

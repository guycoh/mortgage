"use client";

// THE MARK.
//
// Two houses, one behind the other: the front one in the identity violet, and
// a second, paler one peeking out behind its top-left shoulder. Two tones of
// one hue — the light one is the violet the system already uses as its tint —
// so the mark reads as depth, not as a second colour asking for attention.
//
// Why an echo rather than a split face: a house split light/dark down the
// middle needs a seam, and at 30px a seam is a wobble. Two whole silhouettes
// stay clean at any size, and the offset gives the mark a direction — the
// house in front, something released from behind it — which is not a bad
// story for a company that frees equity out of homes.
//
// Still one SVG, no library: the craft here is geometry and restraint, and a
// runtime that draws gradients would weigh a thousand times what this does.
//
//   THE BACK HOUSE  flat tint violet. Flat on purpose — a gradient on the
//                   background object would compete with the one on the front.
//   THE FRONT HOUSE one narrow ramp of the identity violet, lit from above
//                   like every other surface in this system.
//   THE DOOR        a real hole (evenodd), so the mark is correct on any
//                   ground it is ever placed on — the doorway shows the page
//                   through it, not a white patch.
//   THE GAP         the front house wears a hairline stroke in the page's
//                   white, so the two silhouettes never touch: the seam
//                   between them is drawn by the background itself.

/**
 * Drawn on a 24-grid. The ink box is x 2.9→21.1, y 4.15→20.8 — deliberately
 * not the full grid, so the mark keeps its own optical margin wherever it is
 * placed. Soft shoulders where the roof meets the walls, so the silhouette
 * reads warm rather than as a pitched triangle on a box.
 */
const HOUSE =
  "M12 4.15C12.86 4.15 13.4 4.45 14.06 4.98L20.1 9.83C20.86 10.44 21.1 11.02 21.1 12.05V18.5" +
  "A2.3 2.3 0 0 1 18.8 20.8H5.2A2.3 2.3 0 0 1 2.9 18.5V12.05C2.9 11.02 3.14 10.44 3.9 9.83" +
  "L9.94 4.98C10.6 4.45 11.14 4.15 12 4.15Z";
/** Wound as a second subpath of the same path, so evenodd punches it out. */
const DOOR = "M9.62 20.8V16.35A2.38 2.38 0 0 1 14.38 16.35V20.8Z";

export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="מורגי"
      style={{ display: "block", flex: "none" }}
    >
      <defs>
        <linearGradient id="morgi-face" x1="0.15" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#6f68e4" />
          <stop offset="1" stopColor="#4b43c3" />
        </linearGradient>
      </defs>

      {/* the echo — same silhouette, smaller, up and to the left, in the tint */}
      <g transform="translate(-1.45 -2.2) scale(0.88)">
        <path d={HOUSE} fill="#c9c4f4" />
      </g>

      {/* the house — stroked in the page's white so the background itself
          draws the gap between the two silhouettes */}
      <path
        d={`${HOUSE}${DOOR}`}
        fill="url(#morgi-face)"
        fillRule="evenodd"
        stroke="#fff"
        strokeWidth="1.1"
      />
    </svg>
  );
}

// THE MARK — a house with the money coming out of it.
//
// Drawn rather than picked from an icon set, for one reason: it has to be the
// same object in two places. The button in the simulator's title row and the
// masthead of the page it opens carry this exact glyph, so pressing it feels
// like walking through a door instead of loading a route.
//
// Geometric, one stroke weight, no perspective — the same register as the
// intake bay's document mark. It reads at 18px, which is the size it is used
// at in the button.

export default function ReverseMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* the asset */}
      <path d="M3.7 10.3 L12 3.7 L20.3 10.3 V19.1 A1.4 1.4 0 0 1 18.9 20.5 H5.1 A1.4 1.4 0 0 1 3.7 19.1 Z" />
      {/* and what leaves it — pointing the way the page's Hebrew runs */}
      <path d="M15.3 15 H9.5" />
      <path d="M11.7 12.8 L9.3 15 L11.7 17.2" />
    </svg>
  );
}

// THE MARK — a house being added.
//
// Drawn rather than picked from an icon set, because the three tabs have to
// read as three instruments belonging to one product: the same stroke weight,
// the same corner radius, the same level of abstraction. Stack (תמהילים) is a
// stack of mixes, משכנתא הפוכה is the house with the money leaving it — and
// משכנתא חדשה is the house with the plus: the asset being brought in.
//
// The plus is drawn where the reverse mark's arrow sits, so switching between
// the two tabs reads as the same object changing verbs.
//
// Geometric, one stroke weight, no perspective. It reads at 17px, which is the
// size the tab uses it at.

export default function AbilityMark({ size = 20 }: { size?: number }) {
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
      {/* and the one being added */}
      <path d="M12 12.2 V17.8" />
      <path d="M9.2 15 H14.8" />
    </svg>
  );
}

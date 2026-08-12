// The console's own marks.
//
// The identity is a SCOPE, not a line chart: an open ring, a centre, a sweep
// arm and the blip it has found. A rising-chart glyph would say "analytics",
// which is the wrong promise — this panel does not forecast anything. It
// watches, and reports what it saw.

export function Scope({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Open at the upper right, where the arm leaves the dish. */}
      <path
        d="M20.2 12A8.2 8.2 0 1 1 15.9 4.85"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M12 12 17.3 6.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="12" cy="12" r="1.55" fill="currentColor" />
      <circle cx="18.5" cy="5.5" r="2.1" fill="currentColor" />
    </svg>
  );
}

/**
 * The same scope, at display size, with the sweep actually sweeping. Used
 * once — on the standing-by panel — so the movement means "receiving" rather
 * than decorating.
 */
export function ScopeLive({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.1" opacity="0.22" />
      <circle cx="12" cy="12" r="4.6" stroke="currentColor" strokeWidth="1.1" opacity="0.18" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" opacity="0.6" />
      <g className="cns-sweep" style={{ transformOrigin: "12px 12px" }}>
        <path
          d="M12 12 12 3.8"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

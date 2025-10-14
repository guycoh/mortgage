import React from "react";

type Props = {
  size?: number | string;
  className?: string;
  title?: string;
  subtitle?: string;
};

export default function PersonWithHeadphones({
  size = 360,
  className = "",
  title = "צרו קשר — נשמח לעזור",
  subtitle = ""
}: Props) {
  const numericSize = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={`rounded-2xl p-4 bg-gradient-to-b from-slate-900/20 to-transparent shadow-lg inline-block ${className}`}
      style={{ width: numericSize }}
      role="img"
      aria-label={title}
    >
      <svg
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="auto"
        aria-labelledby="personTitle personDesc"
      >
        <title id="personTitle">אדם עם אוזניות</title>
        <desc id="personDesc">איור וקטורי סטייל 3D של ראש ובו אוזניות — מתאים לטופס צור קשר</desc>

        <defs>
          <radialGradient id="skinGrad" cx="40%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#ffd9b3" />
            <stop offset="60%" stopColor="#f6b78a" />
            <stop offset="100%" stopColor="#e09261" />
          </radialGradient>

          <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2b2f6b" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          <linearGradient id="headphoneShell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="18" floodColor="#0b1220" floodOpacity="0.45" />
          </filter>

          <filter id="rim" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

        </defs>

        <g>
          <circle cx="300" cy="220" r="180" fill="url(#hairGrad)" opacity="0.12" />
          <circle cx="300" cy="220" r="90" fill="#34d399" opacity="0.06" />
        </g>

        <g transform="translate(0,160)">
          <path d="M200 360 C 240 420, 360 420, 400 360 L 400 460 L 200 460 Z" fill="#0f1724" opacity="0.18" />
        </g>

        <g filter="url(#softShadow)">
          <rect x="265" y="290" width="70" height="50" rx="14" fill="url(#skinGrad)" />
        </g>

        <g id="head">
          <ellipse cx="300" cy="220" rx="110" ry="140" fill="url(#skinGrad)" stroke="#000000" strokeOpacity="0.03" />

          <ellipse cx="345" cy="245" rx="40" ry="30" fill="#ffffff" opacity="0.08" />
          <ellipse cx="255" cy="245" rx="30" ry="22" fill="#000000" opacity="0.06" />

          <path d="M200 170 C 230 80, 370 80, 400 170 C 380 140, 360 130, 300 140 C 240 150, 220 160, 200 170 Z" fill="url(#hairGrad)" />

          <path d="M260 145 C 280 130, 320 130, 340 145 C 325 130, 275 130, 260 145 Z" fill="rgba(255,255,255,0.06)" />

          <g transform="translate(0,10)">
            <ellipse cx="275" cy="210" rx="12" ry="9" fill="#0b1220" />
            <ellipse cx="325" cy="210" rx="12" ry="9" fill="#0b1220" />
            <circle cx="277" cy="205" r="3" fill="#ffffff" opacity="0.9" />
            <circle cx="327" cy="205" r="3" fill="#ffffff" opacity="0.9" />
          </g>

          <path d="M300 225 C 295 230, 305 235, 300 240" stroke="#8b5f42" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />

          <path d="M285 260 C 295 270, 305 270, 315 260" stroke="#8b5f42" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
        </g>

        <g>
          <path d="M185 170 C 250 80, 350 80, 415 170" stroke="#071233" strokeWidth="28" strokeLinecap="round" opacity="0.12" />

          <path d="M190 170 C 255 85, 345 85, 410 170" stroke="url(#metal)" strokeWidth="20" strokeLinecap="round" filter="url(#rim)" />

          <g transform="translate(170,200)">
            <ellipse cx="0" cy="40" rx="46" ry="60" fill="url(#headphoneShell)" stroke="#064e3b" strokeWidth="4" />
            <ellipse cx="0" cy="40" rx="28" ry="36" fill="#052e1f" opacity="0.12" />
            <ellipse cx="0" cy="40" rx="26" ry="34" fill="rgba(255,255,255,0.04)" />
            <rect x="-6" y="-10" width="12" height="22" rx="6" fill="url(#metal)" transform="rotate(-18)" />
          </g>

          <g transform="translate(430,200)">
            <ellipse cx="0" cy="40" rx="46" ry="60" fill="url(#headphoneShell)" stroke="#064e3b" strokeWidth="4" />
            <ellipse cx="0" cy="40" rx="28" ry="36" fill="#052e1f" opacity="0.12" />
            <ellipse cx="0" cy="40" rx="26" ry="34" fill="rgba(255,255,255,0.04)" />
            <rect x="-6" y="-10" width="12" height="22" rx="6" fill="url(#metal)" transform="rotate(18)" />
          </g>
        </g>

        <g>
          <path d="M430 260 C 420 270, 390 290, 360 300" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.9" />
          <circle cx="355" cy="303" r="8" fill="#0b1220" />
        </g>

        <ellipse cx="300" cy="370" rx="130" ry="28" fill="#000" opacity="0.18" />

        <g transform="translate(380,380)">
          <rect x="0" y="0" width="170" height="60" rx="12" fill="#0b1220" opacity="0.5" />
          <rect x="6" y="6" width="158" height="48" rx="10" fill="#ffffff" opacity="0.06" />
          <text x="22" y="36" fontFamily="Inter, Roboto, Arial, sans-serif" fontSize="16" fill="#e6fffa">{title}</text>
        </g>

      </svg>
      {subtitle ? (
        <div className="mt-2 text-sm text-slate-300" style={{ textAlign: "left" }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

import { bankBrand } from "../debtTags";

// Small, circular, brand-evocative marks for the Israeli lenders. These are
// simplified original glyphs (brand colour + a distinctive simple form), not
// exact logo reproductions — enough to recognise a bank at a glance.

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0" aria-hidden role="img">
      {children}
    </svg>
  );
}

type Renderer = (size: number) => React.ReactElement;

const CUSTOM: { test: RegExp; render: Renderer }[] = [
  {
    // Leumi: navy field, bright-blue dome, white wave.
    test: /לאומי/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#1b2270" />
        <path d="M4 15.2C4 9 9.4 4 16 4s12 5 12 11.2v.4C22 12.4 10 12.4 4 15.6Z" fill="#2f6bf6" />
        <path d="M4 15.6C10 12.4 22 12.4 28 15.6v2.2C22 14.6 10 14.6 4 17.8Z" fill="#fff" />
      </Svg>
    ),
  },
  {
    // Isracard: twin overlapping diamonds, red + blue, on white.
    test: /ישראכרט|isracard/i,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#fff" />
        <circle cx="16" cy="16" r="15.3" fill="none" stroke="#e4e8ee" strokeWidth="1.4" />
        <rect x="6.4" y="11" width="10.6" height="10.6" rx="2.6" transform="rotate(45 11.7 16.3)" fill="#ec1c24" />
        <rect x="15" y="11" width="10.6" height="10.6" rx="2.6" transform="rotate(45 20.3 16.3)" fill="#2f4bf0" />
      </Svg>
    ),
  },
  {
    // Hapoalim: red field, white stacked bars.
    test: /פועלים/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#e11a2c" />
        <rect x="11" y="9.6" width="10" height="2.7" rx="1.35" fill="#fff" />
        <rect x="8.6" y="14.65" width="14.8" height="2.7" rx="1.35" fill="#fff" />
        <rect x="6.2" y="19.7" width="19.6" height="2.7" rx="1.35" fill="#fff" />
      </Svg>
    ),
  },
  {
    // Discount: green field, white upward arch.
    test: /דיסקונט/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#0a8f43" />
        <path d="M9 21.5C9 12 23 12 23 21.5" fill="none" stroke="#fff" strokeWidth="3.1" strokeLinecap="round" />
        <circle cx="16" cy="11.4" r="1.7" fill="#fff" />
      </Svg>
    ),
  },
  {
    // Mizrahi-Tefahot: split teal / amber, white core.
    test: /מזרחי|טפחות/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#0a9498" />
        <path d="M16 0a16 16 0 0 1 0 32Z" fill="#ef8321" />
        <circle cx="16" cy="16" r="4.4" fill="#fff" />
      </Svg>
    ),
  },
  {
    // FIBI (Beinleumi): blue field, white tilted square.
    test: /בינלאומי/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#12579e" />
        <rect x="10.5" y="10.5" width="11" height="11" rx="2.4" transform="rotate(45 16 16)" fill="#fff" />
        <rect x="13.2" y="13.2" width="5.6" height="5.6" rx="1.3" transform="rotate(45 16 16)" fill="#12579e" />
      </Svg>
    ),
  },
  {
    // Max: magenta field, white rounded 'm' bars.
    test: /\bמקס\b|max/i,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#e6007e" />
        <path d="M9 22V13a2.2 2.2 0 0 1 4-1.3l3 4 3-4A2.2 2.2 0 0 1 23 13v9" fill="none" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    // Triya: violet field, white spark.
    test: /טריא|triya/i,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#5b4bd6" />
        <path d="M16 6l2.6 6.8L25 15l-6.4 2.2L16 24l-2.6-6.8L7 15l6.4-2.2Z" fill="#fff" />
      </Svg>
    ),
  },
];

/** Circular bank mark; falls back to a brand-coloured monogram disc. */
export function BankIcon({ source, size = 22 }: { source?: string; size?: number }) {
  const hit = CUSTOM.find((b) => b.test.test(source || ""));
  if (hit) return hit.render(size);
  const { color, initial } = bankBrand(source);
  return (
    <Svg size={size}>
      <circle cx="16" cy="16" r="16" fill={color} />
      <text x="16" y="16.5" textAnchor="middle" dominantBaseline="central" fontSize="13.5" fontWeight="700" fill="#fff">
        {initial}
      </text>
    </Svg>
  );
}

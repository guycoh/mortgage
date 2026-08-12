// Circular bank marks — the same glyphs /aa4test draws, copied rather than
// imported. These sandbox routes are self-contained by design: a change to one
// must never move under another, which is the same reason their CSS prefixes
// are disjoint. If a logo is corrected in /aa4test, correct it here too.
//
// Simplified original marks (brand colour plus one distinctive form) taken from
// each Israeli lender's real logo — enough to recognise a bank at a glance in a
// dense row, at 14px, with no text at all.

import { lenderOf } from "../lib/lenders";

/** Brand colour and initial, for lenders with no drawn mark of their own. */
const BANK_BRANDS: { test: RegExp; color: string; initial: string }[] = [
  { test: /לאומי/, color: "#0c4a8b", initial: "ל" },
  { test: /פועלים/, color: "#c8102e", initial: "פ" },
  { test: /מזרחי|טפחות/, color: "#c56a12", initial: "מ" },
  { test: /דיסקונט/, color: "#0a7d3b", initial: "ד" },
  { test: /מרכנתיל/, color: "#0a7d3b", initial: "מר" },
  { test: /בינלאומי/, color: "#12579e", initial: "ב" },
  { test: /ירושלים/, color: "#8a6d1f", initial: "י" },
  { test: /יהב/, color: "#1a7a3f", initial: "יה" },
  { test: /איגוד/, color: "#00477d", initial: "א" },
  { test: /ישראכרט|isracard/i, color: "#c8102e", initial: "יש" },
  { test: /כאל|cal|ויזה/i, color: "#0b5fa5", initial: "כ" },
  { test: /מקס|max/i, color: "#cc0070", initial: "מ" },
  { test: /טריא|triya/i, color: "#5b4bd6", initial: "ט" },
  { test: /אמריקן|amex|אמקס/i, color: "#1f6fb2", initial: "A" },
  { test: /כרטיסי אשראי|אשראי/, color: "#4f57a6", initial: "כ" },
];

/**
 * A monogram off the lender's SHORT name, not off its legal one.
 *
 * "מימון ישיר מקבוצת ישיר (2006) בע\"מ" begins with the same letter as half the
 * non-bank lenders in the country; "מימון ישיר" gives "מי", which at least tells
 * two of them apart. Two words → one letter each, the way מרכנתיל is "מר".
 */
function monogram(source: string): string {
  const words = (lenderOf(source).name || source.replace(/^ה?בנק\s*/, ""))
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].charAt(0);
  return words[0].charAt(0) + words[1].charAt(0);
}

/**
 * A lender with no drawn mark and no known brand colour gets a neutral slate
 * disc rather than an invented colour. Now that every row prints the lender's
 * NAME beside the mark, the disc no longer has to identify anyone on its own —
 * so a plausible-looking green for a lender whose brand is red would be a claim
 * made for no gain.
 */
function bankBrand(source?: string): { color: string; initial: string } {
  const s = source || "";
  const hit = BANK_BRANDS.find((b) => b.test.test(s));
  if (hit) return { color: hit.color, initial: hit.initial };
  return { color: "#5f7883", initial: monogram(s) || "?" };
}

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0" aria-hidden role="img">
      {children}
    </svg>
  );
}

/** White disc + hairline ring — for logos that live on a white field. */
function WhiteField() {
  return (
    <>
      <circle cx="16" cy="16" r="16" fill="#fff" />
      <circle cx="16" cy="16" r="15.3" fill="none" stroke="#e4e8ee" strokeWidth="1.4" />
    </>
  );
}

type Renderer = (size: number) => React.ReactElement;

const CUSTOM: { test: RegExp; render: Renderer }[] = [
  {
    // FIBI (Beinleumi): the real gold zigzag glyph, cropped from the bank's
    // logo (blue text removed), on a white disc. Tested BEFORE Leumi —
    // "בינלאומי" contains the substring "לאומי".
    test: /בינלאומי/,
    render: (s) => (
      <Svg size={s}>
        <WhiteField />
        <image href="data:image/png;base64,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" x="5.4" y="5.4" width="21.2" height="21.2" preserveAspectRatio="xMidYMid meet" />
      </Svg>
    ),
  },
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
    // Hapoalim: the iconic red rounded rhombus on white.
    test: /פועלים/,
    render: (s) => (
      <Svg size={s}>
        <WhiteField />
        <rect x="8.4" y="8.4" width="15.2" height="15.2" rx="3.6" transform="rotate(45 16 16)" fill="#e4032d" />
      </Svg>
    ),
  },
  {
    // Isracard: twin overlapping diamonds, red + blue, on white.
    test: /ישראכרט|isracard/i,
    render: (s) => (
      <Svg size={s}>
        <WhiteField />
        <rect x="6.4" y="11" width="10.6" height="10.6" rx="2.6" transform="rotate(45 11.7 16.3)" fill="#ec1c24" />
        <rect x="15" y="11" width="10.6" height="10.6" rx="2.6" transform="rotate(45 20.3 16.3)" fill="#2f4bf0" />
      </Svg>
    ),
  },
  {
    // Mercantile (Discount group): deep-green field, white smile. Tested
    // BEFORE Discount — the legal name "מרכנתיל דיסקונט" contains דיסקונט.
    test: /מרכנתיל/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#2e7d32" />
        <path d="M8 14.2Q16 22.4 24 14.2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    // Discount: bright leaf-green field, white smile.
    test: /דיסקונט/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#69b23e" />
        <path d="M8 14.2Q16 22.4 24 14.2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    // Mizrahi-Tefahot: the interlocking grey + orange ribbon, real logo paths
    // (viewBox 499.5×231.6) scaled onto a white disc.
    test: /מזרחי|טפחות/,
    render: (s) => (
      <Svg size={s}>
        <WhiteField />
        <g transform="translate(5 10.9) scale(0.044)">
          <path
            fill="#4d555a"
            d="M450.1,157c3.3-23-8.8-49.3-28.9-66.6c-30.1-25.9-84.2-37.8-136.5-5.8c-2.7,1.6-5.3,1.9-6.6,1.1c-2-1.2-1.7-4.1-0.2-6c11.1-13.8,56.6-75,121.5-75c43.2,0,83.8,30.2,95.4,73.6c3,11.4,4.5,20.9,4.5,29c0,0-6.1,27.7-38.2,44.4C457.6,153.6,453.9,155.3,450.1,157"
          />
          <path
            fill="#f5821f"
            d="M219.5,38.2c15.3,13.8,98.1,86.7,108,95.5c53.8,47.5,103.1,33.9,133.8,17.9c32-16.7,38.2-44.4,38.2-44.4c0.1,9.2,1.5,65.2-53.8,101.7c-36.2,23.9-99.1,42.6-169.3-18.3c-14-12.2-103.2-88.7-113.2-97.5C109.4,45.6,56.9,61.9,25.9,88.8c-9.1,7.9-20.8,21.6-25.5,33.7c0.3-5.6-0.8-37.2,31.6-75.7C47.6,28.5,77.8,0,128.8,0C158.4,0,185,7,219.5,38.2"
          />
          <path
            fill="#4d555a"
            d="M4.2,161.4c-3.7-12.7-5-25.9-3.8-39c4.8-12.1,16.4-25.7,25.5-33.6c7.2-6.3,15.2-11.7,23.8-15.9c-5.3,24,7.1,50.4,28.2,68.6c30.1,25.9,82.3,37.8,134.6,5.9c2.7-1.6,5.4-2.1,6.6-1.1c1.8,1.5,1.8,3.9,0.2,6C208.5,166.4,164,227.6,99,227.6C55.9,227.6,16.6,204.6,4.2,161.4"
          />
        </g>
      </Svg>
    ),
  },
  {
    // Bank of Jerusalem: bronze-gold disc, white fanned tree / fountain.
    test: /ירושלים/,
    render: (s) => (
      <Svg size={s}>
        <circle cx="16" cy="16" r="16" fill="#c8912e" />
        <g fill="none" stroke="#fff" strokeLinecap="round">
          <path d="M16 24.8 L16 15" strokeWidth="1.9" />
          <g strokeWidth="1.5">
            <path d="M16 16C13 13.4 10.6 12.4 8.4 12.8" />
            <path d="M16 15.4C14 11.8 13 9.6 12.9 8" />
            <path d="M16 15C16 11.4 16 9.4 16 7.6" />
            <path d="M16 15.4C18 11.8 19 9.6 19.1 8" />
            <path d="M16 16C19 13.4 21.4 12.4 23.6 12.8" />
          </g>
        </g>
      </Svg>
    ),
  },
  {
    // Bank Yahav: blue globe of wavy bands wrapped by a green orbit ring — the
    // real about-us logo paths (viewBox 326×269) scaled onto a white disc.
    test: /יהב/,
    render: (s) => (
      <Svg size={s}>
        <WhiteField />
        <g transform="translate(2 4.45) scale(0.086)">
          <g transform="translate(7 8)" fillRule="evenodd">
            <path
              fill="none"
              stroke="#4cb245"
              strokeWidth="15.8530176"
              d="M80.1056179,55.0914551 C100.683333,24.9433847 134.196511,3.91811752 173.402066,0.487691921 C242.799237,-5.58450008 303.975967,45.7509239 310.04574,115.143257 C316.117932,184.542847 264.784927,245.712319 195.390175,251.78935 C178.893864,253.232499 162.863566,251.4318 147.927435,246.916006 L138.000461,240.094242"
            />
            <g transform="translate(0 11.742536)" fill="#2d5998" stroke="#fff" strokeWidth="7.8">
              <path d="M138.714509,199.339661 C172.772006,193.461005 252.629798,158.97047 293.040115,139.791053 C297.01728,137.899238 298.626048,136.580774 301.739558,135.078451 C302.576602,134.672026 304.129728,133.791437 305.382874,132.627802 C308.08512,130.12393 309.060058,125.292787 309.776141,124.267046 C312.521933,120.362458 313.654118,129.748954 312.925939,136.309824 C311.900198,145.495526 302.31049,165.579725 302.31049,165.579725 C267.227251,187.783142 177.970867,235.155917 142.807795,237.582374 C119.772173,239.16695 109.642982,238.550054 95.1447168,234.863194 C93.19968,234.282586 91.1844864,233.687462 89.0652672,233.094758 C87.6040704,232.792358 81.781056,229.758682 80.1311616,228.590208 C77.2232832,226.52905 74.704896,224.59369 72.4574592,221.056819 C71.4728448,219.506112 70.3358208,216.84983 70.3358208,216.84983 L60.044544,186.450163 C62.5943808,187.763789 72.1502208,193.168282 83.5519104,196.417267 C87.3669888,197.513165 92.35296,199.000973 96.973632,199.833178 C102.852288,200.892787 108.089856,201.253248 110.412288,201.410496 C113.407258,201.616128 121.013222,201.908851 125.810496,201.284698 C132.446362,200.43072 133.856755,200.556518 138.714509,199.339661" />
              <path d="M278.40763,72.9272473 C251.050911,86.8217989 168.677866,124.432418 129.666701,131.185958 C119.876198,132.881818 115.342618,133.472102 102.535373,131.185958 C93.9835008,129.432038 89.0459136,128.055514 80.7577344,126.030643 C74.3565312,124.470259 62.6040576,120.650342 62.6040576,120.650342 C56.4907392,118.845619 47.0268288,115.059571 46.5720192,114.921677 C43.7971968,113.617728 40.1514624,112.156531 37.0839168,109.079309 C33.7696128,105.745651 31.0165632,98.6573952 31.0165632,98.6573952 L19.8688896,64.0313856 C38.610432,71.6881536 93.066624,93.0714624 123.751757,89.8902144 C149.804122,87.187968 219.629491,60.5743488 262.594483,40.775616 C265.44672,39.457152 268.949722,36.3799296 270.61655,34.0357248 C272.242253,31.7447424 272.510784,28.5030144 274.032461,26.4152448 C275.191258,24.820992 280.099814,32.9809536 285.651878,39.5974656 C290.66688,45.5704704 296.50441,49.8500352 295.314163,52.2958464 C293.826355,53.4909312 293.635238,59.923584 290.763648,63.8015616 C290.236262,64.5224832 288.528307,66.9658752 286.467149,68.4972288 C284.115686,70.241472 281.418278,71.0567424 281.510208,71.330112 C280.574587,71.8194268 279.53808,72.3530889 278.40763,72.9272473 Z" />
              <path d="M259.36969,26.877312 C258.452813,27.9224064 254.98368,30.1698432 253.686989,30.7649664 C253.686989,30.7649664 156.892378,73.446912 128.406298,76.6934784 C112.417805,78.5199744 105.421478,77.1676416 91.336896,74.233152 C76.9160448,71.7389568 54.710208,62.9790336 34.255872,56.6310528 C32.7583872,56.1326976 25.2903168,53.40384 24.2863488,52.8280704 C23.1735168,52.1894016 20.4591744,51.250752 19.0294272,49.750848 C15.5820672,46.1244672 16.3102464,46.8526464 14.1353856,42.6795264 C12.7927296,40.8796416 0,0 0,0 C18.9520128,8.5712256 88.9684992,38.9442816 123.814656,35.8936704 C150.358118,33.5688192 186.844493,24.0299136 229.990925,9.8993664 C229.990925,9.8993664 231.981926,9.5413248 232.966541,8.7962112 C233.653594,8.2785024 234.427738,7.1390592 234.427738,7.1390592 L235.787328,2.467584 L241.750656,3.713472 L264.278246,17.7835392 C264.278246,17.7835392 262.369498,23.4347904 259.36969,26.877312" />
              <path d="M291.235392,124.291238 C258.970522,140.098291 174.39287,179.407872 137.207347,185.315558 C134.08416,185.813914 130.883558,186.559027 127.276531,187.00416 C123.241306,187.497677 119.450419,187.635571 116.1216,187.531546 C107.770522,187.347686 103.21033,186.825139 96.3180288,185.695373 C86.885568,183.602765 80.6343552,181.77385 69.3439488,177.407194 C66.4263936,175.96777 58.9534848,172.09463 55.1722752,167.125594 C52.9417728,164.191104 51.4854144,160.651814 50.8685184,158.714035 C50.1064704,156.306931 40.0329216,125.880653 40.0329216,125.880653 C54.4029696,132.11977 98.328384,150.510528 132.349594,144.598003 C162.004147,139.447526 238.022669,107.480218 284.993856,85.7678976 C288.179942,84.297024 291.216038,82.4124672 294.077952,81.0698112 C296.281843,80.039232 298.31881,77.9321088 299.366323,74.8331136 C300.063053,72.7719552 298.079309,64.8563328 299.811456,64.0313856 C299.811456,64.0313856 309.260851,97.6050432 311.825203,101.144333 C312.275174,101.75881 307.434355,111.500928 305.119181,114.546701 C303.633792,116.491738 301.180723,118.415002 298.684109,120.064896 C295.759296,121.98816 292.778842,123.53161 291.235392,124.291238 Z" />
            </g>
            <path
              fill="none"
              stroke="#4cb245"
              strokeWidth="15.8530176"
              d="M173.402066,0.487691921 C242.799237,-5.58450008 303.975967,45.7509239 310.04574,115.143257 C316.117932,184.542847 264.784927,245.712319 195.390175,251.78935"
            />
          </g>
        </g>
      </Svg>
    ),
  },
  {
    // One Zero (digital bank): minimalist black ring with a vertical bar.
    test: /one[\s-]*zero|וואן[\s-]*זירו/i,
    render: (s) => (
      <Svg size={s}>
        <WhiteField />
        <circle cx="16" cy="16" r="8.6" fill="none" stroke="#0a0a0a" strokeWidth="2.1" />
        <line x1="16" y1="8.4" x2="16" y2="23.6" stroke="#0a0a0a" strokeWidth="2.1" strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    // Max: magenta field, white rounded 'm' bars. (No \b around מקס — \b does
    // not treat Hebrew letters as word chars, so it would never match.)
    test: /מקס|max/i,
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

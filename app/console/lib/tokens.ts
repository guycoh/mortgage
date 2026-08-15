// The console's palette, in one place, as plain hex.
//
// CSS owns the surfaces and ink; ECharts cannot read custom properties from a
// canvas, so the values a chart needs live here and console.css mirrors them.
// One list, two consumers — change a colour here and in the stylesheet's
// :root block together.
//
// The categorical slots were validated (OKLab ΔE under protan/deutan/tritan
// simulation against the white card surface): worst adjacent pair 11.6 CVD /
// 25.5 normal, all four inside the lightness band, all four over 3:1. Assign
// them in this fixed order and never cycle past the fourth — a fifth series
// folds into "אחר" instead.

export const SERIES = {
  imports: "#1F63D6", // slot 1 — blue
  entries: "#E2701F", // slot 2 — orange
  saves: "#0E9B84", // slot 3 — teal
  analyses: "#8A5CF0", // slot 4 — violet
} as const;

/**
 * The four things a person can DO with the simulator — the vocabulary of the
 * main screen.
 *
 * Colour AND shape both carry the distinction. Colour alone would be enough
 * for most readers (this set clears the all-pairs gate: worst pair ΔE 18.0
 * normal / 10.8 under simulated colour blindness, every slot over 3:1 on
 * white), but these marks are scattered points rather than a legend-anchored
 * series, so the shape is there to make identity survive a printout, a
 * projector, or a reader who never looks at the key.
 */
export const ACTION = {
  import: { fill: "#1F63D6", shape: "tick", label: "ייבוא דוח" },
  export: { fill: "#B8860B", shape: "diamond", label: "ייצוא אקסל" },
  save: { fill: "#0E9B84", shape: "dot", label: "שמירת תמהיל" },
  failed: { fill: "#C2372F", shape: "tick", label: "נכשל" },
} as const;

/** State, never identity. Always shipped beside a word — never colour alone. */
export const STATUS = {
  good: "#1E8E4F",
  warn: "#C98A0E",
  bad: "#C2372F",
} as const;

/**
 * How a visit ended, as an ORDERED ramp rather than four unrelated hues:
 * browsed → imported → saved is a progression, so it is carried by lightness
 * in one hue, which survives every kind of colour blindness. Only "failed" is
 * a different colour, because it is a state and not a further step.
 *
 * Validated as an ordinal ramp on white: monotone lightness, ΔL gaps ≥ 0.06,
 * light end 2.11:1 against the card. Text on the light step must be ink, not
 * white — hence the paired `on` colours.
 */
export const OUTCOME = {
  browsed: { fill: "#86B6EF", on: "#0C1622", label: "עיון בלבד" },
  imported: { fill: "#3C72D9", on: "#FFFFFF", label: "יובא דוח" },
  saved: { fill: "#17509F", on: "#FFFFFF", label: "נשמר תמהיל" },
  failed: { fill: "#C2372F", on: "#FFFFFF", label: "נכשל" },
} as const;

/** One hue, light→dark. For magnitude only (the rhythm heatmap). */
export const HEAT = [
  "#F2F6FD",
  "#DCE8FA",
  "#BFD5F5",
  "#95B6ED",
  "#6693E2",
  "#3C72D9",
  "#1F63D6",
  "#17509F",
] as const;

/**
 * Five ordered steps for the funnel. Ordered categories are the one case where
 * a lightness ramp is the right encoding rather than an anti-pattern — the
 * stages have a real sequence. Validated: monotone, every adjacent ΔL ≥ 0.06,
 * light end 2.11:1 on white.
 */
export const FUNNEL_RAMP = [
  "#86B6EF",
  "#5A93E4",
  "#3868CE",
  "#27539F",
  "#123A6E",
] as const;

export const INK = {
  primary: "#0C1622",
  secondary: "#48566A",
  muted: "#8493A6",
  grid: "#EAEEF4",
  axis: "#C9D2DE",
  surface: "#FFFFFF",
  plane: "#EEF1F5",
} as const;

export const FONT_UI = '"Rubik Variable", "Rubik", system-ui, sans-serif';
export const FONT_MONO = '"JetBrains Mono Variable", ui-monospace, monospace';

/** Shared ECharts text/grid defaults so every chart reads as one instrument. */
export const AXIS_LABEL = {
  fontFamily: FONT_MONO,
  fontSize: 10.5,
  color: INK.muted,
} as const;

export const TOOLTIP_BASE = {
  backgroundColor: "rgba(255,255,255,0.98)",
  borderColor: "#E3E8F0",
  borderWidth: 1,
  padding: 0,
  extraCssText:
    "box-shadow:0 18px 40px -24px rgba(12,22,34,.45), 0 2px 6px -2px rgba(12,22,34,.12); border-radius:12px;",
} as const;

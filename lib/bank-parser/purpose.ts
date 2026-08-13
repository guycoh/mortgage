// מטרת ההלוואה, normalized across four lenders that each word it differently.
//
// Every bank prints the purpose, none of them prints it the same way:
//
//   מזרחי טפחות   מטרת הלוואה     "רכישת דירה יד שניה" / "כל מטרה" / "הרחבה"
//   הפועלים       מטרת הלוואה     "הלוואה לדיור לרכישה"
//   לאומי         מטרת ההלוואה    "לווה פרטי-מגורים"
//   דיסקונט       מטרת הלוואה     "דיור"
//
// So it is free text, not an enum, and the same mortgage reads four ways
// depending on who printed the letter. The raw string is always kept — it is
// what the lender said and what an advisor wants to see — but a canonical kind
// is derived beside it so the UI can group, filter and colour on one vocabulary.
//
// The credit report (דוח ריכוז נתונים) carries a much coarser version of the
// same idea in field 201-017, with five printed values and no way to separate
// a purchase from a renovation. It is accepted here as a fallback so a client
// with no bank letter still classifies, but it can never reach the precision
// of the lender's own wording — see creditReportPurpose below.

/**
 * What the money was for. Ordered from most specific to least: a purpose that
 * resolves to `housing` is a lender saying "a mortgage" without saying which
 * kind, which is a different fact from not knowing at all.
 */
export type PurposeKind =
  | "purchase" // רכישת דירה — first or second hand
  | "build" // בנייה עצמית
  | "extend" // הרחבה
  | "renovate" // שיפוץ
  | "any" // כל מטרה — a mortgage against the property, spent elsewhere
  | "refinance" // מיחזור / גרירה
  | "business" // עסקי
  | "vehicle" // רכב
  | "consumer" // צריכה פרטית
  | "housing" // דיור, unspecified
  | "other"
  | "unknown";

/** Where the money came from — the axis that identifies a זכאות loan. */
export type FundingKind =
  | "eligibility" // הלוואת זכאות מכספי המדינה / מסובסדת ע"י משרד השיכון
  | "bank" // הלוואה חופשית מכספי בנק
  | "unknown";

export const PURPOSE_LABEL: Record<PurposeKind, string> = {
  purchase: "רכישת דירה",
  build: "בנייה",
  extend: "הרחבה",
  renovate: "שיפוץ",
  any: "כל מטרה",
  refinance: "מיחזור",
  business: "עסקי",
  vehicle: "רכב",
  consumer: "צריכה פרטית",
  housing: "דיור",
  other: "אחר",
  unknown: "לא צוין",
};

export const FUNDING_LABEL: Record<FundingKind, string> = {
  eligibility: "זכאות",
  bank: "כספי בנק",
  unknown: "",
};

/** Whitespace and the punctuation that varies between templates. */
function norm(s: string): string {
  return s.replace(/[\s'"״׳`.,;:()\-–־]/g, "");
}

/**
 * Ordered rules. First match wins, so anything that also contains a weaker
 * word must come first — "הלוואה לדיור לרכישה" contains דיור, and filing it
 * as an unspecified housing loan would throw away the one word that matters.
 */
const RULES: { kind: PurposeKind; needles: string[] }[] = [
  { kind: "any", needles: ["כלמטרה", "לכלמטרה"] },
  // גרירה declines ("גרירת משכנתא"), so match the stem — the full word sits
  // before "משכנתא", which would otherwise carry the row into `housing`.
  { kind: "refinance", needles: ["מיחזור", "מחזור", "גריר"] },
  { kind: "renovate", needles: ["שיפוץ", "שיפוצים", "שיפור"] },
  { kind: "extend", needles: ["הרחבה", "תוספתבנייה"] },
  { kind: "build", needles: ["בנייהעצמית", "בניהעצמית", "בנייה", "בניה"] },
  {
    kind: "purchase",
    needles: [
      "רכישתדירה",
      "רכישתנכס",
      "לדיורלרכישה",
      "רכישהמקבלן",
      "רכישתמגרש",
      "רכישה",
    ],
  },
  { kind: "vehicle", needles: ["רכב", "רכישתרכב"] },
  { kind: "business", needles: ["עסק", "עסקי", "תאגיד"] },
  { kind: "consumer", needles: ["צריכהפרטית", "צרכני"] },
  // Anything still naming housing is a mortgage whose kind the lender did not
  // state: Leumi's "לווה פרטי-מגורים" and Discount's bare "דיור". זכאות belongs
  // here too — a state-subsidised loan is always a housing loan; that it came
  // from state money is a funding fact, carried on the other axis.
  { kind: "housing", needles: ["מגורים", "דיור", "נדלן", "משכנת", "זכאות"] },
  { kind: "other", needles: ["אחר"] },
];

const ELIGIBILITY = ["זכאות", "מכספיהמדינה", "משרדהשיכון", "מסובסדת", "מדינה"];
const BANK_FUNDED = ["חופשיתמכספיבנק", "מכספיבנק", "חופשית"];

/**
 * Classify the lender's own wording.
 *
 * Returns `unknown` for an empty or unrecognised string rather than guessing:
 * a purpose invented for a mortgage is worse than a blank one, because the
 * board will happily group and colour on it.
 */
export function classifyPurpose(raw: string): PurposeKind {
  const hay = norm(raw);
  if (!hay) return "unknown";
  for (const rule of RULES) {
    if (rule.needles.some((n) => hay.includes(n))) return rule.kind;
  }
  return "unknown";
}

/**
 * Where the money came from, from Mizrahi's per-part "סוג ההלוואה" or from the
 * credit report's remark 201-060 ("הלוואת משכנתה מסובסדת ע"י משרד השיכון").
 * Both say the same thing in different documents: this tranche is a זכאות.
 */
export function classifyFunding(raw: string): FundingKind {
  const hay = norm(raw);
  if (!hay) return "unknown";
  if (ELIGIBILITY.some((n) => hay.includes(n))) return "eligibility";
  if (BANK_FUNDED.some((n) => hay.includes(n))) return "bank";
  return "unknown";
}

/**
 * The credit report's coarse answer (201-017), for clients with no bank letter.
 *
 * Its own five-value vocabulary, mapped explicitly rather than through the
 * free-text rules above, because one of the five is a merger the bank templates
 * never make: "נדל"ן ושיפוצים" covers a purchase AND a renovation in a single
 * value, so it can only honestly resolve to `housing`. Sending it through
 * classifyPurpose would match שיפוצים and report every mortgage in the file as
 * a renovation.
 *
 * `transactionType` is the second half of the answer. The report has no כל מטרה
 * value, but a transaction typed משכנתה whose purpose is צריכה פרטית or אחר is
 * a mortgage drawn against the home and spent elsewhere — which is what כל מטרה
 * means. In the two reports on hand that inference covers 15 mortgages.
 */
export function creditReportPurpose(value: string, transactionType = ""): PurposeKind {
  const v = norm(value);
  const isMortgage = /משכנת|לדיור/.test(transactionType);

  if (!v || v.includes("לאידוע")) return "unknown";
  if (v.includes("נדלן") || v.includes("שיפוצים")) return "housing";
  if (v.includes("כרטיסאשראי")) return "other";
  if (v.includes("רכב")) return "vehicle";
  if (v.includes("עסק")) return "business";
  // The two values that mean כל מטרה once you know the transaction is a mortgage.
  if (v.includes("צריכהפרטית")) return isMortgage ? "any" : "consumer";
  if (v.includes("אחר")) return isMortgage ? "any" : "other";
  return "unknown";
}

/** Display string: the lender's words when it has them, else the canonical label. */
export function purposeText(raw: string, kind: PurposeKind): string {
  const trimmed = raw.trim();
  return trimmed || PURPOSE_LABEL[kind];
}

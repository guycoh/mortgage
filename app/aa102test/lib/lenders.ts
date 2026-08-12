// WHO THE DEBT IS WITH — the גוף מימון behind every imported row.
//
// The חיווי אשראי names its own sources. Each transaction block opens with
// "שם מקור המידע המדווח:" and the parser keeps that line verbatim on
// `Transaction.source` → `ExtractedLoan.source` → `ImportedLoan.source_bank`.
// A bank statement names its lender once, and `BankStatement.bankLabel` carries
// it the same way. So the fact was always on the row; nothing on screen said it.
//
// What the document gives is a LEGAL name, and a legal name is not a label:
//
//   "הבנק הבינלאומי הראשון לישראל בע\"מ"        → הבינלאומי
//   "מימון ישיר מקבוצת ישיר )2006( בע\"מ"        → מימון ישיר
//   "כרטיסי אשראי לישראל בע\"מ"                  → כאל
//   "כלמוביל פתרונות מימון לרכב בע\"מ"           → כלמוביל
//
// (Those reversed brackets are not a typo. The PDF prints "(2006)" and pdf.js
// hands back the glyphs in visual order, so an RTL run turns the pair inside
// out. `repairName` puts it back.)
//
// The other half of the job is that a third of these are NOT BANKS. A row from
// מימון ישיר, from כלמוביל, from טריא or from a credit-card company reads very
// differently to an advisor than the same balance at לאומי — non-bank credit is
// dearer, shorter and usually the first thing a recycle should retire. The
// report's own glossary already draws that line, under מקור מידע מדווח:
// "בנק, חברת כרטיסי אשראי, נותן אשראי חוץ בנקאי, בנק הדואר, בנק ישראל ולשכות
// ההוצאה לפועל" — so those are the four kinds here, and no others were invented.
//
// The registry is display only. `source_bank` keeps the document's wording, which
// is what the Excel export prints and what `loanKey` matches two spouses' reports
// on; a shortening that changed either would be a shortening that changed facts.

/** The four kinds of מקור מידע מדווח the report's glossary recognises. */
export type LenderKind = "bank" | "card" | "nonbank" | "public";

/**
 * What to call the kind on screen.
 *
 * Only ever shown for the three that are worth saying. "בנק" under a bank's own
 * name is a label that tells nobody anything, and this column has one line to
 * spend — so `Lender.kindLabel` is empty for banks by design.
 */
export const LENDER_KIND_LABEL: Record<LenderKind, string> = {
  bank: "",
  card: "חברת אשראי",
  nonbank: "חוץ־בנקאי",
  public: "גוף ציבורי",
};

export interface Lender {
  /** Short display name — what an advisor says out loud. */
  name: string;
  /** The document's own wording, with the reversed-bracket artifact repaired. */
  full: string;
  kind: LenderKind;
  /** `LENDER_KIND_LABEL[kind]` — empty for banks, and for an unrecognised body. */
  kindLabel: string;
  /** The registry knew this lender. False means the name was merely tidied. */
  known: boolean;
}

/* ------------------------------------------------------------------ registry */

interface Entry {
  test: RegExp;
  name: string;
  kind: LenderKind;
}

/**
 * ORDER IS THE WHOLE TRICK. Every general pattern is a substring of some
 * specific one, so the specific case has to be tested first:
 *
 *   "הבנק הבינלאומי"  contains  לאומי
 *   "מרכנתיל דיסקונט" contains  דיסקונט
 *   "לאומי קארד"      contains  לאומי   (and is a card company, not a bank)
 *   "פועלים אקספרס"   contains  פועלים  (likewise)
 *
 * Anything added here goes ABOVE the pattern it would otherwise be swallowed by.
 */
const REGISTRY: Entry[] = [
  /* --- card companies whose names contain a bank's ------------------------ */
  { test: /לאומי\s*קארד/, name: "מקס", kind: "card" },
  { test: /פועלים\s*אקספרס/, name: "פועלים אקספרס", kind: "card" },

  /* --- banks -------------------------------------------------------------- */
  // Before לאומי: "הבנק הבינלאומי" contains it.
  { test: /בינלאומי|\bfibi\b/i, name: "הבינלאומי", kind: "bank" },
  { test: /אוצר\s*החייל/, name: "אוצר החייל", kind: "bank" },
  { test: /פאג["״׳']?י|פועלי\s*אגודת\s*ישראל/, name: 'פאג"י', kind: "bank" },
  { test: /בנק\s*מסד|(?<![א-ת])מסד(?![א-ת])/, name: "מסד", kind: "bank" },
  // Before דיסקונט: the legal name is "בנק מרכנתיל דיסקונט".
  { test: /מרכנתיל/, name: "מרכנתיל", kind: "bank" },
  { test: /דיסקונט/, name: "דיסקונט", kind: "bank" },
  { test: /מזרחי|טפחות/, name: "מזרחי טפחות", kind: "bank" },
  { test: /הפועלים|בנק\s*פועלים/, name: "הפועלים", kind: "bank" },
  { test: /לאומי/, name: "לאומי", kind: "bank" },
  { test: /יהב/, name: "יהב", kind: "bank" },
  { test: /בנק\s*ירושלים|ירושלים\s*בע/, name: "ירושלים", kind: "bank" },
  { test: /איגוד|אגוד/, name: "אגוד", kind: "bank" },
  { test: /ערבי\s*ישראלי/, name: "ערבי ישראלי", kind: "bank" },
  { test: /וואן\s*זירו|one[\s-]*zero/i, name: "וואן זירו", kind: "bank" },
  { test: /אש\s*ישראל|\besh\b/i, name: "אש ישראל", kind: "bank" },
  { test: /בנק\s*הדואר|דואר\s*ישראל/, name: "בנק הדואר", kind: "bank" },

  /* --- credit-card companies --------------------------------------------- */
  { test: /ישראכרט|isracard/i, name: "ישראכרט", kind: "card" },
  // CAL's legal name says nothing about CAL: "כרטיסי אשראי לישראל בע\"מ".
  { test: /כרטיסי\s*אשראי\s*לישראל|(?<![א-ת])כאל(?![א-ת])|\bcal\b/i, name: "כאל", kind: "card" },
  { test: /מקס\s*איט|max[\s-]*it/i, name: "מקס", kind: "card" },
  { test: /דיינרס|diners/i, name: "דיינרס", kind: "card" },
  { test: /אמריקן\s*אקספרס|american\s*express|\bamex\b/i, name: "אמריקן אקספרס", kind: "card" },

  /* --- non-bank credit providers ----------------------------------------- */
  { test: /מימון\s*ישיר/, name: "מימון ישיר", kind: "nonbank" },
  { test: /כלמוביל/, name: "כלמוביל", kind: "nonbank" },
  { test: /טריא|tarya/i, name: "טריא", kind: "nonbank" },
  { test: /בלנדר|blender/i, name: "בלנדר", kind: "nonbank" },
  { test: /פנינסולה|peninsula/i, name: "פנינסולה", kind: "nonbank" },
  { test: /אקורד/, name: "אס.אר אקורד", kind: "nonbank" },
  { test: /נאוי/, name: "אחים נאוי", kind: "nonbank" },
  { test: /אופל\s*בלאנס/, name: "אופל בלאנס", kind: "nonbank" },
  { test: /גמא\s*(ניהול|מימון|קפיטל)/, name: "גמא", kind: "nonbank" },
  { test: /מניף/, name: "מניף", kind: "nonbank" },
  { test: /מלרן/, name: "מלרן", kind: "nonbank" },
  { test: /ערך\s*פיננסים/, name: "ערך פיננסים", kind: "nonbank" },
  { test: /שוהם\s*ביזנס/, name: "שוהם ביזנס", kind: "nonbank" },
  { test: /דיירקט\s*פיננסים/, name: "דיירקט", kind: "nonbank" },
  // Institutional lenders — a loan against a pension or provident balance is
  // non-bank credit however sober the lender's name looks.
  { test: /הפניקס|phoenix/i, name: "הפניקס", kind: "nonbank" },
  { test: /הראל/, name: "הראל", kind: "nonbank" },
  { test: /מגדל\s*(ביטוח|חברה|מקפת|אחזקות)/, name: "מגדל", kind: "nonbank" },
  { test: /כלל\s*(ביטוח|פנסיה|החזקות|חברה)/, name: "כלל", kind: "nonbank" },
  { test: /מנורה|מבטחים/, name: "מנורה מבטחים", kind: "nonbank" },
  { test: /אלטשולר/, name: "אלטשולר שחם", kind: "nonbank" },
  { test: /מיטב\s*(דש|בית)?/, name: "מיטב", kind: "nonbank" },
  { test: /פסגות/, name: "פסגות", kind: "nonbank" },
  { test: /ילין\s*לפידות/, name: "ילין לפידות", kind: "nonbank" },
  { test: /אינפיניטי/, name: "אינפיניטי", kind: "nonbank" },
  { test: /אנליסט/, name: "אנליסט", kind: "nonbank" },
  // Vehicle finance and leasing.
  { test: /אלבר/, name: "אלבר", kind: "nonbank" },
  { test: /שלמה\s*(סיקסט|רכב|ליסינג|החזקות|תחבורה)|\bsixt\b/i, name: "שלמה", kind: "nonbank" },
  { test: /קרסו/, name: "קרסו", kind: "nonbank" },
  { test: /יוניון\s*מוטורס/, name: "יוניון מוטורס", kind: "nonbank" },
  { test: /לובינסקי/, name: "לובינסקי", kind: "nonbank" },
  { test: /דלק\s*מוטורס/, name: "דלק מוטורס", kind: "nonbank" },

  /* --- public bodies ------------------------------------------------------ */
  { test: /הוצאה\s*לפועל/, name: "הוצאה לפועל", kind: "public" },
  { test: /הממונה|חדלות\s*פירעון|כונס(ת)?\s*נכסים/, name: "הממונה על חדלות פירעון", kind: "public" },
  { test: /ביטוח\s*לאומי/, name: "ביטוח לאומי", kind: "public" },
  { test: /רשות\s*המסים|מס\s*הכנסה/, name: "רשות המסים", kind: "public" },
  { test: /בנק\s*ישראל/, name: "בנק ישראל", kind: "public" },
];

/* ------------------------------------------------------------------ tidying */

/**
 * Corporate suffix, in every spelling the reports use.
 *
 * The lookahead is not a `\b`. JavaScript's word boundary is defined over
 * `[A-Za-z0-9_]`, so a Hebrew letter is a non-word character on both sides of
 * it — `/בעמ\b/` never matches anything, and `/מ\b/` at the end of a string
 * never matches either. Every boundary around Hebrew here is spelled out.
 */
const LTD = /\s*בע\s*["״׳']?\s*מ(?![א-ת])|(?<![א-ת])בעמ(?![א-ת])/g;
/** A year in brackets — either way round, see repairName. */
const YEAR_BRACKET = /[)(]\s*\d{4}\s*[()]/g;

/**
 * Undo the bracket inversion pdf.js leaves in an RTL line.
 *
 * The page prints "מימון ישיר מקבוצת ישיר (2006) בע\"מ". Extraction walks the
 * glyphs in visual order, so the pair comes back mirrored — ")2006(" — and the
 * name looks corrupt everywhere it is shown verbatim.
 */
export function repairName(raw: string): string {
  return raw.replace(/\)\s*(\d{4})\s*\(/g, "($1)").replace(/\s+/g, " ").trim();
}

/**
 * Best effort on a lender the registry has never seen.
 *
 * Deliberately conservative: strip the corporate furniture (בע"מ, a bracketed
 * incorporation year, a leading "בנק"/"הבנק", a trailing "לישראל") and, if what
 * is left is still too long to sit in a column, keep its first two words. It is
 * a label, and the full legal name is one hover away either way.
 */
function tidy(full: string): string {
  const stripped = full
    .replace(LTD, " ")
    .replace(YEAR_BRACKET, " ")
    .replace(/^\s*(חברת|חב['׳]|קבוצת)\s+/, "")
    .replace(/^\s*ה?בנק\s+/, "")
    .replace(/\s+לישראל(?![א-ת])/, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return full.trim();
  if (stripped.length <= 18) return stripped;
  return stripped.split(" ").slice(0, 2).join(" ");
}

/**
 * The kind of body, when the registry does not know the name.
 *
 * Note the order: a credit-card company can carry "בנק" in its legal name
 * ("כרטיסי אשראי לישראל" does not, but "לאומי קארד" did), and a public body
 * never should. Anything with no marker at all comes back as a bank rather than
 * as non-bank credit — an unrecognised name is not evidence, and labelling a
 * lender "חוץ־בנקאי" on a guess is a claim the document never made. Banks show
 * no label, so a wrong guess this way is silent; the other way it would print.
 */
function guessKind(full: string): LenderKind {
  if (/הוצאה\s*לפועל|הממונה|כונס|ביטוח\s*לאומי|רשות\s*המסים/.test(full)) return "public";
  if (/כרטיסי\s*אשראי|כרטיס|קארד|\bcard\b/i.test(full)) return "card";
  return "bank";
}

/* --------------------------------------------------------------- public api */

const UNKNOWN: Lender = { name: "", full: "", kind: "bank", kindLabel: "", known: false };

const cache = new Map<string, Lender>();

/**
 * Who a row is with. Safe on undefined — a hand-added row has no source, and
 * gets an empty name the UI shows as a dash rather than as a lender.
 */
export function lenderOf(source?: string | null): Lender {
  const raw = (source ?? "").trim();
  if (!raw || raw === "—") return UNKNOWN;

  const hit = cache.get(raw);
  if (hit) return hit;

  const full = repairName(raw);
  const entry = REGISTRY.find((e) => e.test.test(full));
  const kind = entry?.kind ?? guessKind(full);
  const lender: Lender = {
    name: entry?.name ?? tidy(full),
    full,
    kind,
    kindLabel: LENDER_KIND_LABEL[kind],
    known: !!entry,
  };
  cache.set(raw, lender);
  return lender;
}

/** The short name on its own — for the places that only want a word. */
export function lenderName(source?: string | null): string {
  return lenderOf(source).name;
}

/**
 * The short name when the registry KNOWS the lender, and the document's own
 * words when it does not.
 *
 * For every surface that has room for a full name. `tidy` is a guess, and on a
 * name it has never seen it can guess badly — the summary table carries the odd
 * mis-parsed footnote as if it were a lender, and "הריכוז המופיע בפרק נועד לצורך
 * נוחיות" shortened to its first two words is less readable than the nonsense it
 * came from, not more. The ledger's own column takes the guess anyway, because
 * there the alternative is a fixed 78px of ellipsis.
 */
export function lenderLabel(source?: string | null): string {
  const l = lenderOf(source);
  return (l.known ? l.name : l.full) || "";
}

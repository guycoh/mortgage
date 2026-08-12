// The lender registry, checked against the strings the documents actually
// produce. Run: npx tsx scripts/test-lenders.mts
//
// Worth a test of its own because the table it guards is ORDERED: every general
// pattern is a substring of a specific one ("הבנק הבינלאומי" contains לאומי,
// "מרכנתיל דיסקונט" contains דיסקונט), so one entry moved up the list silently
// renames a lender everywhere on the board. Two of the cases below are also the
// Hebrew word-boundary trap — `\b` is defined over [A-Za-z0-9_], so `/כאל\b/`
// matches nothing at all and the bug is invisible until a report contains כאל.

import { lenderOf, lenderLabel, repairName } from "../app/aa102test/lib/lenders";
import type { LenderKind } from "../app/aa102test/lib/lenders";

interface Case {
  src: string;
  name: string;
  kind: LenderKind;
  /** Expected `full`, when repairName should have changed something. */
  full?: string;
}

// Every source string the two sample חיווי אשראי reports in ../../דוח emit,
// plus the five labels the bank-statement templates produce.
const CASES: Case[] = [
  // --- from the credit reports, verbatim (the brackets really are reversed)
  { src: 'הבנק הבינלאומי הראשון לישראל בע"מ', name: "הבינלאומי", kind: "bank" },
  { src: 'בנק מזרחי טפחות בע"מ', name: "מזרחי טפחות", kind: "bank" },
  { src: 'בנק מרכנתיל דיסקונט בע"מ', name: "מרכנתיל", kind: "bank" },
  { src: 'בנק לאומי לישראל בע"מ', name: "לאומי", kind: "bank" },
  { src: 'בנק יהב לעובדי המדינה בע"מ', name: "יהב", kind: "bank" },
  { src: 'בנק אגוד לישראל בע"מ', name: "אגוד", kind: "bank" },
  { src: 'וואן זירו הבנק הדיגיטלי בע"מ', name: "וואן זירו", kind: "bank" },
  {
    src: 'מימון ישיר מקבוצת ישיר )2006( בע"מ',
    name: "מימון ישיר",
    kind: "nonbank",
    full: 'מימון ישיר מקבוצת ישיר (2006) בע"מ',
  },
  // The summary table scrambles the same name differently — the registry has to
  // recognise it anyway, because repairName cannot put this one back.
  { src: 'מימון ישיר מקבוצת ישיר 2006( בע"מ)', name: "מימון ישיר", kind: "nonbank" },
  { src: 'כלמוביל פתרונות מימון לרכב בע"מ', name: "כלמוביל", kind: "nonbank" },
  { src: "טריא קהילה פיננסית", name: "טריא", kind: "nonbank" },
  { src: 'כרטיסי אשראי לישראל בע"מ', name: "כאל", kind: "card" },
  { src: 'מקס איט פיננסים בע"מ', name: "מקס", kind: "card" },
  { src: 'ישראכרט בע"מ', name: "ישראכרט", kind: "card" },

  // --- from the bank statements (BANK_LABEL), already short
  { src: "בנק לאומי", name: "לאומי", kind: "bank" },
  { src: "בנק הפועלים", name: "הפועלים", kind: "bank" },
  { src: "בנק דיסקונט", name: "דיסקונט", kind: "bank" },
  { src: "מרכנתיל דיסקונט", name: "מרכנתיל", kind: "bank" },
  { src: "בנק מזרחי טפחות", name: "מזרחי טפחות", kind: "bank" },

  // --- the ordering traps, stated outright
  { src: 'בנק ירושלים בע"מ', name: "ירושלים", kind: "bank" },
  { src: 'בנק דיסקונט לישראל בע"מ', name: "דיסקונט", kind: "bank" },
  { src: 'לאומי קארד בע"מ', name: "מקס", kind: "card" },
  { src: 'פועלים אקספרס בע"מ', name: "פועלים אקספרס", kind: "card" },
  // Hebrew has no \b: these two only pass with an explicit lookaround.
  { src: 'כאל בע"מ', name: "כאל", kind: "card" },
  { src: "בנק מסד בעמ", name: "מסד", kind: "bank" },

  // --- public bodies
  { src: "הוצאה לפועל", name: "הוצאה לפועל", kind: "public" },
  {
    src: "הממונה על הליכי חדלות פירעון ושיקום כלכלי",
    name: "הממונה על חדלות פירעון",
    kind: "public",
  },
];

let failed = 0;
const bad = (msg: string) => {
  failed += 1;
  console.error("  ✗ " + msg);
};

for (const c of CASES) {
  const l = lenderOf(c.src);
  if (l.name !== c.name) bad(`"${c.src}" → name "${l.name}", expected "${c.name}"`);
  if (l.kind !== c.kind) bad(`"${c.src}" → kind "${l.kind}", expected "${c.kind}"`);
  if (!l.known) bad(`"${c.src}" was not recognised by the registry`);
  if (c.full && l.full !== c.full) bad(`"${c.src}" → full "${l.full}", expected "${c.full}"`);
}

/* --- an unrecognised source is tidied, never claimed --------------------- */

const unknown = lenderOf('חברת פרטנר תקשורת בע"מ');
if (unknown.known) bad("an unknown lender reported itself as known");
if (unknown.kind !== "bank" || unknown.kindLabel !== "")
  bad(`an unknown lender printed a kind label ("${unknown.kindLabel}")`);
if (unknown.name !== "פרטנר תקשורת") bad(`unknown tidy → "${unknown.name}"`);

// Where there is room for it, an unrecognised source keeps the document's own
// words rather than a two-word guess — the summary table carries mis-parsed
// footnotes as if they were lenders.
const junk = "הריכוז המופיע בפרק נועד לצורך נוחיות";
if (lenderLabel(junk) !== junk) bad(`lenderLabel mangled an unknown source: "${lenderLabel(junk)}"`);
if (lenderLabel('בנק לאומי לישראל בע"מ') !== "לאומי") bad("lenderLabel did not shorten a known lender");

/* --- nothing in, nothing out -------------------------------------------- */

for (const empty of ["", "   ", "—", undefined, null]) {
  const l = lenderOf(empty as string | null | undefined);
  if (l.name !== "" || l.known) bad(`empty source produced "${l.name}"`);
}

if (repairName('מימון ישיר )2006( בע"מ') !== 'מימון ישיר (2006) בע"מ') bad("repairName failed");

console.log(
  failed
    ? `\n${failed} failure(s).`
    : `✓ ${CASES.length} lenders + edge cases — names, kinds and repairs all as expected.`
);
process.exit(failed ? 1 : 0);

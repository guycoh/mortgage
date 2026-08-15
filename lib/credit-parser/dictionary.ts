// Field-code dictionary for the Israeli Credit Data System "Data Concentration
// Report" (דוח ריכוז נתונים). Codes are stable across every report of this
// template, so they double as language-independent anchors for the parser and
// as labels for the UI.

export type FieldKind = "text" | "number" | "money" | "date" | "percent" | "id";

export interface FieldDef {
  code: string;
  he: string;
  en: string;
  kind: FieldKind;
}

export const FIELD_DEFS: FieldDef[] = [
  { code: "201-002", he: "סוג עסקה", en: "Transaction type", kind: "text" },
  { code: "201-003", he: "תאריך סיום הסכמת הלקוח לניטור העסקה", en: "Monitoring-consent end date", kind: "date" },
  { code: "201-006", he: "מעודכן לתאריך", en: "Last updated", kind: "date" },
  { code: "201-008", he: "טווח שיעור הערבות", en: "Guarantee rate range", kind: "text" },
  { code: "201-009", he: "מספר הלקוחות החייבים בעסקה", en: "Debtors in transaction", kind: "number" },
  { code: "201-010", he: "מספר הלקוחות הערבים בעסקה", en: "Guarantors in transaction", kind: "number" },
  { code: "201-011", he: "מספר הגורמים הקשורים לעסקה", en: "Related parties", kind: "number" },
  { code: "201-016", he: "תאריך תחילת עסקה", en: "Transaction start date", kind: "date" },
  { code: "201-017", he: "מטרת האשראי", en: "Credit purpose", kind: "text" },
  { code: "201-018", he: "תאריך סיום מתוכנן", en: "Planned end date", kind: "date" },
  { code: "201-020", he: "גובה מסגרת", en: "Credit limit", kind: "money" },
  { code: "201-021", he: "מטבע העסקה", en: "Currency", kind: "text" },
  { code: "201-022", he: "סטטוס העסקה", en: "Transaction status", kind: "text" },
  { code: "201-023", he: "תאריך סיום בפועל", en: "Actual end date", kind: "date" },
  { code: "201-024", he: "שם תאגיד", en: "Corporation name", kind: "text" },
  { code: "201-025", he: "מספר תאגיד", en: "Corporation number", kind: "id" },
  { code: "201-026", he: "מדינה", en: "Country", kind: "text" },
  { code: "201-029", he: "מזהה עסקה", en: "Transaction ID", kind: "id" },
  { code: "201-030", he: "מספר סניף", en: "Branch number", kind: "id" },
  { code: "201-032", he: "סוג ריבית", en: "Interest type", kind: "text" },
  { code: "201-033", he: "הצמדה", en: "Linkage", kind: "text" },
  { code: "201-034", he: "עוגן", en: "Anchor", kind: "text" },
  { code: "201-035", he: "מרווח", en: "Margin", kind: "percent" },
  { code: "201-036", he: "ריבית נומינלית", en: "Nominal rate", kind: "percent" },
  { code: "201-037", he: "ריבית מתואמת", en: "Effective rate (APR)", kind: "percent" },
  { code: "201-038", he: "סכום הניצול במסלול", en: "Track utilization", kind: "money" },
  { code: "201-044", he: "תדירות התשלומים", en: "Payment frequency", kind: "text" },
  { code: "201-045", he: "סכום הלוואה מקורי", en: "Original loan amount", kind: "money" },
  { code: "201-046", he: "סכום התשלום החודשי הצפוי", en: "Expected monthly payment", kind: "money" },
  { code: "201-047", he: "סוג התשלום החודשי הצפוי", en: "Monthly payment type", kind: "text" },
  { code: "201-048", he: "סכום ששולם בפועל", en: "Amount actually paid", kind: "money" },
  { code: "201-049", he: "יתרת חוב", en: "Debt balance", kind: "money" },
  { code: "201-050", he: "טווח ימי פיגור", en: "Days-in-arrears range", kind: "text" },
  { code: "201-051", he: "יתרה שלא שולמה במועד", en: "Amount unpaid on time", kind: "money" },
  { code: "201-052", he: "תאריך אי הפירעון הראשון", en: "First non-payment date", kind: "date" },
  { code: "201-053", he: "תאריך ביצוע תשלום אחרון", en: "Last payment date", kind: "date" },
  { code: "201-054", he: "תאריך צפוי לתשלום הלוואת בלון", en: "Expected balloon payment date", kind: "date" },
  { code: "201-055", he: "תאריך תחילת התשלום הדחוי", en: "Deferred payment start date", kind: "date" },
  { code: "201-064", he: "שווי בטוחה", en: "Collateral value", kind: "money" },
  { code: "201-065", he: "סוג בטוחה", en: "Collateral type", kind: "text" },
  { code: "201-067", he: "מספר שיקים שהוצגו", en: "Checks presented", kind: "number" },
  { code: "201-068", he: 'מספר שיקים שחזרו מסיבת אכ"מ', en: "Checks returned (NSF)", kind: "number" },
  { code: "201-069", he: "מספר הוראות לחיוב חשבון", en: "Direct debits presented", kind: "number" },
  { code: "201-070", he: "מספר הוראות לחיוב חשבון שלא כובדו", en: "Direct debits dishonored", kind: "number" },
  { code: "201-072", he: "ניצול המסגרת הגבוה ביותר בחודש הדיווח", en: "Peak utilization (reporting month)", kind: "money" },
  { code: "201-076", he: "מזהה תיק בטוחה", en: "Collateral file ID", kind: "id" },
  // Coded remark lines (הערות) — the label IS the remark's fixed legal wording.
  { code: "201-056", he: "הערת עסקה", en: "Transaction remark", kind: "text" },
  { code: "201-057", he: "הערת עסקה", en: "Transaction remark", kind: "text" },
  { code: "201-058", he: "עסקה בפיגור בה לא התקבל כל תשלום", en: "In arrears — no payment received", kind: "text" },
  { code: "201-059", he: "עסקה המסומנת בשל אירוע על פי הנחיית הממונה", en: "Flagged per regulator instruction", kind: "text" },
  { code: "201-060", he: 'הלוואת משכנתה מסובסדת ע"י משרד השיכון', en: "Subsidized mortgage (Housing Ministry)", kind: "text" },
  { code: "201-061", he: "העסקה בטיפול ההוצאה לפועל", en: "Under enforced collection", kind: "text" },
  { code: "201-062", he: "הערת עסקה", en: "Transaction remark", kind: "text" },
  { code: "201-063", he: "הערת עסקה", en: "Transaction remark", kind: "text" },
  { code: "197-001", he: "מעודכן לתאריך", en: "Last updated", kind: "date" },
  { code: "197-003", he: "מספר תיק", en: "Case file ID", kind: "id" },
  { code: "197-004", he: "סוג תיק", en: "Case type", kind: "text" },
  { code: "197-006", he: "תאריך פתיחת התיק", en: "Case opening date", kind: "date" },
  { code: "197-007", he: "סכום חוב במועד פתיחת תיק", en: "Debt at opening", kind: "money" },
  { code: "197-008", he: "תאריך ביצוע פעולה כספית אחרונה", en: "Last monetary action date", kind: "date" },
  { code: "197-009", he: "יתרת חוב למועד פעולה כספית אחרונה", en: "Debt at last action", kind: "money" },
  { code: "197-010", he: "תאריך מתן צו התשלומים", en: "Payment order date", kind: "date" },
  { code: "197-013", he: "תאריך סגירת התיק", en: "Case closing date", kind: "date" },
  { code: "197-014", he: "סיבת סגירת התיק", en: "Case closing reason", kind: "text" },
  // Insolvency proceedings (הממונה על הליכי חדלות פירעון ושיקום כלכלי).
  { code: "151-001", he: "מזהה - מספר תיק", en: "Case file ID", kind: "id" },
  { code: "151-002", he: "מעודכן לתאריך", en: "Last updated", kind: "date" },
  { code: "151-003", he: "סוג ההליך", en: "Proceeding type", kind: "text" },
  { code: "151-004", he: "שם מחוז", en: "District", kind: "text" },
  { code: "151-005", he: "תאריך פתיחה", en: "Opening date", kind: "date" },
  { code: "151-006", he: "זהות מגיש הבקשה", en: "Petitioner", kind: "text" },
  { code: "151-007", he: "סכום החוב המוצהר על ידי מגיש הבקשה", en: "Debt declared by petitioner", kind: "money" },
  { code: "151-008", he: "תאריך הכרעת סכום החוב", en: "Debt-ruling date", kind: "date" },
  { code: "151-009", he: "סכום חוב על פי הכרעת נאמן", en: "Debt per trustee ruling", kind: "money" },
  { code: "151-010", he: "תאריך מתן צו כינוס", en: "Receivership order date", kind: "date" },
  { code: "151-011", he: "תאריך מתן צו פשיטת רגל", en: "Bankruptcy order date", kind: "date" },
  { code: "151-012", he: "תאריך הגשת בקשת להסדר נושים", en: "Creditors-arrangement request date", kind: "date" },
  { code: "151-013", he: "תאריך אישור הסדר נושים", en: "Creditors-arrangement approval date", kind: "date" },
  { code: "151-014", he: "תאריך סיום הסדר נושים", en: "Creditors-arrangement end date", kind: "date" },
  { code: "151-015", he: "סטטוס ההליך", en: "Proceeding status", kind: "text" },
  { code: "151-016", he: "תאריך סטטוס", en: "Status date", kind: "date" },
];

/** Codes whose printed label is itself the remark text (הערות lines). */
export const REMARK_CODES = new Set([
  "201-056", "201-057", "201-058", "201-059", "201-060", "201-061", "201-062", "201-063",
]);

export const FIELD_BY_CODE: Record<string, FieldDef> = Object.fromEntries(
  FIELD_DEFS.map((f) => [f.code, f])
);

// Canonical enum phrases (fixed legal wording). Order matters: longer / more
// specific phrases must be tested first.
export const ENUMS = {
  transactionType: [
    "חשבון עובר ושב",
    "מסגרת אשראי מתחדשת",
    "הלוואה לדיור (משכנתה)",
    "משכנתה",
    "הלוואה",
    "ערבות",
    "ניכיון",
  ],
  status: [
    "העסקה נסגרה לאחר ששולמה במלואה או לא נוצלה",
    "העסקה משולמת כסדרה או לא מנוצלת",
    "קיים פיגור בתשלום (30 יום ומעלה), קיים הליך משפטי",
    "קיים פיגור בתשלום (30 יום ומעלה), אין הליך משפטי",
    "העסקה בפיגור",
    "העסקה נסגרה",
  ],
  arrearsRange: [
    "180 ימים או יותר",
    "150-179 ימים",
    "120-149 ימים",
    "90-119 ימים",
    "60-89 ימים",
    "30-59 ימים",
  ],
  // The vocabulary these reports actually print, verified across three files
  // (120 + 24 + 24 transactions). The previous list — "הלוואה לכל מטרה",
  // "רכישת רכב", "דיור" — is not wording this template uses, so 201-017 came
  // back empty on 117 of 120 transactions.
  //
  // Longest first, because enumByCell returns the first phrase it finds inside
  // the cell: "עסק" is a prefix of nothing here, but it IS a substring of
  // "העסקה", so it must never be tested before a phrase that could contain it.
  purpose: [
    "הלוואה לתאגיד או בשיתוף עם תאגיד",
    'נדל"ן ושיפוצים',
    "נדלן ושיפוצים",
    "צריכה פרטית",
    "כרטיס אשראי",
    "לא ידוע",
    "רכב",
    "עסק",
    "אחר",
  ],
  currency: ['ש"ח', "אירו", "דולר", 'דולר ארה"ב'],
  frequency: ["תשלום בלון", "חודשי", "רבעוני", "שנתי", "דו חודשי"],
  // "קרן, ריבית והצמדה" must precede "קרן וריבית" and "קרן": the cell match
  // returns the first phrase it finds inside the value, and both shorter ones
  // are substrings of it. Read in the old order, 21 linked mortgages in one
  // report came back as "קרן" — principal-only, which is a different product.
  paymentType: [
    "קרן, ריבית והצמדה",
    "קרן וריבית",
    "תשלום בלון",
    "קרן",
    "ריבית",
    "בולט",
  ],
  interestType: ["ללא ריבית", "ריבית משתנה", "ריבית קבועה"],
  collateralType: ["רכב", "נדלִן", "נדלן", "פיקדון", "ניירות ערך", "ערבות"],
} as const;

// English helper labels for enum values, for the bilingual UI.
export const ENUM_EN: Record<string, string> = {
  "חשבון עובר ושב": "Current account",
  "מסגרת אשראי מתחדשת": "Revolving credit facility",
  "הלוואה": "Loan",
  "משכנתה": "Mortgage",
  "ערבות": "Guarantee",
  "העסקה משולמת כסדרה או לא מנוצלת": "Paid on schedule / unused",
  "העסקה נסגרה לאחר ששולמה במלואה או לא נוצלה": "Closed — fully paid / unused",
  "העסקה בפיגור": "In arrears",
  "הלוואה לתאגיד או בשיתוף עם תאגיד": "Loan to / with a corporation",
  "כרטיס אשראי": "Credit card",
  'ש"ח': "ILS",
  "חודשי": "Monthly",
  "תשלום בלון": "Balloon payment",
  "קרן וריבית": "Principal + interest",
  "קרן": "Principal",
  "ריבית משתנה": "Variable rate",
  "ריבית קבועה": "Fixed rate",
  "ללא ריבית": "No interest",
  "רכב": "Vehicle",
};

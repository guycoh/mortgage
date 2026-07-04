// app/home/credit-report/lib/parseCreditReport.ts

export type ParsedCreditReport = {
  fullName: string;
  idNumber: string;
  score: number;

  totalLoans: number;
  activeLoans: number;
  monthlyPayment: number;

  negativeEvents: number;
  creditUtilization: number;

  banks: {
    name: string;
    balance: number;
    status: "good" | "warning" | "bad";
  }[];
};

export function parseCreditReport(text?: string): ParsedCreditReport {
  const cleanText = normalizeText(text);

  // ✅ בדיקת איכות טקסט (חשוב מאוד ל-PDFים בישראל)
  if (!cleanText || cleanText.length < 50) {
    return emptyReport();
  }

  return {
    fullName: extractName(cleanText),
    idNumber: extractId(cleanText),
    score: extractScore(cleanText),

    totalLoans: extractTotalLoans(cleanText),
    activeLoans: extractActiveLoans(cleanText),
    monthlyPayment: extractMonthlyPayment(cleanText),

    negativeEvents: extractNegativeEvents(cleanText),
    creditUtilization: extractCreditUtilization(cleanText),

    banks: extractBanks(cleanText),
  };
}

/* =========================
   NORMALIZE
========================= */

function normalizeText(text?: string) {
  if (typeof text !== "string") return "";

  return fixBrokenSpacing(text)
    .replace(/\u00A0/g, " ") // non-breaking spaces
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n")
    .trim();
}

/**
 * מתקן PDFים בעברית עם רווחים שבורים:
 * "ב נ ק ה פ ו ע ל י ם" → "בנק הפועלים"
 */
function fixBrokenSpacing(text: string) {
  return text.replace(
    /([\u0590-\u05FF])\s+(?=[\u0590-\u05FF])/g,
    "$1"
  );
}

/* =========================
   EMPTY REPORT
========================= */

function emptyReport(): ParsedCreditReport {
  return {
    fullName: "לא זוהה",
    idNumber: "לא זוהה",
    score: 0,

    totalLoans: 0,
    activeLoans: 0,
    monthlyPayment: 0,

    negativeEvents: 0,
    creditUtilization: 0,

    banks: [],
  };
}

/* =========================
   BASIC FIELDS
========================= */

function extractName(text: string): string {
  const patterns = [
    /שם\s*לקוח\s*[:\-]?\s*([^|\n]{2,50})/,
    /לקוח\s*[:\-]?\s*([^|\n]{2,50})/,
    /שם\s*[:\-]?\s*([^|\n]{2,50})/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }

  return "לא זוהה";
}

function extractId(text: string): string {
  const match = text.match(/(?:ת"ז|תעודת\s*זהות)\s*[:\-]?\s*(\d{8,9})/);
  return match?.[1] || "לא זוהה";
}

function extractScore(text: string): number {
  const match =
    text.match(/ציון\s*אשראי\s*[:\-]?\s*(\d{3,4})/) ||
    text.match(/score\s*[:\-]?\s*(\d{3,4})/i);

  return Number(match?.[1] || 0);
}

/* =========================
   LOANS
========================= */

function extractTotalLoans(text: string): number {
  const match =
    text.match(/סה"?כ\s*הלוואות\s*[:\-]?\s*(\d+)/) ||
    text.match(/הלוואות\s*[:\-]?\s*(\d+)/);

  return Number(match?.[1] || 0);
}

function extractActiveLoans(text: string): number {
  const match =
    text.match(/פעיל(?:ות)?\s*הלוואות\s*[:\-]?\s*(\d+)/) ||
    text.match(/הלוואות\s*פעילות\s*[:\-]?\s*(\d+)/);

  return Number(match?.[1] || 0);
}

function extractMonthlyPayment(text: string): number {
  const match =
    text.match(/החזר\s*חודשי\s*[:\-]?\s*₪?\s*([\d,]+)/) ||
    text.match(/תשלום\s*חודשי\s*[:\-]?\s*₪?\s*([\d,]+)/);

  return Number(match?.[1]?.replace(/,/g, "") || 0);
}

/* =========================
   NEGATIVE EVENTS
========================= */

function extractNegativeEvents(text: string): number {
  const match =
    text.match(/אירועים\s*שליליים\s*[:\-]?\s*(\d+)/) ||
    text.match(/פיגורים\s*[:\-]?\s*(\d+)/);

  return Number(match?.[1] || 0);
}

/* =========================
   CREDIT UTILIZATION
========================= */

function extractCreditUtilization(text: string): number {
  const match = text.match(/ניצול\s*אשראי\s*[:\-]?\s*(\d{1,3})%/);
  return Number(match?.[1] || 0);
}

/* =========================
   BANKS
========================= */

function extractBanks(text: string) {
  const banks: ParsedCreditReport["banks"] = [];

  const bankNames = [
    "בנק הפועלים",
    "בנק לאומי",
    "מזרחי טפחות",
    "דיסקונט",
    "הבינלאומי",
  ];

  for (const name of bankNames) {
    const normalizedName = fixBrokenSpacing(name);

    const found =
      text.includes(normalizedName) ||
      text.replace(/\s+/g, "").includes(name.replace(/\s+/g, ""));

    if (found) {
      const balance = extractBalanceForBank(text, name);

      banks.push({
        name,
        balance,
        status: getBankStatus(balance),
      });
    }
  }

  return banks;
}

function extractBalanceForBank(text: string, bankName: string): number {
  const pattern = new RegExp(
    `${bankName}[^₪\\d]{0,80}₪?\\s*([\\d,]+)`
  );

  const match = text.match(pattern);

  return Number(match?.[1]?.replace(/,/g, "") || 0);
}

function getBankStatus(balance: number): "good" | "warning" | "bad" {
  if (balance < 50000) return "good";
  if (balance < 150000) return "warning";
  return "bad";
}




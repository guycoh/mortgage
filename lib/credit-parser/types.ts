// Structured model produced by the parser. Kept close to the source document so
// the UI can render every field, and so the same shape works for any client's
// report of this template.

export interface RawItem {
  str: string;
  x: number; // left edge (PDF user space)
  y: number; // baseline (PDF user space, increases upward)
  w: number;
}

export interface RawPage {
  page: number;
  items: RawItem[];
}

export interface ClientIdentity {
  name: string;
  idNumber: string;
  passportCountry: string;
  clientType: string; // הגדרת הלקוח (e.g. יחיד)
  systemStatus: string; // סטטוס במערכת (e.g. מעוכב)
  dataCollectionStart: string;
}

export interface ReportMeta {
  reportDate: string;
  reportType: string;
  generatedFor: string;
}

export interface SummaryRow {
  source: string;
  idOrCount: string; // מזהה עסקה OR מספר עסקאות
  limit: string; // גובה מסגרת / סכום הלוואות מקורי
  debtBalance: string;
  overdue: string;
  isTotal: boolean;
}

export interface SummaryBlock {
  transactionType: string; // e.g. חשבון עובר ושב
  col2Label: string; // "מזהה עסקה" | "מספר עסקאות"
  col3Label: string; // "גובה מסגרת" | "סכום הלוואות מקורי"
  rows: SummaryRow[];
}

export interface SummaryGroup {
  role: "debtor" | "guarantor";
  title: string;
  blocks: SummaryBlock[];
}

export interface NonPaymentIndicator {
  source: string;
  id: string;
  reportDate: string;
  prevents: boolean; // מונע או מבטל
  stopsCollection: boolean; // הפסקת איסוף נתונים
  allowsBureauTransfer: boolean; // מאפשר העברת מידע ללשכה בחיווי אשראי
  description: string; // הנתון המעיד על אי עמידה בפירעון
}

export interface InterestTrack {
  index: string;
  type: string; // ריבית משתנה / קבועה / ללא ריבית
  linkage: string; // לא צמוד / צמוד
  anchor: string; // ריבית פריים / ""
  margin: string; // מרווח %
  nominal: string; // ריבית נומינלית %
  effective: string; // ריבית מתואמת %
  utilization: string; // סכום הניצול במסלול
}

export interface Collateral {
  fileId: string;
  type: string;
  value: string;
}

export interface RelatedCorp {
  number: string;
  name: string;
  country: string;
}

export interface MonthlyGrid {
  label: string;
  rows: { year: string; months: (string | null)[] }[]; // months[0]=Jan .. [11]=Dec
}

export interface Transaction {
  uid: string;
  section: "current" | "active" | "inactive";
  role: "debtor" | "guarantor";
  source: string;
  contact: { phone: string; email: string; address: string };
  fields: Record<string, string>; // code -> raw value
  interestTracks: InterestTrack[];
  collateral: Collateral[];
  relatedCorps: RelatedCorp[];
  grids: MonthlyGrid[]; // checks / direct-debits / arrears history
  /** Coded remark lines (הערות), e.g. "העסקה בטיפול ההוצאה לפועל". */
  remarks: string[];
}

export interface InquiryByDate {
  date: string;
  purpose: string;
  requester: string;
  bureau: string;
}

export interface NewCreditInquiry {
  user: string;
  transactionType: string;
  date: string;
  purpose: string;
  amount: string;
  relation: string;
  plannedStart: string;
}

export interface InquirySummaryRow {
  requester: string;
  counts: string[];
}

export interface ExecutionCase {
  fields: Record<string, string>; // 197-xxx -> value
}

export interface InsolvencyCase {
  fields: Record<string, string>; // 151-xxx -> value
}

export interface AdminAction {
  ref: string;
  date: string;
  type: string;
  status: string;
}

export interface CreditReport {
  meta: ReportMeta;
  client: ClientIdentity;
  summary: SummaryGroup[];
  nonPaymentIndicators: NonPaymentIndicator[];
  transactions: Transaction[];
  execution: ExecutionCase[];
  /** הליכי חדלות פירעון ושיקום כלכלי (151-xxx). */
  insolvency: InsolvencyCase[];
  inquiriesByDate: InquiryByDate[];
  newCreditInquiries: NewCreditInquiry[];
  inquirySummary: InquirySummaryRow[];
  adminActions: AdminAction[];
  warnings: string[];
}

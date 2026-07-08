// Money math + formatting shared across the /aa4 calculator.

/** Strip grouping/symbols to a number. */
export const parseNum = (v: string | number): number => {
  if (typeof v === "number") return v;
  return Number(String(v).replace(/[^\d.-]/g, "")) || 0;
};

/** Group an input string with thousands separators (keeps digits only). */
export const groupDigits = (v: string): string =>
  v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Format a number for display, blank when zero/empty. */
export const grouped = (v: string | number): string => {
  const n = parseNum(v);
  return n ? n.toLocaleString("en-US") : "";
};

/** "12,340 ₪" — rounded, RTL-safe currency. */
export const shekel = (n: number): string =>
  `${Math.round(n || 0).toLocaleString("en-US")} ₪`;

/** Standard amortized monthly payment. */
export const monthlyPayment = (
  balance: string | number,
  interest: string | number,
  months: string | number
): number => {
  const amount = parseNum(balance);
  const r = (typeof interest === "number" ? interest : parseFloat(interest || "0")) / 100 / 12;
  const m = typeof months === "number" ? months : Number(months);
  if (!amount || !m) return 0;
  if (!r) return amount / m; // interest-free → linear
  return amount * (r / (1 - Math.pow(1 + r, -m)));
};

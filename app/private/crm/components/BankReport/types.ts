export type LoanPart = {
  id: number; // שים לב: מספר, לא מחרוזת
  name: string;
  loanType?: string; // קבועה/משתנה/פריים וכו'
  interestRate: number;
  adjustedInterestRate?: number;
  averageInterestAtPayoff?: number;
  principalBalance?: number;
  monthlyCharge?: number;
  indexBase?: string;
};
"use client"

import { useState } from "react";
import LoanComponent from "../components/loan_cal";


const MortgageForm = () => {
  // פרטי הלווים
  const [incomePrimary, setIncomePrimary] = useState("");
  const [incomePartner, setIncomePartner] = useState("");
  const [loans, setLoans] = useState("");

  // פרטי נכס והלוואה (טור 2)
  const [purchaseType, setPurchaseType] = useState("דירה יחידה");
  const [assetValue, setAssetValue] = useState("");
  const [equity, setEquity] = useState("");

  // משתנים לחישוב הלוואה (טור 3)
  const [loanInterestRate, setLoanInterestRate] = useState("5"); // ברירת מחדל 5%
  const [loanPeriod, setLoanPeriod] = useState("360"); // ברירת מחדל 360 חודשים

  // מיפוי אחוזי מימון מקסימלי לפי סוג רכישה
  const purchaseTypeFundsMapping: { [key: string]: string } = {
    "דירה יחידה": "75%",
    "דירה חליפית": "70%",
    "דירה נוספת": "50%",
    "לכל מטרה": "50%",
  };

  // פונקציה לעיצוב כספי עם מפריד אלפים
  const formatCurrency = (value: string | number) => {
    const num =
      typeof value === "number" ? value : value.replace(/\D/g, "");
    return num && Number(num) !== 0
      ? Number(num).toLocaleString("he-IL") + " ש״ח"
      : "";
  };

  // המרת ערכים למספרים (תומך גם בנקודה עשרונית)
  const assetValueNum = parseFloat(assetValue.replace(/[^\d.]/g, "")) || 0;
  const equityNum = parseFloat(equity.replace(/[^\d.]/g, "")) || 0;

  // חישוב משכנתא מבוקשת = שווי נכס - הון עצמי
  const computedRequestedMortgage = assetValueNum - equityNum;

  // חישוב אחוזי הון עצמי ומשכנתא ביחס לשווי נכס (עם 2 ספרות אחרי הנקודה)
  const equityPercentageNumber =
    assetValueNum > 0 ? (equityNum / assetValueNum) * 100 : 0;
  const equityPercentage = equityPercentageNumber.toFixed(2);

  const requestedMortgagePercentageNumber =
    assetValueNum > 0 ? (computedRequestedMortgage / assetValueNum) * 100 : 0;
  const requestedMortgagePercentage =
    requestedMortgagePercentageNumber.toFixed(2);

  // אחוז המימון המקסימלי לפי סוג רכישה (מומר למספר)
  const maxFinancingPercentage =
    parseInt(purchaseTypeFundsMapping[purchaseType].replace("%", "")) || 0;

  // קביעת צבע אחוז הון עצמי:
  // אם אחוז ההון העצמי גבוה מ-(100 - אחוז מימון מקסימלי) – ירוק, אחרת אדום
  const equityColorClass =
    equityPercentageNumber >= 100 - maxFinancingPercentage
      ? "text-green-500"
      : "text-red-500";

  // קביעת צבע אחוז המשכנתא המבוקשת:
  // אם אחוז המשכנתא המבוקשת גבוה מ-אחוז המימון המקסימלי – אדום, אחרת ירוק
  const requestedMortgageColorClass =
    requestedMortgagePercentageNumber > maxFinancingPercentage
      ? "text-red-500"
      : "text-green-500";

  // חישוב נתונים נוספים (לדוגמא: הכנסות, הכנסה פנויה)
  const totalIncome =
    (parseInt(incomePrimary.replace(/\D/g, "")) || 0) +
    (parseInt(incomePartner.replace(/\D/g, "")) || 0);
  const netIncome =
    totalIncome - (parseInt(loans.replace(/\D/g, "")) || 0);
  const maxRepayment = Math.round(netIncome * 0.4);
  const recommendedRepayment = Math.round(netIncome * 0.36);

  // חישוב תשלום חודשי להלוואה בטור 3
  // המרת ריבית שנתית לריבית חודשית (חלוקה ב-12 וב-100)
  const annualRate = parseFloat(loanInterestRate) || 5;
  const monthlyRate = annualRate / 100 / 12;
  const period = parseInt(loanPeriod) || 360;
  let monthlyPayment = 0;
  if (monthlyRate === 0) {
    monthlyPayment = computedRequestedMortgage / period;
  } else {
    monthlyPayment =
      computedRequestedMortgage *
      (monthlyRate * Math.pow(1 + monthlyRate, period)) /
      (Math.pow(1 + monthlyRate, period) - 1);
  }

  return (
    <div className="container mx-auto p-4">
      <form>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* טור 1 - פרטי הלווים וחישובי הכנסות */}
          <div className="p-4 border border-gray-300 rounded">
            <h2 className="text-lg font-bold mb-3 text-center">
              פרטים כלליים של הלווים
            </h2>
            <div className="flex flex-col gap-2">
              {/* לווה ראשי */}
              <div className="flex gap-2">
                <label className="flex-1 flex flex-col text-sm">
                  שם לווה ראשי
                  <input
                    type="text"
                    className="border p-1 rounded mt-1"
                  />
                </label>
                <label className="w-24 flex flex-col text-sm">
                  מין
                  <select className="border p-1 rounded mt-1">
                    <option>זכר</option>
                    <option>נקבה</option>
                  </select>
                </label>
              </div>

              {/* הכנסה ראשית */}
              <label className="flex flex-col text-sm">
                הכנסה ראשית
                <input
                  type="text"
                  className="border p-1 rounded text-right mt-1"
                  value={formatCurrency(incomePrimary)}
                  onChange={(e) => setIncomePrimary(e.target.value)}
                />
              </label>

              {/* בן זוג */}
              <div className="flex gap-2">
                <label className="flex-1 flex flex-col text-sm">
                  שם בן זוג
                  <input
                    type="text"
                    className="border p-1 rounded mt-1"
                  />
                </label>
                <label className="w-24 flex flex-col text-sm">
                  מין
                  <select className="border p-1 rounded mt-1">
                    <option>זכר</option>
                    <option>נקבה</option>
                  </select>
                </label>
              </div>

              {/* הכנסה בן זוג */}
              <label className="flex flex-col text-sm">
                הכנסה בן זוג
                <input
                  type="text"
                  className="border p-1 rounded text-right mt-1"
                  value={formatCurrency(incomePartner)}
                  onChange={(e) => setIncomePartner(e.target.value)}
                />
              </label>

              {/* סה"כ הכנסות למשק בית */}
              <label className="flex flex-col text-sm">
                סה"כ הכנסות למשק בית
                <input
                  type="text"
                  className="border p-1 rounded text-right bg-gray-100 mt-1"
                  value={
                    totalIncome
                      ? totalIncome.toLocaleString("he-IL") + " ש״ח"
                      : ""
                  }
                  disabled
                />
              </label>

              {/* הלוואות (מעל 18 חודשי פרעון) */}
              <label className="flex flex-col text-sm">
                הלוואות{" "}
                <span className="text-xs text-gray-500">
                  (מעל 18 חודשי פרעון)
                </span>
                <input
                  type="text"
                  className="border p-1 rounded text-right mt-1"
                  value={formatCurrency(loans)}
                  onChange={(e) => setLoans(e.target.value)}
                />
              </label>

              {/* הכנסה פנויה */}
              <label className="flex flex-col text-sm">
                הכנסה פנויה
                <input
                  type="text"
                  className="border p-1 rounded text-right bg-gray-100 mt-1"
                  value={
                    netIncome
                      ? netIncome.toLocaleString("he-IL") + " ש״ח"
                      : ""
                  }
                  disabled
                />
              </label>

              {/* יחס החזר מקסימלי */}
              <label className="flex flex-col text-sm">
                יחס החזר מקסימלי
                <input
                  type="text"
                  className="border p-1 rounded text-right bg-gray-100 text-red-500 mt-1"
                  value={
                    maxRepayment
                      ? maxRepayment.toLocaleString("he-IL") + " ש״ח"
                      : ""
                  }
                  disabled
                />
              </label>

              {/* יחס החזר מומלץ */}
              <label className="flex flex-col text-sm">
                יחס החזר מומלץ
                <input
                  type="text"
                  className="border p-1 rounded text-right bg-gray-100 text-green-500 mt-1"
                  value={
                    recommendedRepayment
                      ? recommendedRepayment.toLocaleString("he-IL") + " ש״ח"
                      : ""
                  }
                  disabled
                />
              </label>
            </div>
          </div>

          {/* טור 2 - פרטי נכס, סוג רכישה והלוואה */}
          <div className="p-4 border border-gray-300 rounded">
            <h2 className="text-lg font-bold mb-3 text-center">
              פרטי נכס והלוואה
            </h2>
            <div className="flex flex-col gap-2">
              {/* סוג רכישה */}
              <label className="flex flex-col text-sm">
                סוג רכישה
                <div className="flex items-center mt-1">
                  <select
                    value={purchaseType}
                    onChange={(e) => setPurchaseType(e.target.value)}
                    className="border p-1 rounded"
                  >
                    <option value="דירה יחידה">דירה יחידה</option>
                    <option value="דירה חליפית">דירה חליפית</option>
                    <option value="דירה נוספת">דירה נוספת</option>
                    <option value="לכל מטרה">לכל מטרה</option>
                  </select>
                  <span className="ml-2 text-sm font-semibold text-red-500">
                    {purchaseTypeFundsMapping[purchaseType]}
                  </span>
                </div>
              </label>

              {/* שווי נכס */}
              <label className="flex flex-col text-sm">
                שווי נכס
                <input
                  type="text"
                  className="border p-1 rounded text-right mt-1"
                  value={formatCurrency(assetValue)}
                  onChange={(e) => setAssetValue(e.target.value)}
                />
              </label>

              {/* הון עצמי עם אחוז */}
              <label className="flex flex-col text-sm">
                הון עצמי
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    className="border p-1 rounded text-right flex-1"
                    value={formatCurrency(equity)}
                    onChange={(e) => setEquity(e.target.value)}
                  />
                  <span className={`ml-2 text-sm font-semibold ${equityColorClass}`}>
                    {assetValueNum > 0 ? equityPercentage + "%" : ""}
                  </span>
                </div>
              </label>

              {/* משכנתא מבוקשת עם אחוז */}
              <label className="flex flex-col text-sm">
                משכנתא מבוקשת
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    className="border p-1 rounded text-right bg-gray-100 flex-1"
                    value={formatCurrency(computedRequestedMortgage)}
                    disabled
                  />
                  <span
                    className={`ml-2 text-sm font-semibold ${requestedMortgageColorClass}`}
                  >
                    {assetValueNum > 0 ? requestedMortgagePercentage + "%" : ""}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* טור 3 - מחשבון הלוואה */}
          <div className="p-4 border border-gray-300 rounded">
            <h2 className="text-lg font-bold mb-3 text-center">
              מחשבון הלוואה
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              {/* סכום ההלוואה – זהו הערך המחושב ממשכנתא מבוקשת */}
              <label className="flex flex-col">
                סכום ההלוואה
                <input
                  type="text"
                  className="border p-1 rounded text-right bg-gray-100 mt-1"
                  value={formatCurrency(computedRequestedMortgage)}
                  disabled
                />
              </label>

              {/* ריבית שנתית */}
              <label className="flex flex-col">
                ריבית שנתית (%)
                <input
                  type="number"
                  className="border p-1 rounded text-right mt-1"
                  value={loanInterestRate}
                  onChange={(e) => setLoanInterestRate(e.target.value)}
                />
              </label>

              {/* תקופה (חודשים) */}
              <label className="flex flex-col">
                תקופה (חודשים)
                <input
                  type="number"
                  className="border p-1 rounded text-right mt-1"
                  value={loanPeriod}
                  onChange={(e) => setLoanPeriod(e.target.value)}
                />
              </label>

              {/* תשלום חודשי */}
              <label className="flex flex-col">
                תשלום חודשי
                <input
                  type="text"
                  className="border p-1 rounded text-right bg-gray-100 mt-1"
                  value={formatCurrency(monthlyPayment.toFixed(2))}
                  disabled
                />
              </label>
            </div>
          <LoanComponent computedRequestedMortgage={computedRequestedMortgage}/>
          
          
          </div>
        </div>
      </form>
    </div>
  );
};

export default MortgageForm;

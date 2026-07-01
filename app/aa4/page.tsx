"use client"

import { useState } from "react";
import ExistingLoans, { Loan } from "./ExistingLoans";
import InitialMixConsolidation, { InitialMixLoan } from "./InitialMixConsolidation";

export default function FinancialForm() {
  // קוביה 1: נכסים ומשכנתאות
  const [assets, setAssets] = useState({ asset1: 0, asset2: 0, asset3: 0 });
  const [mortgages, setMortgages] = useState({ mort1: 0, mort2: 0, mort3: 0 });

  // קוביה 2: הכנסות
  const [incomes, setIncomes] = useState({ primary: 0, secondary: 0, guarantor: 0 });

  // חישובים אוטומטיים - קוביה 1
  const totalAssets = assets.asset1 + assets.asset2 + assets.asset3;
  const totalMortgages = mortgages.mort1 + mortgages.mort2 + mortgages.mort3;

  // חישובים אוטומטיים - קוביה 2 (ערב נחשב 50%)
  const totalIncome = incomes.primary + incomes.secondary + (incomes.guarantor * 0.5);

  // --- ניהול הלוואות קיימות ---
  const [loans, setLoans] = useState<Loan[]>([
    { balance: "", interest: "", months: "" }
  ]);

  const updateLoan = (i: number, key: keyof Loan, value: string) => {
    const copy = [...loans];
    copy[i] = { ...copy[i], [key]: value };
    setLoans(copy);
  };

  const deleteLoan = (i: number) => {
    if (loans.length === 1) return;
    setLoans(loans.filter((_, index) => index !== i));
  };

  const addLoan = () => {
    setLoans([...loans, { balance: "", interest: "", months: "" }]);
  };


  // --- ניהול תמהיל ראשוני חדש ---
  const [mixLoans, setMixLoans] = useState<InitialMixLoan[]>([
    { balance: "", interest: "", months: "", type: "" }
  ]);

  const updateMixLoan = (i: number, key: keyof InitialMixLoan, value: string) => {
    const copy = [...mixLoans];
    copy[i] = { ...copy[i], [key]: value };
    setMixLoans(copy);
  };

  const deleteMixLoan = (i: number) => {
    if (mixLoans.length === 1) return;
    setMixLoans(mixLoans.filter((_, index) => index !== i));
  };

  const addMixLoan = () => {
    setMixLoans([...mixLoans, { balance: "", interest: "", months: "", type: "" }]);
  };


  // --- פונקציות עזר כלליות ---
  const format = (v: string) =>
    v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const parse = (v: string) => Number(v.replace(/,/g, "") || 0);

  const calcPayment = (balance: string, interest: string, months: string) => {
    const amount = parse(balance);
    const r = parseFloat(interest) / 100 / 12;
    const m = Number(months);
    if (!amount || !m || !r) return 0;
    return amount * (r / (1 - Math.pow(1 + r, -m)));
  };

  const handleAssetChange = (field: string, value: string) => {
    setAssets(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleMortgageChange = (field: string, value: string) => {
    setMortgages(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleIncomeChange = (field: string, value: string) => {
    setIncomes(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-2 md:p-4" dir="rtl">
      <h2 className="text-xl font-bold text-[#1d75a1] mb-4 border-b pb-1.5">טופס איחוד הלוואות</h2>

      <div className="flex flex-col gap-4">
        
        {/* קוביה 1: נכסים והתחייבויות */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-100">
            קוביה 1: שווי נכסים ויתרות משכנתא
          </h3>
          
          <div className="flex flex-col gap-3">
            {/* שורה 1: שווי נכסים */}
            <div>
              <span className="block text-xs font-semibold text-gray-400 mb-1">פירוט שווי נכסים</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">נכס 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleAssetChange("asset1", e.target.value)}
                    className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">נכס 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleAssetChange("asset2", e.target.value)}
                    className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">נכס 3</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleAssetChange("asset3", e.target.value)}
                    className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div className="bg-blue-50/50 p-1.5 rounded border border-blue-100 flex flex-col justify-end">
                  <span className="block text-[10px] text-blue-700 font-medium">סה"כ שווי נכסים</span>
                  <span className="text-base font-bold text-[#1d75a1] leading-none mt-0.5">
                    {totalAssets.toLocaleString()} ₪
                  </span>
                </div>
              </div>
            </div>

            {/* שורה 2: יתרת משכנתא */}
            <div>
              <span className="block text-xs font-semibold text-gray-400 mb-1">פירוט יתרות משכנתא</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">משכנתא 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleMortgageChange("mort1", e.target.value)}
                    className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">משכנתא 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleMortgageChange("mort2", e.target.value)}
                    className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-0.5">משכנתא 3</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleMortgageChange("mort3", e.target.value)}
                    className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div className="bg-red-50/40 p-1.5 rounded border border-red-100 flex flex-col justify-end">
                  <span className="block text-[10px] text-red-700 font-medium">סה"כ חובות משכנתא</span>
                  <span className="text-base font-bold text-red-600 leading-none mt-0.5">
                    {totalMortgages.toLocaleString()} ₪
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* קוביה 2: הכנסות */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-100">
            קוביה 2: הכנסות חודשיות
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] text-gray-600 mb-0.5">בן זוג ראשי</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => handleIncomeChange("primary", e.target.value)}
                className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-0.5">בן זוג משני</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => handleIncomeChange("secondary", e.target.value)}
                className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-0.5">ערב <span className="text-gray-400 text-[9px]">(לפי 50%)</span></label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => handleIncomeChange("guarantor", e.target.value)}
                className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
              />
            </div>
            <div className="bg-emerald-50/50 p-1.5 rounded border border-emerald-100 flex flex-col justify-end">
              <span className="block text-[10px] text-emerald-700 font-medium">סה"כ הכנסה מוכרת</span>
              <span className="text-base font-bold text-emerald-600 leading-none mt-0.5">
                {totalIncome.toLocaleString()} ₪
              </span>
            </div>
          </div>
        </div>

        {/* קוביות ההלוואות והתמהיל - חצי מסך לכל אחת בדסקטופ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <ExistingLoans
              loans={loans}
              onUpdateLoan={updateLoan}
              onDeleteLoan={deleteLoan}
              onAddLoan={addLoan}
              calcPayment={calcPayment}
              parse={parse}
              format={format}
            />
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <InitialMixConsolidation
              loans={mixLoans}
              onUpdateLoan={updateMixLoan}
              onDeleteLoan={deleteMixLoan}
              onAddLoan={addMixLoan}
              calcPayment={calcPayment}
              parse={parse}
              format={format}
            />
          </div>
        </div>

      </div>
    </div>
  );
}








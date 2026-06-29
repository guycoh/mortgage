"use client";

import React, { useState } from "react";

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
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 dir-rtl" dir="rtl">
      <h2 className="text-2xl font-bold text-[#1d75a1] mb-6 border-b pb-2">טופס נתונים פיננסיים</h2>

      <div className="flex flex-col gap-6">
        
        {/* קוביה 1: נכסים והתחייבויות */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            קוביה 1: שווי נכסים ויתרות משכנתא
          </h3>
          
          <div className="flex flex-col gap-6">
            {/* שורה 1: שווי נכסים */}
            <div>
              <span className="block text-sm font-medium text-gray-500 mb-2">פירוט שווי נכסים</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">נכס 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleAssetChange("asset1", e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">נכס 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleAssetChange("asset2", e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">נכס 3</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleAssetChange("asset3", e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                {/* טור רביעי - סיכום נכסים */}
                <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex flex-col justify-end">
                  <span className="block text-xs text-blue-700 font-medium">סה"כ שווי נכסים</span>
                  <span className="text-lg font-bold text-[#1d75a1]">
                    {totalAssets.toLocaleString()} ₪
                  </span>
                </div>
              </div>
            </div>

            {/* שורה 2: יתרת משכנתא */}
            <div>
              <span className="block text-sm font-medium text-gray-500 mb-2">פירוט יתרות משכנתא</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">משכנתא 1</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleMortgageChange("mort1", e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">משכנתא 2</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleMortgageChange("mort2", e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">משכנתא 3</label>
                  <input
                    type="number"
                    placeholder="0"
                    onChange={(e) => handleMortgageChange("mort3", e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                  />
                </div>
                {/* טור רביעי - סיכום משכנתאות */}
                <div className="bg-red-50/40 p-2.5 rounded-lg border border-red-100 flex flex-col justify-end">
                  <span className="block text-xs text-red-700 font-medium">סה"כ חובות משכנתא</span>
                  <span className="text-lg font-bold text-red-600">
                    {totalMortgages.toLocaleString()} ₪
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* קוביה 2: הכנסות */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            קוביה 2: הכנסות חודשיות
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">בן זוג ראשי</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => handleIncomeChange("primary", e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">בן זוג משני</label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => handleIncomeChange("secondary", e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ערב <span className="text-gray-400 text-[10px]">(מחושב לפי 50%)</span></label>
              <input
                type="number"
                placeholder="0"
                onChange={(e) => handleIncomeChange("guarantor", e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
              />
            </div>
            
            {/* טור רביעי - סיכום הכנסות */}
            <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex flex-col justify-end">
              <span className="block text-xs text-emerald-700 font-medium">סה"כ הכנסה מוכרת</span>
              <span className="text-lg font-bold text-emerald-600">
                {totalIncome.toLocaleString()} ₪
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
"use client"

import { useRef, useState } from "react";
import ExistingLoans, { Loan } from "./ExistingLoans";
import InitialMixConsolidation, { InitialMixLoan } from "./InitialMixConsolidation";
import { CreditReportImport, toLoanRows, type ExtractedLoan } from "@/components/credit-import";

interface PropertyRow {
  assetValue: number;
  mortgageValue: number;
}

export default function FinancialForm() {
  // קוביה 1 דינמית: מערך נכסים ומשכנתאות משולב
  const [properties, setProperties] = useState<PropertyRow[]>([
    { assetValue: 0, mortgageValue: 0 }
  ]);

  // קוביה 2: הכנסות
  const [incomes, setIncomes] = useState({ primary: 0, secondary: 0, guarantor: 0 });

  const [ages, setAges] = useState({
    primary: "",
    secondary: "",
    guarantor: "",
  });

  // חישובים אוטומטיים דינמיים - קוביה 1
  const totalAssets = properties.reduce((sum, item) => sum + item.assetValue, 0);
  const totalMortgages = properties.reduce((sum, item) => sum + item.mortgageValue, 0);

  // חישובים אוטומטיים - קוביה 2 (ערב נחשב 50%)
  const totalIncome = incomes.primary + incomes.secondary + (incomes.guarantor * 0.5);

  // --- ניהול הלוואות קיימות ---
  const [loans, setLoans] = useState<Loan[]>([
    { balance: "", interest: "", months: "" }
  ]);

  const formatThousands = (value: number | string) => {
    if (value === "" || value === undefined || value === null) return "";
    const num = Number(String(value).replace(/,/g, ""));
    return isNaN(num) ? "" : num.toLocaleString("he-IL");
  };

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

  // --- ייבוא אוטומטי מדוח ריכוז נתונים ---
  const loansCardRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);

  const handleSelect = (selected: ExtractedLoan[]) => {
    const rows = toLoanRows(selected);
    setLoans(rows.length ? rows : [{ balance: "", interest: "", months: "" }]);
  };

  const handleImported = () => {
    setFlash(true);
    setTimeout(
      () => loansCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      60
    );
    setTimeout(() => setFlash(false), 1800);
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

  // פונקציות לניהול טבלת הנכסים הדינמית
  const handlePropertyChange = (index: number, field: keyof PropertyRow, value: string) => {
    const numericValue = Number(value.replace(/[^\d]/g, "")) || 0;
    const updated = [...properties];
    updated[index] = { ...updated[index], [field]: numericValue };
    setProperties(updated);
  };

  const addPropertyRow = () => {
    setProperties([...properties, { assetValue: 0, mortgageValue: 0 }]);
  };

  const deletePropertyRow = (index: number) => {
    if (properties.length === 1) return;
    setProperties(properties.filter((_, i) => i !== index));
  };

  const handleAgeChange = (field: "primary" | "secondary" | "guarantor", value: string) => {
    setAges((prev) => ({ ...prev, [field]: value }));
  };

  const handleIncomeChange = (field: "primary" | "secondary" | "guarantor", value: string) => {
    const numericValue = Number(value.replace(/[^\d]/g, ""));
    setIncomes((prev) => ({ ...prev, [field]: numericValue }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-2 md:p-4" dir="rtl">
      <h2 className="text-3xl font-bold text-[#1d75a1] mb-4 border-b pb-1.5">סימולטור איחוד הלוואות</h2>

      {/* ייבוא אוטומטי מדוח ריכוז נתונים */}
      <div className="mb-4">
        <CreditReportImport onSelect={handleSelect} onImported={handleImported} />
      </div>

      <div className="flex flex-col gap-4">
        
        {/* חלק עליון: חלוקת 3/4 ו-1/4 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* צד ימין (3/4 מהמסך) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            
            {/* קוביה 1: טבלת נכסים ומשכנתאות דינמית */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3 pb-1 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-800">
                   שווי נכסים ויתרות משכנתא
                </h3>
                <button
                  type="button"
                  onClick={addPropertyRow}
                  className="text-xs font-semibold text-[#1d75a1] hover:text-[#155b7f] transition flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-200"
                >
                  <span>+ הוספת נכס</span>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50">
                      <th className="text-right p-2 font-medium text-xs w-12">#</th>
                      <th className="text-right p-2 font-medium text-xs">שווי נכס</th>
                      <th className="text-right p-2 font-medium text-xs">יתרת משכנתא קיימת</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((row, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition">
                        <td className="p-2 text-gray-400 font-medium text-xs vertical-middle align-middle pt-3">
                          נכס {index + 1}
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={row.assetValue === 0 ? "" : row.assetValue.toLocaleString("he-IL")}
                            onChange={(e) => handlePropertyChange(index, "assetValue", e.target.value)}
                            className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={row.mortgageValue === 0 ? "" : row.mortgageValue.toLocaleString("he-IL")}
                            onChange={(e) => handlePropertyChange(index, "mortgageValue", e.target.value)}
                            className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
                          />
                        </td>
                        <td className="p-1 text-center align-middle">
                          {properties.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deletePropertyRow(index)}
                              className="text-red-500 hover:text-red-700 transition font-bold p-1 text-base leading-none"
                              title="מחיקת שורה"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* קוביה 2: פרטים אישיים והכנסות */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-4 pb-1 border-b border-gray-100">
                  פרטים אישיים והכנסות
                </h3>

                {/* גילאים */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">גיל בן זוג ראשי</label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      placeholder="35"
                      value={ages.primary}
                      onChange={(e) => handleAgeChange("primary", e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">גיל בן זוג משני</label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      placeholder="35"
                      value={ages.secondary}
                      onChange={(e) => handleAgeChange("secondary", e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">גיל ערב</label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      placeholder="35"
                      value={ages.guarantor}
                      onChange={(e) => handleAgeChange("guarantor", e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
                    />
                  </div>
                </div>

                {/* הכנסות */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">הכנסות בן זוג ראשי</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatThousands(incomes.primary)}
                      onChange={(e) => handleIncomeChange("primary", e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">הכנסות בן זוג משני</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatThousands(incomes.secondary)}
                      onChange={(e) => handleIncomeChange("secondary", e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      הכנסות ערב <span className="text-gray-400 text-xs font-normal">(לפי 50%)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatThousands(incomes.guarantor)}
                      onChange={(e) => handleIncomeChange("guarantor", e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* צד שמאל (1/4 מהמסך) - קוביה מאוחדת */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 lg:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-4 pb-1 border-b border-gray-100">
                ריכוז נתונים וחישובים
              </h3>
              
              <div className="flex flex-col gap-3">
                {/* סה"כ שווי נכסים */}
                <div className="bg-blue-50/50 p-3 rounded border border-blue-100 flex flex-col justify-center">
                  <span className="block text-xs text-blue-700 font-medium">סה"כ שווי נכסים</span>
                  <span className="text-lg font-bold text-[#1d75a1] mt-0.5">
                    {totalAssets.toLocaleString()} ₪
                  </span>
                </div>

                {/* סה"כ חובות משכנתא */}
                <div className="bg-red-50/40 p-3 rounded border border-red-100 flex flex-col justify-center">
                  <span className="block text-xs text-red-700 font-medium">סה"כ חובות משכנתא</span>
                  <span className="text-lg font-bold text-red-600 mt-0.5">
                    {totalMortgages.toLocaleString()} ₪
                  </span>
                </div>

                {/* סה"כ הכנסה מוכרת */}
                <div className="bg-emerald-50/60 p-3 rounded border border-emerald-100 flex flex-col justify-center">
                  <span className="block text-xs text-emerald-800 font-medium">סה"כ הכנסה מוכרת</span>
                  <span className="text-lg font-bold text-emerald-600 mt-0.5">
                    {totalIncome.toLocaleString("he-IL")} ₪
                  </span>
                  
                  {/* שדה מחושב בקטן: 40% יחס החזר מקסימלי */}
                  <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 flex justify-between items-center text-[11px] text-emerald-700">
                    <span>40% יחס החזר מקסימלי:</span>
                    <span className="font-semibold">
                      {((totalIncome || 0) * 0.4).toLocaleString("he-IL")} ₪
                    </span>
                  </div>
                </div>

                {/* מקום לחישובים עתידיים */}
                <div className="text-xs text-gray-400 italic text-center p-3 border border-dashed border-gray-200 rounded mt-2">
                  מקום לחישובים נוספים...
                </div>
              </div>
            </div>
          </div>

        </div>
        
        {/* קוביות ההלוואות והתמהיל */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            ref={loansCardRef}
            className={`bg-white p-4 rounded-lg shadow-sm border transition-all duration-500 ${
              flash ? "border-[#1d75a1] ring-4 ring-[#1d75a1]/15" : "border-gray-100"
            }`}
          >
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





// "use client"

// import { useRef, useState } from "react";
// import ExistingLoans, { Loan } from "./ExistingLoans";
// import InitialMixConsolidation, { InitialMixLoan } from "./InitialMixConsolidation";
// import { CreditReportImport, toLoanRows, type ExtractedLoan } from "@/components/credit-import";

// export default function FinancialForm() {
//   // קוביה 1: נכסים ומשכנתאות
//   const [assets, setAssets] = useState({ asset1: 0, asset2: 0, asset3: 0 });
//   const [mortgages, setMortgages] = useState({ mort1: 0, mort2: 0, mort3: 0 });

//   // קוביה 2: הכנסות
//   const [incomes, setIncomes] = useState({ primary: 0, secondary: 0, guarantor: 0 });

//   const [ages, setAges] = useState({
//     primary: "",
//     secondary: "",
//     guarantor: "",
//   });



//   // חישובים אוטומטיים - קוביה 1
//   const totalAssets = assets.asset1 + assets.asset2 + assets.asset3;
//   const totalMortgages = mortgages.mort1 + mortgages.mort2 + mortgages.mort3;

//   // חישובים אוטומטיים - קוביה 2 (ערב נחשב 50%)
//   const totalIncome = incomes.primary + incomes.secondary + (incomes.guarantor * 0.5);

//   // --- ניהול הלוואות קיימות ---
//   const [loans, setLoans] = useState<Loan[]>([
//     { balance: "", interest: "", months: "" }
//   ]);


// const formatThousands = (value: number | string) => {
//   if (value === "" || value === undefined || value === null) return "";
//   const num = Number(String(value).replace(/,/g, ""));
//   return isNaN(num) ? "" : num.toLocaleString("he-IL");
// };


//   const updateLoan = (i: number, key: keyof Loan, value: string) => {
//     const copy = [...loans];
//     copy[i] = { ...copy[i], [key]: value };
//     setLoans(copy);
//   };

//   const deleteLoan = (i: number) => {
//     if (loans.length === 1) return;
//     setLoans(loans.filter((_, index) => index !== i));
//   };

//   const addLoan = () => {
//     setLoans([...loans, { balance: "", interest: "", months: "" }]);
//   };

//   // --- ייבוא אוטומטי מדוח ריכוז נתונים ---
//   const loansCardRef = useRef<HTMLDivElement>(null);
//   const [flash, setFlash] = useState(false);

//   // Map the selected report loans into this calculator's rows (fires on import
//   // and on every toggle) — data only, no viewport side-effects.
//   const handleSelect = (selected: ExtractedLoan[]) => {
//     const rows = toLoanRows(selected);
//     setLoans(rows.length ? rows : [{ balance: "", interest: "", months: "" }]);
//   };

//   // Fires once per successful parse: draw attention to the calculator.
//   const handleImported = () => {
//     setFlash(true);
//     setTimeout(
//       () => loansCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
//       60
//     );
//     setTimeout(() => setFlash(false), 1800);
//   };


//   // --- ניהול תמהיל ראשוני חדש ---
//   const [mixLoans, setMixLoans] = useState<InitialMixLoan[]>([
//     { balance: "", interest: "", months: "", type: "" }
//   ]);

//   const updateMixLoan = (i: number, key: keyof InitialMixLoan, value: string) => {
//     const copy = [...mixLoans];
//     copy[i] = { ...copy[i], [key]: value };
//     setMixLoans(copy);
//   };

//   const deleteMixLoan = (i: number) => {
//     if (mixLoans.length === 1) return;
//     setMixLoans(mixLoans.filter((_, index) => index !== i));
//   };

//   const addMixLoan = () => {
//     setMixLoans([...mixLoans, { balance: "", interest: "", months: "", type: "" }]);
//   };


//   // --- פונקציות עזר כלליות ---
//   const format = (v: string) =>
//     v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

//   const parse = (v: string) => Number(v.replace(/,/g, "") || 0);

//   const calcPayment = (balance: string, interest: string, months: string) => {
//     const amount = parse(balance);
//     const r = parseFloat(interest) / 100 / 12;
//     const m = Number(months);
//     if (!amount || !m || !r) return 0;
//     return amount * (r / (1 - Math.pow(1 + r, -m)));
//   };

//   const handleAssetChange = (field: string, value: string) => {
//     setAssets(prev => ({ ...prev, [field]: Number(value) || 0 }));
//   };

//   const handleMortgageChange = (field: string, value: string) => {
//     setMortgages(prev => ({ ...prev, [field]: Number(value) || 0 }));
//   };


//   const handleAgeChange = (
//     field: "primary" | "secondary" | "guarantor",
//     value: string
//   ) => {
//     setAges((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };


//   const handleIncomeChange = (
//   field: "primary" | "secondary" | "guarantor",
//   value: string
// ) => {
//   const numericValue = Number(value.replace(/[^\d]/g, ""));

//   setIncomes((prev) => ({
//     ...prev,
//     [field]: numericValue,
//   }));
// };

//   return (

// <div className="w-full max-w-5xl mx-auto p-2 md:p-4" dir="rtl">
//   <h2 className="text-xl font-bold text-[#1d75a1] mb-4 border-b pb-1.5">טופס איחוד הלוואות</h2>

//   {/* ייבוא אוטומטי מדוח ריכוז נתונים (מערכת נתוני אשראי) */}
//   <div className="mb-4">
//     <CreditReportImport
//       onSelect={handleSelect}
//       onImported={handleImported}
//     />
//   </div>

//   <div className="flex flex-col gap-4">
    
//     {/* חלק עליון: חלוקת 3/4 ו-1/4 במסכים גדולים */}
//     <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      
//       {/* צד ימין (3/4 מהמסך) - מכיל את קוביה 1 וקוביה 2 */}
//       <div className="lg:col-span-3 flex flex-col gap-4">
        
//         {/* קוביה 1: נכסים והתחייבויות (ללא סכומים) */}
//         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
//           <h3 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-100">
//             קוביה 1: שווי נכסים ויתרות משכנתא
//           </h3>
          
//           <div className="flex flex-col gap-4">
//             {/* שורה 1: שווי נכסים */}
//             <div>
//               <span className="block text-xs font-semibold text-gray-400 mb-1">פירוט שווי נכסים</span>
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
//                 <div>
//                   <label className="block text-[11px] text-gray-600 mb-0.5">נכס 1</label>
//                   <input
//                     type="number"
//                     placeholder="0"
//                     onChange={(e) => handleAssetChange("asset1", e.target.value)}
//                     className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-gray-600 mb-0.5">נכס 2</label>
//                   <input
//                     type="number"
//                     placeholder="0"
//                     onChange={(e) => handleAssetChange("asset2", e.target.value)}
//                     className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-gray-600 mb-0.5">נכס 3</label>
//                   <input
//                     type="number"
//                     placeholder="0"
//                     onChange={(e) => handleAssetChange("asset3", e.target.value)}
//                     className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* שורה 2: יתרת משכנתא */}
//             <div>
//               <span className="block text-xs font-semibold text-gray-400 mb-1">פירוט יתרות משכנתא</span>
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
//                 <div>
//                   <label className="block text-[11px] text-gray-600 mb-0.5">משכנתא 1</label>
//                   <input
//                     type="number"
//                     placeholder="0"
//                     onChange={(e) => handleMortgageChange("mort1", e.target.value)}
//                     className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-gray-600 mb-0.5">משכנתא 2</label>
//                   <input
//                     type="number"
//                     placeholder="0"
//                     onChange={(e) => handleMortgageChange("mort2", e.target.value)}
//                     className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-gray-600 mb-0.5">משכנתא 3</label>
//                   <input
//                     type="number"
//                     placeholder="0"
//                     onChange={(e) => handleMortgageChange("mort3", e.target.value)}
//                     className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1d75a1] focus:border-transparent outline-none transition"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* קוביה 2: פרטים אישיים והכנסות */}
//         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
//           <div>
//             <h3 className="text-base font-semibold text-gray-800 mb-4 pb-1 border-b border-gray-100">
//               פרטים אישיים והכנסות
//             </h3>

//             {/* גילאים */}
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   גיל בן זוג ראשי
//                 </label>
//                 <input
//                   type="number"
//                   min={18}
//                   max={100}
//                   placeholder="35"
//                   onChange={(e) => handleAgeChange("primary", e.target.value)}
//                   className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   גיל בן זוג משני
//                 </label>
//                 <input
//                   type="number"
//                   min={18}
//                   max={100}
//                   placeholder="35"
//                   onChange={(e) => handleAgeChange("secondary", e.target.value)}
//                   className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   גיל ערב
//                 </label>
//                 <input
//                   type="number"
//                   min={18}
//                   max={100}
//                   placeholder="35"
//                   onChange={(e) => handleAgeChange("guarantor", e.target.value)}
//                   className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
//                 />
//               </div>
//             </div>

//             {/* הכנסות */}
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   הכנסות בן זוג ראשי
//                 </label>
//                 <input
//                   type="text"
//                   inputMode="numeric"
//                   placeholder="0"
//                   value={formatThousands(incomes.primary)}
//                   onChange={(e) => handleIncomeChange("primary", e.target.value)}
//                   className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   הכנסות בן זוג משני
//                 </label>
//                 <input
//                   type="text"
//                   inputMode="numeric"
//                   placeholder="0"
//                   value={formatThousands(incomes.secondary)}
//                   onChange={(e) => handleIncomeChange("secondary", e.target.value)}
//                   className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   הכנסות ערב <span className="text-gray-400 text-xs font-normal">(לפי 50%)</span>
//                 </label>
//                 <input
//                   type="text"
//                   inputMode="numeric"
//                   placeholder="0"
//                   value={formatThousands(incomes.guarantor)}
//                   onChange={(e) => handleIncomeChange("guarantor", e.target.value)}
//                   className="w-full p-2 text-sm border border-gray-300 rounded focus:bg-orange-50/50 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition bg-white text-gray-900"
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//       </div>

//       {/* צד שמאל (1/4 מהמסך) - קוביה מאוחדת לכל החישובים והסיכומים */}
//       <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 lg:col-span-1 flex flex-col justify-between">
//         <div>
//           <h3 className="text-base font-semibold text-gray-800 mb-4 pb-1 border-b border-gray-100">
//             ריכוז נתונים וחישובים
//           </h3>
          
//           <div className="flex flex-col gap-3">
//             {/* סה"כ שווי נכסים */}
//             <div className="bg-blue-50/50 p-3 rounded border border-blue-100 flex flex-col justify-center">
//               <span className="block text-xs text-blue-700 font-medium">סה"כ שווי נכסים</span>
//               <span className="text-lg font-bold text-[#1d75a1] mt-0.5">
//                 {totalAssets.toLocaleString()} ₪
//               </span>
//             </div>

//             {/* סה"כ חובות משכנתא */}
//             <div className="bg-red-50/40 p-3 rounded border border-red-100 flex flex-col justify-center">
//               <span className="block text-xs text-red-700 font-medium">סה"כ חובות משכנתא</span>
//               <span className="text-lg font-bold text-red-600 mt-0.5">
//                 {totalMortgages.toLocaleString()} ₪
//               </span>
//             </div>

//            {/* סה"כ הכנסה מוכרת */}
//             <div className="bg-emerald-50/60 p-3 rounded border border-emerald-100 flex flex-col justify-center">
//               <span className="block text-xs text-emerald-800 font-medium">
//                 סה"כ הכנסה מוכרת
//               </span>
//               <span className="text-lg font-bold text-emerald-600 mt-0.5">
//                 {totalIncome.toLocaleString("he-IL")} ₪
//               </span>
              
//               {/* שדה מחושב בקטן: 40% יחס החזר מקסימלי */}
//               <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 flex justify-between items-center text-[11px] text-emerald-700">
//                 <span>40% יחס החזר מקסימלי:</span>
//                 <span className="font-semibold">
//                   {((totalIncome || 0) * 0.4).toLocaleString("he-IL")} ₪
//                 </span>
//               </div>
//             </div>

//             {/* מקום לחישובים עתידיים */}
//             <div className="text-xs text-gray-400 italic text-center p-3 border border-dashed border-gray-200 rounded mt-2">
//               מקום לחישובים נוספים...
//             </div>
//           </div>
//         </div>
//       </div>

//     </div>
    
//     {/* קוביות ההלוואות והתמהיל - חצי מסך לכל אחת בדסקטופ */}
//     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//       <div
//         ref={loansCardRef}
//         className={`bg-white p-4 rounded-lg shadow-sm border transition-all duration-500 ${
//           flash
//             ? "border-[#1d75a1] ring-4 ring-[#1d75a1]/15"
//             : "border-gray-100"
//         }`}
//       >
//         <ExistingLoans
//           loans={loans}
//           onUpdateLoan={updateLoan}
//           onDeleteLoan={deleteLoan}
//           onAddLoan={addLoan}
//           calcPayment={calcPayment}
//           parse={parse}
//           format={format}
//         />
//       </div>

//       <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
//         <InitialMixConsolidation
//           loans={mixLoans}
//           onUpdateLoan={updateMixLoan}
//           onDeleteLoan={deleteMixLoan}
//           onAddLoan={addMixLoan}
//           calcPayment={calcPayment}
//           parse={parse}
//           format={format}
//         />
//       </div>
//     </div>

//   </div>
// </div>

//   );
// }








"use client"

import React, { useState, useEffect } from "react";

import SpitzerScheduleModal from "@/components/graphs/SpitzerScheduleModal";

interface LoanRow {
  id: number;
  loanAmount: number;
  annualInterestRate: number;
  monthlyInterestRate: number;
  months: number;
  endDate: string;
  monthlyPayment: number;
  loanType: number;
  isIndexed: boolean; // הוספת שדה צמוד
  showSchedule: boolean;
}



const LoanTable = () => {
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [openModal, setOpenModal] = useState<LoanRow | null>(null); // שורה פתוחה
  const [expectedIndex,setExpectedIndex]=useState(2.8);
  const [showResult, setShowResult] = useState(false);
  const [showModal, setShowModal] = useState(false);
  

const [selectedRow, setSelectedRow] = useState<typeof rows[0] | null>(null);

  // סימולציה לנתוני החיסכון — תוכל להחליף כאן לחישוב אמיתי
  const minSaving = 150000;
  const maxSaving = 200000;
  
// בתוך הקומפוננטה LoanTable, אחרי הגדרת הפונקציות:
useEffect(() => {
  addRow();
}, []);

  const loanTypes = [
    { code: 1, name: "פריים", isIndexed: false },
    { code: 2, name: "קבוע לא צמוד", isIndexed: false },
    { code: 3, name: "קבוע צמוד", isIndexed: true },
    { code: 11, name: "משתנה צמודה כל שנה", isIndexed: true },
    { code: 12, name: "משתנה צמודה כל 2.5", isIndexed: true },
    { code: 13, name: "משתנה צמודה כל 3", isIndexed: true },
    { code: 14, name: "משתנה צמודה כל 5", isIndexed: true },
    { code: 15, name: "משתנה צמודה כל 7", isIndexed: true },
    { code: 16, name: "משתנה צמודה כל 10", isIndexed: true },
    { code: 21, name: "משתנה לא צמוד כל שנה", isIndexed: false },
    { code: 22, name: "משתנה לא צמוד כל 2.5", isIndexed: false },
    { code: 23, name: "משתנה לא צמוד כל 3", isIndexed: false },
    { code: 24, name: "משתנה לא צמוד כל 5", isIndexed: false },
    { code: 25, name: "משתנה לא צמוד כל 7", isIndexed: false },
    { code: 26, name: "משתנה לא צמוד כל 10", isIndexed: false },
    { code: 27, name: "עוגן מק", isIndexed: false },
    { code: 31, name: "דולר", isIndexed: false },
    { code: 32, name: "יורו", isIndexed: false },
  ];
  
  

  const formatNumber = (num: number) => {
    return num.toLocaleString("he-IL");
  };

  const parseNumber = (str: string) => {
    return parseFloat(str.replace(/,/g, "")) || 0;
  };

  const calculateMonthlyInterestRate = (annualRate: number): number => {
  return annualRate / 12 / 100;
};


  const calculateMonths = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const differenceInMonths =
      (end.getFullYear() - today.getFullYear()) * 12 +
      (end.getMonth() - today.getMonth());
    return differenceInMonths > 0 ? differenceInMonths : 0;
  };

  
    
  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        loanAmount: 0,
        annualInterestRate: 0,
        monthlyInterestRate: 0,
        months: 0,
        endDate: "",
        monthlyPayment: 0,
        loanType: loanTypes[0].code,
        isIndexed: loanTypes[0].isIndexed, // ערך ברירת מחדל לפי סוג ההלוואה הראשון
        showSchedule: false,
      },
    ]);
  };  


  const updateRow = (id: number, field: keyof LoanRow, value: any) => {
    const updatedRows = rows.map((row) => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
  
        if (field === "annualInterestRate") {
          updatedRow.monthlyInterestRate = calculateMonthlyInterestRate(value);
        }
  
        if (field === "endDate") {
          updatedRow.months = calculateMonths(value);
        }
  
        if (field === "loanType") {
          const selectedLoanType = loanTypes.find((type) => type.code === value);
          updatedRow.isIndexed = selectedLoanType?.isIndexed || false;
        }
  
        if (
          (field === "loanAmount" ||
            field === "annualInterestRate" ||
            field === "months" ||
            field === "endDate") &&
          updatedRow.loanAmount > 0 &&
          updatedRow.monthlyInterestRate > 0 &&
          updatedRow.months > 0
        ) {
          const { loanAmount, monthlyInterestRate, months } = updatedRow;
          updatedRow.monthlyPayment = parseFloat(
            (
              (loanAmount * monthlyInterestRate) /
              (1 - Math.pow(1 + monthlyInterestRate, -months))
            ).toFixed(2)
          );
        }
  
        return updatedRow;
      }
      return row;
    });
    setRows(updatedRows);
  };



  const deleteRow = (id: number) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const totalLoanAmount = rows.reduce((sum, row) => sum + row.loanAmount, 0);
  const totalMonthlyPayment = rows.reduce(
    (sum, row) => sum + row.monthlyPayment,
    0
  );

  const todayDate = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-galbg p-3 ">
      
      <div className="max-w-full mx-auto bg-white shadow-md rounded-lg p-2">
        <h1 className="text-2xl font-bold text-[#1d75a1] mb-4">
          ד"ר מורגי מחשבון משכנתא
        </h1>
        <div className="mb-4 text-right flex items-center gap-4">
            <button
              onClick={addRow}
              className="bg-[#1d75a1] text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              הוסף מסלול חדש
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor="expectedIndex" className="text-sm text-gray-600">
                מדד ממוצע צפוי:
              </label>
              <input
                type="number"
                name="expectedIndex"
                value={expectedIndex}
                readOnly
                className="w-20 border border-gray-300 rounded px-2 py-1 bg-gray-100 text-gray-600 text-center"
              />
            </div>
        </div>

     

        <table className="w-full border-collapse border border-gray-300 text-right">
        <thead className="hidden md:table-header-group bg-gray-100 text-right">
            <tr>
                <th className="p-2 border">סכום ההלוואה</th>
                <th className="p-2 border">מסלול הלוואה</th>
                <th className="p-2 border">ריבית שנתית</th>
                <th className="p-2 border">צמוד</th>
                <th className="p-2 border">תאריך סיום</th>
                <th className="p-2 border">מספר חודשים</th>
                <th className="p-2 border">תשלום חודשי</th>
                <th className="p-2 border">סילוקין</th>
                <th className="p-2 border">מחק</th>
            </tr>
        </thead>
        <tbody>
  {rows.map((row) => (
    <tr
      key={row.id}
      className="grid grid-cols-2 gap-x-4 gap-y-2 md:table-row md:gap-0 mb-6 md:mb-0 bg-white md:bg-transparent shadow-md md:shadow-none rounded-xl md:rounded-none p-4 md:p-0 border border-gray-200 md:border-0 transition-all duration-300"
    >
      {/* סכום ההלוואה */}
      <td className="p-2 border md:border-gray-300 border-transparent">
        <span className="text-sm text-gray-500 block md:hidden">💰 סכום ההלוואה (₪)</span>
        <input
          type="text"
          className="w-full md:w-[150px] max-w-[15ch] border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
          value={formatNumber(row.loanAmount)}
          onChange={(e) =>
            updateRow(row.id, "loanAmount", parseNumber(e.target.value))
          }
        />
      </td>

      {/* מסלול הלוואה */}
      <td className="p-2 border md:border-gray-300 border-transparent">
        <span className="text-sm text-gray-500 block md:hidden">📊 מסלול הלוואה</span>
        <select
          className="w-full border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
          value={row.loanType}
          onChange={(e) => updateRow(row.id, "loanType", parseInt(e.target.value))}
        >
          {loanTypes.map((type) => (
            <option key={type.code} value={type.code}>{type.name}</option>
          ))}
        </select>
      </td>

      {/* ריבית שנתית */}
      <td className="p-2 border md:border-gray-300 border-transparent">
        <span className="text-sm text-gray-500 block md:hidden">📈 ריבית שנתית (%)</span>
        <input
          type="number"
          step="0.01"
          className="w-full md:w-[100px] max-w-[10ch] border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
          value={row.annualInterestRate}
          onChange={(e) =>
            updateRow(row.id, "annualInterestRate", parseFloat(e.target.value))
          }
        />
      </td>

      {/* צמוד */}
      <td className="p-2 border md:border-gray-300 border-transparent flex items-center gap-2">
        <span className="text-sm text-gray-500 block md:hidden">📌 צמוד</span>
        <input
          type="checkbox"
          checked={row.isIndexed}
          onChange={(e) => updateRow(row.id, "isIndexed", e.target.checked)}
          disabled
        />
      </td>

      {/* תאריך סיום */}
      <td className="p-2 border md:border-gray-300 border-transparent">
        <span className="text-sm text-gray-500 block md:hidden">📅 תאריך סיום</span>
        <input
          type="date"
          className="w-full md:w-[160px] border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
          min={todayDate}
          value={row.endDate}
          onChange={(e) => updateRow(row.id, "endDate", e.target.value)}
        />
      </td>

      {/* מספר חודשים */}
      <td className="p-2 border md:border-gray-300 border-transparent">
        <span className="text-sm text-gray-500 block md:hidden">🗓️ מספר חודשים</span>
        <input
          type="number"
          className="w-full md:w-[60px] max-w-[6ch] border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
          value={row.months}
          onChange={(e) => updateRow(row.id, "months", parseInt(e.target.value))}
        />
      </td>

      {/* תשלום חודשי */}
      <td className="p-2 border md:border-gray-300 border-transparent">
        <span className="text-sm text-gray-500 block md:hidden">💵 תשלום חודשי (₪)</span>
        <input
          type="number"
          className="w-full md:w-[100px] max-w-[10ch] border rounded-md px-2 py-1 bg-gray-100"
          value={row.monthlyPayment}
          disabled
        />
      </td>

      {/* כפתורי פעולה למסכים קטנים (סילוקין + מחק בשורה אחת) */}
      <td className="col-span-2 flex justify-between gap-2 md:hidden">
        <button
          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
        //  onClick={() => setOpenModal(row)}
      
        onClick={() => {
          setSelectedRow(row);
          setShowModal(true);
        }}
        >
          סילוקין
        </button>
        <button
          className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
          onClick={() => deleteRow(row.id)}
        >
          מחק
        </button>
      </td>

      {/* כפתורי פעולה למסכים רגילים */}
      <td className="hidden md:table-cell p-2 border md:border-gray-300 border-transparent">
        <button
          className="w-full md:w-auto bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
          onClick={() => {
            setSelectedRow(row);
            setShowModal(true);
          }}
        >
          סילוקין
        </button>
      </td>
      <td className="hidden md:table-cell p-2 border md:border-gray-300 border-transparent">
        <button
          className="w-full md:w-auto bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
          onClick={() => deleteRow(row.id)}
        >
          מחק
        </button>
      </td>
     


    </tr>
  ))}
 


</tbody>






</table>

        <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-right bg-gray-50 p-4 rounded-lg shadow-inner border">
        <div className="text-lg font-bold text-gray-700">
            סך הכול הלוואות: <span className="text-blue-600">{formatNumber(totalLoanAmount)} ₪</span>
        </div>
        <div className="text-lg font-bold text-gray-700">
            סך תשלום חודשי: <span className="text-green-600">{formatNumber(Number(totalMonthlyPayment.toFixed(2)))} ₪</span>
        </div>
        </div>
       
        

       
      </div>
{/* מחוץ ל־<table> */}
{showModal && selectedRow && (
  <SpitzerScheduleModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    loanAmount={selectedRow.loanAmount}
    annualInterest={selectedRow.annualInterestRate}
    annualIndex={expectedIndex}
    months={selectedRow.months}
    isLinkedToIndex={selectedRow.isIndexed}
  />
)}

    </div>
  );
};

export default LoanTable;       



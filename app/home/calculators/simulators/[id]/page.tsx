"use client"

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import LoanTable, { Loan } from "../components/LoanTable";
import { useLoanPaths } from "@/app/data/hooks/useLoanPaths";
import { Percent, Save, Copy, Calendar } from "lucide-react";

import UnifiedScheduleModal from "../components/UnifiedScheduleModal";
import MixComparisonTable from "../components/MixComparisonTable";
import MixScheduleChartSVG from "../components/MixScheduleChartSVG";

type Mix = {
  id: string;
  mix_name: string;
  loans?: Loan[];
  is_base?: boolean;
};

export default function SimulatorPage() {
  const params = useParams();
  const leadId = Number(params.id);

  const { paths: loanPaths, loading } = useLoanPaths();

  const [mixes, setMixes] = useState<Mix[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isUnifiedSchedule, setIsUnifiedSchedulelOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const [annualInflation, setAnnualInflation] = useState<number>(2.8);
  const [compareMixId, setCompareMixId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputBaseStyle = 
    "text-sm font-semibold text-gray-900 border border-gray-300 rounded-none px-3 py-1.5 focus:ring-1 focus:ring-[#1d75a1] focus:border-[#1d75a1] outline-none bg-white";

  const defaultLoan = (mixId: string): Loan => ({
    id: crypto.randomUUID(),
    mix_id: mixId,
    path_id: 1,
    grace_type_id: 1,
    amortization_schedule_id: 1,
    amount: 0,
    rate: 0,
    months: 0,
  });

  // 🔹 Fetch data
  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/mixes/${leadId}`);
      const data = await res.json();

      if (data.mixes?.length > 0) {
        setMixes(data.mixes);
        setActiveMixId(data.mixes[0].id);
        return;
      }

      const defaultMixId = crypto.randomUUID();
      const defaultLoans: Loan[] = Array.from({ length: 3 }, () => defaultLoan(defaultMixId));

      const defaultMix: Mix = {
        id: defaultMixId,
        mix_name: "משכנתא נוכחית",
        loans: defaultLoans,
        is_base: true,
      };

      setMixes([defaultMix]);
      setActiveMixId(defaultMixId);
    }

    fetchData();
  }, [leadId]);

  const activeMix = mixes.find((m) => m.id === activeMixId);

  useEffect(() => setCompareMixId(null), [activeMixId]);

  // 🔹 Add Mix
  const addMix = () => {
    const newMixId = crypto.randomUUID();
    const newMix: Mix = {
      id: newMixId,
      mix_name: `תמהיל ${mixes.length + 1}`,
      loans: Array.from({ length: 3 }, () => defaultLoan(newMixId)),
    };
    setMixes((prev) => [...prev, newMix]);
    setActiveMixId(newMix.id);
  };

  // 🔹 Delete Mix
  const deleteMix = (id: string) => {
    const mix = mixes.find(m => m.id === id);
    if (!mix || mix.is_base) return;

    const remaining = mixes.filter(m => m.id !== id);
    setMixes(remaining);
    setActiveMixId(remaining.length ? remaining[0].id : null);
  };

  // 🔹 Save Mixes
  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/mixes/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: leadId, mixes }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage("✅ התיק נשמר בהצלחה!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(`❌ שגיאה: ${data.error}`);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (err) {
      setErrorMessage("❌ קרתה שגיאה ברשת");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // 🔹 Duplicate Mix
  const duplicateMix = () => {
    if (!activeMixId) return;
    const mixToCopy = mixes.find(m => m.id === activeMixId);
    if (!mixToCopy) return;

    const duplicatedLoans = mixToCopy.loans?.map(l => ({ ...l, id: crypto.randomUUID() })) || [];

    const duplicatedMix: Mix = {
      ...mixToCopy,
      id: crypto.randomUUID(),
      mix_name: `${mixToCopy.mix_name} (העתק)`,
      loans: duplicatedLoans,
      is_base: false,
    };

    setMixes(prev => [...prev, duplicatedMix]);
    setActiveMixId(duplicatedMix.id);
  };

  // 🔹 Menu positioning
  const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX - 120,
    });
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl" ref={containerRef}>
      <div className="max-w-7xl mx-auto">
        
        {/* כותרת הדף + כפתור שמירה ראשי */}
        <div className="mb-6 flex items-center justify-center border-b border-gray-200 pb-4">
  
  <h1 className="font-open-sans font-normal text-4xl text-gray-800 text-center leading-tight">
    מחשבון משכנתא
  </h1>

        </div>
        
        
        
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          {/* <h1 className="text-2xl font-bold text-gray-900">סימולטור לליד {leadId}</h1> */}
          
        
         
          {/*כפתור מוסתר ללקוחות  */}
          {/* <button
            onClick={handleSave}
            disabled={isSaving}
            className={`h-9 px-5 bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5 rounded-none ${
              isSaving ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <Save size={16} />
            {isSaving ? "שומר..." : "שמור שינויים"}
          </button> */}
        </div>

       {/* קוביית בקרה ותפעול מרכזית ומאוחדת */}
        <div className="bg-white p-4 rounded-none border border-gray-200 shadow-sm mb-6 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            
            {/* 1. מדד מחירים צפוי */}
            <div className="w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Percent size={14} className="text-[#1d75a1]" />
                מדד מחירים צפוי שנתי:
              </label>
              <div className="relative shadow-sm">
                <input
                  type="number"
                  step="0.1"
                  value={annualInflation}
                  onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
                  className={`${inputBaseStyle} w-full`}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-bold">
                  %
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">
                חודשי: {(annualInflation / 12).toFixed(3)}%
              </div>
            </div>

            {/* 2. תמהיל להשוואה */}
            <div className="w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                תמהיל להשוואה:
              </label>
              <select
                value={compareMixId ?? ""}
                onChange={(e) => setCompareMixId(e.target.value || null)}
                disabled={!activeMix}
                className={`${inputBaseStyle} w-full disabled:bg-gray-50 disabled:text-gray-400`}
              >
                <option value="">ללא השוואה</option>
                {mixes
                  .filter((m) => m.id !== activeMixId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.mix_name}
                    </option>
                  ))}
              </select>
              <div className="text-[10px] text-transparent mt-0.5 font-semibold select-none">מרווח</div>
            </div>

            {/* 3. כפתור שכפול תמהיל */}
            <div className="w-full">
              <button
                onClick={duplicateMix}
                disabled={!activeMixId}
                className="h-9 w-full bg-[#1d75a1] text-white font-bold text-sm hover:bg-[#155b7e] transition shadow-sm flex items-center justify-center gap-1.5 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy size={15} />
                שכפל תמהיל פעיל
              </button>
              <div className="text-[10px] text-transparent mt-0.5 font-semibold select-none">מרווח</div>
            </div>

            {/* 4. כפתור לוח סילוקין לתמהיל */}
            <div className="w-full">
              <button
                onClick={() => setIsUnifiedSchedulelOpen(true)}
                className="h-9 w-full bg-gray-800 text-white font-bold text-sm hover:bg-gray-900 transition shadow-sm flex items-center justify-center gap-1.5 rounded-none"
              >
                <Calendar size={15} />
                לוח סילוקין משולב
              </button>
              <div className="text-[10px] text-transparent mt-0.5 font-semibold select-none">מרווח</div>
            </div>

          </div>

          {/* הודעות סטטוס צפות בתוך הקובייה במידה וקיימות */}
          {(successMessage || errorMessage) && (
            <div className={`mt-3 p-2 text-white text-xs font-bold text-center ${successMessage ? "bg-emerald-600" : "bg-red-600"}`}>
              {successMessage || errorMessage}
            </div>
          )}
        </div>

        {/* בר לשוניות (Tabs) מעוצב ומצומצם בגובהו */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none mb-0 gap-1 items-end">
          {mixes.map((m) => {
            const isActive = m.id === activeMixId;
            return (
              <div
                key={m.id}
                onClick={() => setActiveMixId(m.id)}
                className={`group relative py-2 px-5 text-sm font-bold transition-all duration-150 whitespace-nowrap border-t border-x -mb-px text-center cursor-pointer flex items-center gap-2 rounded-none ${
                  isActive
                    ? "bg-[#1d75a1] border-[#1d75a1] text-white"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 border-transparent"
                }`}
                style={{ width: "auto" }} // מתרחב דינמית לפי רוחב הטקסט
              >
                {editingId === m.id ? (
                  <input
                    type="text"
                    value={m.mix_name}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setMixes((prev) =>
                        prev.map((x) => (x.id === m.id ? { ...x, mix_name: e.target.value } : x))
                      )
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                    className="px-1.5 py-0.5 text-xs text-black border focus:outline-none focus:ring-1 focus:ring-[#1d75a1] rounded-none font-medium"
                  />
                ) : (
                  <span>{m.mix_name}</span>
                )}

                {/* כפתור תפריט 3 נקודות קומפקטי */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openMenu(m.id, e);
                  }}
                  className={`px-1 rounded hover:bg-black/10 text-xs transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}
                >
                  ⋮
                </button>
              </div>
            );
          })}

          {/* כפתור הוספת לשונית (+) בעיצוב תואם ומשולב */}
          <button
            onClick={addMix}
            className="py-2 px-4 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition border border-transparent -mb-px text-center rounded-none"
            title="הוסף תמהיל חדש"
          >
            +
          </button>
        </div>

        {/* תפריט הדרופדאון הצף ללשונית */}
        {openMenuId && (
          <div
            className="fixed w-32 bg-white border border-gray-200 shadow-md z-[9999] rounded-none text-xs font-bold"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="flex justify-between items-center px-2 py-1 border-b bg-gray-50">
              <span className="text-[10px] text-gray-400">אפשרויות</span>
              <button onClick={() => setOpenMenuId(null)} className="text-gray-400 hover:text-red-600">
                ✕
              </button>
            </div>
            <button
              onClick={() => {
                setEditingId(openMenuId);
                setOpenMenuId(null);
              }}
              className="block w-full text-right px-3 py-2 hover:bg-gray-50 text-gray-700"
            >
              ✏ ערוך שם
            </button>
            <button
              onClick={() => {
                deleteMix(openMenuId);
                setOpenMenuId(null);
              }}
              disabled={mixes.find(m => m.id === openMenuId)?.is_base}
              className="block w-full text-right px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              🗑 מחק תמהיל
            </button>
          </div>
        )}

        {/* תוכן הטבלה הפעילה */}
        {activeMix && (
          <div className="bg-white border-x border-b border-gray-200 shadow-sm rounded-none mb-6">
            <div className="p-4 sm:p-6">
              {!loading && (
                <LoanTable
                  loans={activeMix.loans || []}
                  paths={loanPaths}
                  annualInflation={annualInflation}
                  setAnnualInflation={setAnnualInflation}
                  onChange={(newLoans) =>
                    setMixes((prev) =>
                      prev.map((m) => (m.id === activeMix.id ? { ...m, loans: newLoans } : m))
                    )
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* גרפים וטבלאות השוואה */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-none">
            <MixComparisonTable
              activeMixId={activeMixId}
              mixes={mixes}
              annualInflation={annualInflation}
              compareMixId={compareMixId}
            />
          </div>
          <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-none">
            <MixScheduleChartSVG
              activeMixId={activeMixId}
              mixes={mixes}
              annualInflation={annualInflation}
            />
          </div>
        </div>

      </div>

      {/* מודאל לוח סילוקין משולב */}
      {isUnifiedSchedule && (
        <UnifiedScheduleModal
          activeMixId={activeMixId}
          mixes={mixes}
          annualInflation={annualInflation}
          onClose={() => setIsUnifiedSchedulelOpen(false)}
        />
      )}
    </div>
  );
}


























// "use client"

// import { useState, useEffect, useRef, useMemo } from "react";
// import { useParams } from "next/navigation";
// import LoanTable, { Loan } from "../components/LoanTable";
// import { useLoanPaths } from "@/app/data/hooks/useLoanPaths";

// import UnifiedScheduleModal from "../components/UnifiedScheduleModal";
// import MixComparisonTable from "../components/MixComparisonTable";

// import MixScheduleChartSVG from "../components/MixScheduleChartSVG";

// type Mix = {
//   id: string;
//   mix_name: string;
//   loans?: Loan[];
//   is_base?: boolean; // ✅ תמהיל בסיסי / משכנתא נוכחית
// };


// export default function SimulatorPage() {
//   const params = useParams();
//   const leadId = Number(params.id);

//   const { paths: loanPaths, loading } = useLoanPaths();

//   const [mixes, setMixes] = useState<Mix[]>([]);
//   const [activeMixId, setActiveMixId] = useState<string | null>(null);
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [openMenuId, setOpenMenuId] = useState<string | null>(null);
//   const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
//   const [isUnifiedSchedule, setIsUnifiedSchedulelOpen] = useState(false);

//   const containerRef = useRef<HTMLDivElement>(null);

//   const [annualInflation, setAnnualInflation] = useState<number>(2.8);
//   const [compareMixId, setCompareMixId] = useState<string | null>(null);

//   const [isSaving, setIsSaving] = useState(false);
//   const [successMessage, setSuccessMessage] = useState<string | null>(null);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   const fieldClasses =
//     "h-9 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-orange-100";

//   // 🔹 Fetch data


//   const defaultLoan = (mixId: string): Loan => ({
//     id: crypto.randomUUID(),
//     mix_id: mixId,
//     path_id: 1,
//     grace_type_id: 1,
//     amortization_schedule_id: 1,
//     amount: 0,
//     rate: 0,
//     months: 0,
//   });

//   // 🔹 Fetch data
//   useEffect(() => {
//     async function fetchData() {
//       const res = await fetch(`/api/mixes/${leadId}`);
//       const data = await res.json();

//       // יש תמהילים קיימים
//       if (data.mixes?.length > 0) {
//         setMixes(data.mixes);
//         setActiveMixId(data.mixes[0].id);
//         return;
//       }

//       // אין תמהילים -> יוצרים תמהיל ברירת מחדל
//       const defaultMixId = crypto.randomUUID();
//       const defaultLoans: Loan[] = Array.from({ length: 3 }, () => defaultLoan(defaultMixId));

//       const defaultMix: Mix = {
//         id: defaultMixId,
//         mix_name: "משכנתא נוכחית",
//         loans: defaultLoans,
//         is_base: true, // ✅ תמהיל בסיסי
//       };

//       setMixes([defaultMix]);
//       setActiveMixId(defaultMixId);
//     }

//     fetchData();
//   }, [leadId]);



// const activeMix = mixes.find((m) => m.id === activeMixId);

//   // 🔹 Active and compare mix

//   //const compareMix = useMemo(() => mixes.find((m) => m.id === compareMixId), [mixes, compareMixId]);

//   // 🔹 Reset compareMix when active changes
//   useEffect(() => setCompareMixId(null), [activeMixId]);

//   // 🔹 Add Mix
//   const addMix = () => {
//     const newMix: Mix = {
//       id: crypto.randomUUID(),
//       mix_name: "תמהיל חדש",
//       loans: [],
//     };
//     setMixes((prev) => [...prev, newMix]);
//     setActiveMixId(newMix.id);
//   };

//   // 🔹 Delete Mix

//   const deleteMix = (id: string) => {
//     const mix = mixes.find(m => m.id === id);
//     if (!mix || mix.is_base) return; // ❌ אי אפשר למחוק תמהיל בסיסי

//     const remaining = mixes.filter(m => m.id !== id);
//     setMixes(remaining);
//     setActiveMixId(remaining.length ? remaining[0].id : null);
//   };


//   // 🔹 Save Mixes
//   const handleSave = async () => {
//     setIsSaving(true);
//     setSuccessMessage(null);
//     setErrorMessage(null);

//     try {
//       const res = await fetch(`/api/mixes/save`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ client_id: leadId, mixes }),
//       });
//       const data = await res.json();

//       if (data.success) {
//         setSuccessMessage("✅ התיק נשמר בהצלחה!");
//         setTimeout(() => setSuccessMessage(null), 3000);
//       } else {
//         setErrorMessage(`❌ שגיאה: ${data.error}`);
//         setTimeout(() => setErrorMessage(null), 5000);
//       }
//     } catch (err) {
//       setErrorMessage("❌ קרתה שגיאה ברשת");
//       setTimeout(() => setErrorMessage(null), 5000);
//     } finally {
//       setIsSaving(false);
//     }
//   };
//  // 🔹 שכפול תמהיל קיים (עם מזהים חדשים)


//   // 🔹 שכפול תמהיל קיים (עם מזהים חדשים)
//   const duplicateMix = () => {
//     if (!activeMixId) return;
//     const mixToCopy = mixes.find(m => m.id === activeMixId);
//     if (!mixToCopy) return;

//     const duplicatedLoans = mixToCopy.loans?.map(l => ({ ...l, id: crypto.randomUUID() })) || [];

//     const duplicatedMix: Mix = {
//       ...mixToCopy,
//       id: crypto.randomUUID(),
//       mix_name: `${mixToCopy.mix_name} (העתק)`,
//       loans: duplicatedLoans,
//       is_base: false, // ✅ ההעתק לא בסיסי
//     };

//     setMixes(prev => [...prev, duplicatedMix]);
//     setActiveMixId(duplicatedMix.id);
//   };


//   // 🔹 Menu positioning
//   const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//     const rect = e.currentTarget.getBoundingClientRect();
//     setMenuPosition({
//       top: rect.top,
//       left: rect.left - 140,
//     });
//     setOpenMenuId(openMenuId === id ? null : id);
//   };


//   // פתיחת תמהיל משולב
//   const openModal = () => {
    
//       setIsUnifiedSchedulelOpen(true);
//     };

//   // יוצר תמהיל חדש עם 3 הלוואות ריקות
//     const createDefaultMix = (): Mix => {
//       const mixId = crypto.randomUUID();

//       const loans: Loan[] = Array.from({ length: 3 }, () => defaultLoan(mixId));

//       return {
//         id: mixId,
//         mix_name: "משכנתא נוכחית",
//         loans,
//         is_base: true,
//       };
//     };



// const createMix = (name = "תמהיל חדש"): Mix => {
//   const mixId = crypto.randomUUID();

//   const loans: Loan[] = Array.from({ length: 3 }, () => ({
//     id: crypto.randomUUID(),
//     mix_id: mixId,
//     path_id: 0,
//     grace_type_id: 1,
//     amortization_schedule_id: 1,
//     amount: 0,
//     rate: 0,
//     months: 0,
//   }));

//   return { id: mixId, mix_name: name, loans };


// const defaultMix = createMix("משכנתא נוכחית");

// };


//   return (
//     <div className="p-6" ref={containerRef}>
//       {/* Header + Inflation + Compare + Save + Modal */}
//       <div className="flex items-center gap-4 mb-4 flex-wrap">
//         <h1 className="text-2xl font-bold">סימולטור לליד {leadId}</h1>

//         {/* אינפלציה */}
//         <div className="flex items-center gap-2">
//           <label className="text-sm font-medium text-gray-700">אינפלציה שנתית צפויה:</label>
//           <input
//             type="number"
//             step="0.1"
//             value={annualInflation}
//             onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
//             className={`${fieldClasses} w-20`}
//           />
//           <span className="text-sm text-gray-600">חודשי: {(annualInflation / 12).toFixed(3)}%</span>
//         </div>

//         {/* תמהיל להשוואה */}
//         {activeMix && (
//           <div className="flex items-center gap-2">
//             <label className="text-sm font-medium text-gray-700">תמהיל להשוואה:</label>
//             <select
//               value={compareMixId ?? ""}
//               onChange={(e) => setCompareMixId(e.target.value || null)}
//               className={fieldClasses}
//             >
//               <option value="">בחר תמהיל להשוואה</option>
//               {mixes
//                 .filter((m) => m.id !== activeMixId)
//                 .map((m) => (
//                   <option key={m.id} value={m.id}>
//                     {m.mix_name}
//                   </option>
//                 ))}
//             </select>
//           </div>
//         )}

//         {/* כפתורי שמירה ולוח סילוקין */}
//         <div className="relative flex items-center gap-2">
//           {/* כפתור שמירה*/}
//           <button
//             onClick={handleSave}
//             disabled={isSaving}
//             className={`h-9 px-4 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition flex items-center justify-center gap-2 ${
//               isSaving ? "opacity-70 cursor-not-allowed" : ""
//             }`}
//           >
//             {isSaving && (
//               <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
//             )}
//             שמור שינויים
//           </button>
//           {/* כפתור שכפול תמהיל */}
//           {activeMixId && (
//             <button
//               onClick={duplicateMix}
//               className="h-9 px-4 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition flex items-center justify-center gap-2"
//             >
//               ⧉ שכפל
//             </button>
//           )}
          
//           <button
//             className="h-9 px-4 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition flex items-center justify-center gap-2"
//             onClick={() => openModal()}
//           >
//             לוח סילוקין לתמהיל
//           </button>


//           {(successMessage || errorMessage) && (
//             <div
//               className={`absolute top-full mt-2 p-2 rounded text-white text-sm shadow-lg ${
//                 successMessage ? "bg-green-600" : "bg-red-600"
//               }`}
//             >
//               {successMessage || errorMessage}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="flex gap-2 mb-4 overflow-x-auto">
//         {mixes.map((m) => (
//           <div
//             key={m.id}
//             className={`relative flex items-center px-3 py-0.5 rounded-t-lg shadow-sm cursor-pointer transition ${
//               m.id === activeMixId
//                 ? "bg-purple-600 text-white"
//                 : "bg-gray-300 text-gray-800 hover:bg-gray-400"
//             }`}
//             onClick={() => setActiveMixId(m.id)}
//           >
//             {editingId === m.id ? (
//               <input
//                 type="text"
//                 value={m.mix_name}
//                 autoFocus
//                 onClick={(e) => e.stopPropagation()}
//                 onChange={(e) =>
//                   setMixes((prev) =>
//                     prev.map((x) =>
//                       x.id === m.id ? { ...x, mix_name: e.target.value } : x
//                     )
//                   )
//                 }
//                 onBlur={() => setEditingId(null)}
//                 className="px-2 py-0.5 rounded border focus:outline-none focus:ring-2 focus:ring-purple-400 text-black"
//               />
//             ) : (
//               <span className="font-medium">{m.mix_name}</span>
//             )}
//             <div className="ml-1 relative" onClick={(e) => e.stopPropagation()}>
//               <button
//                 className="px-1.5 py-0.5 rounded hover:bg-white/20"
//                 onClick={(e) => openMenu(m.id, e)}
//               >
//                 ⋮
//               </button>
//             </div>
//           </div>
//         ))}

//         <button
//           onClick={addMix}
//           className="px-3 py-0.5 rounded-t-lg shadow-sm bg-green-600 text-white hover:bg-green-700 transition"
//         >
//           +
//         </button>
//       </div>

//       {/* Dropdown Menu */}
//       {openMenuId && (
//         <div
//           className="fixed w-32 bg-white border rounded shadow-lg z-[9999]"
//           style={{ top: menuPosition.top, left: menuPosition.left }}
//         >
//           <div className="flex justify-end items-center px-2 py-1 border-b">
//             <button onClick={() => setOpenMenuId(null)} className="text-gray-500 hover:text-red-600">
//               ✖
//             </button>
//           </div>
//           <button
//             onClick={() => {
//               setEditingId(openMenuId);
//               setOpenMenuId(null);
//             }}
//             className="block w-full text-right px-3 py-2 hover:bg-gray-100"
//           >
//             ✏ ערוך
//           </button>
//           <button
//             onClick={() => {
//               deleteMix(openMenuId);
//             }}
//             className="block w-full text-right px-3 py-2 text-red-600 hover:bg-red-100"
//           >
//             🗑 מחק
//           </button>
//         </div>
//       )}

//       {/* Loan Table */}
//       {activeMix && (
//         <div className="border rounded shadow w-full flex flex-col bg-white">
//           <div className="p-4 flex-1 bg-gray-50">
//             {!loading && (
//               <LoanTable
//                 loans={activeMix.loans || []}
//                 paths={loanPaths}
//                 annualInflation={annualInflation}
//                 setAnnualInflation={setAnnualInflation}
//                 onChange={(newLoans) =>
//                   setMixes((prev) =>
//                     prev.map((m) => (m.id === activeMix.id ? { ...m, loans: newLoans } : m))
//                   )
//                 }
//               />
//             )}
//           </div>
//           <div className="p-2 border-t bg-gray-100 text-sm text-gray-600 text-right hidden">
//             ID של התמהיל: {activeMix.id}
//           </div>
//         </div>
//       )}

//       {/* Totals + Chart */}
//       <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
//         <div className="bg-blue-100 rounded shadow p-4"> 
//             <MixComparisonTable
//               activeMixId={activeMixId}
//               mixes={mixes}
//               annualInflation={annualInflation}
//               compareMixId={compareMixId}
//             />          
//         </div>
//         <div className="bg-green-100 p-4 rounded shadow">
//             <MixScheduleChartSVG
//                 activeMixId={activeMixId}
//                 mixes={mixes}
//                 annualInflation={annualInflation}
//               />
//       </div>
       
//       </div>

//       {isUnifiedSchedule && (
//           <UnifiedScheduleModal
//             activeMixId={activeMixId}
//             mixes={mixes}
//             annualInflation={annualInflation}
//             onClose={() => setIsUnifiedSchedulelOpen(false)}
//           />
//         )}

//     </div>
//   );
// }













































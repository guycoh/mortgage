"use client"
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import LoanTable, { Loan } from "../components/LoanTable";
import { useLoanPaths } from "@/app/data/hooks/useLoanPaths";

import UnifiedScheduleModal from "../components/UnifiedScheduleModal";
import MixComparisonTable from "../components/MixComparisonTable";






type Mix = {
  id: string;
  mix_name: string;
  loans?: Loan[];
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

  const fieldClasses =
    "h-9 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-orange-100";

  // 🔹 Fetch data
  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/mixes/${leadId}`);
      const data = await res.json();
      setMixes(data.mixes || []);
      if (data.mixes?.length) setActiveMixId(data.mixes[0].id);
    }
    fetchData();
  }, [leadId]);

  // 🔹 Active and compare mix
  const activeMix = useMemo(() => mixes.find((m) => m.id === activeMixId), [mixes, activeMixId]);
  //const compareMix = useMemo(() => mixes.find((m) => m.id === compareMixId), [mixes, compareMixId]);

  // 🔹 Reset compareMix when active changes
  useEffect(() => setCompareMixId(null), [activeMixId]);

  // 🔹 Add Mix
  const addMix = () => {
    const newMix: Mix = {
      id: crypto.randomUUID(),
      mix_name: "תמהיל חדש",
      loans: [],
    };
    setMixes((prev) => [...prev, newMix]);
    setActiveMixId(newMix.id);
  };

  // 🔹 Delete Mix
  const deleteMix = (id: string) => {
    setMixes((prev) => prev.filter((m) => m.id !== id));
    const remaining = mixes.filter((m) => m.id !== id);
    setActiveMixId(remaining.length ? remaining[0].id : null);
    if (openMenuId === id) setOpenMenuId(null);
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

  // 🔹 Menu positioning
  const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      left: rect.left - 140,
    });
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // 🔹 Totals
  // 🔹 Totals
// const allTotals = useMemo(() => {
//   return mixes.map((mix) => {
//     return calculateMixTotals(mix.loans || [], true, annualInflation, mix.id);
//   });
// }, [mixes, annualInflation]);

// פתיחת תמהיל משולב
const openModal = () => {
  
    setIsUnifiedSchedulelOpen(true);
  };



  return (
    <div className="p-6" ref={containerRef}>
      {/* Header + Inflation + Compare + Save + Modal */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h1 className="text-2xl font-bold">סימולטור לליד {leadId}</h1>

        {/* אינפלציה */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">אינפלציה שנתית צפויה:</label>
          <input
            type="number"
            step="0.1"
            value={annualInflation}
            onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
            className={`${fieldClasses} w-20`}
          />
          <span className="text-sm text-gray-600">חודשי: {(annualInflation / 12).toFixed(3)}%</span>
        </div>

        {/* תמהיל להשוואה */}
        {activeMix && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">תמהיל להשוואה:</label>
            <select
              value={compareMixId ?? ""}
              onChange={(e) => setCompareMixId(e.target.value || null)}
              className={fieldClasses}
            >
              <option value="">בחר תמהיל להשוואה</option>
              {mixes
                .filter((m) => m.id !== activeMixId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.mix_name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* כפתורי שמירה ולוח סילוקין */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`h-9 px-4 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition flex items-center justify-center gap-2 ${
              isSaving ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSaving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            שמור שינויים
          </button>

          <button
            className="h-9 px-4 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition flex items-center justify-center gap-2"
            onClick={() => openModal()}
          >
            לוח סילוקין לתמהיל
          </button>

          {(successMessage || errorMessage) && (
            <div
              className={`absolute top-full mt-2 p-2 rounded text-white text-sm shadow-lg ${
                successMessage ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {successMessage || errorMessage}
            </div>
          )}
        </div>
      </div>


      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {mixes.map((m) => (
          <div
            key={m.id}
            className={`relative flex items-center px-3 py-0.5 rounded-t-lg shadow-sm cursor-pointer transition ${
              m.id === activeMixId ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveMixId(m.id)}
          >
            {editingId === m.id ? (
              <input
                type="text"
                value={m.mix_name}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setMixes((prev) => prev.map((x) => (x.id === m.id ? { ...x, mix_name: e.target.value } : x)))
                }
                onBlur={() => setEditingId(null)}
                className="px-2 py-0.5 rounded border focus:outline-none focus:ring-2 focus:ring-purple-400 text-black"
              />
            ) : (
              <span className="font-medium">{m.mix_name}</span>
            )}
            <div className="ml-1 relative" onClick={(e) => e.stopPropagation()}>
              <button className="px-1.5 py-0.5 rounded hover:bg-white/20" onClick={(e) => openMenu(m.id, e)}>
                ⋮
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addMix}
          className="px-3 py-0.5 rounded-t-lg shadow-sm bg-green-600 text-white hover:bg-green-700 transition"
        >
          +
        </button>
      </div>

      {/* Dropdown Menu */}
      {openMenuId && (
        <div
          className="fixed w-32 bg-white border rounded shadow-lg z-[9999]"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <div className="flex justify-end items-center px-2 py-1 border-b">
            <button onClick={() => setOpenMenuId(null)} className="text-gray-500 hover:text-red-600">
              ✖
            </button>
          </div>
          <button
            onClick={() => {
              setEditingId(openMenuId);
              setOpenMenuId(null);
            }}
            className="block w-full text-right px-3 py-2 hover:bg-gray-100"
          >
            ✏ ערוך
          </button>
          <button
            onClick={() => {
              deleteMix(openMenuId);
            }}
            className="block w-full text-right px-3 py-2 text-red-600 hover:bg-red-100"
          >
            🗑 מחק
          </button>
        </div>
      )}

      {/* Loan Table */}
      {activeMix && (
        <div className="border rounded shadow w-full flex flex-col bg-white">
          <div className="p-4 flex-1 bg-gray-50">
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
          <div className="p-2 border-t bg-gray-100 text-sm text-gray-600 text-right hidden">
            ID של התמהיל: {activeMix.id}
          </div>
        </div>
      )}

      {/* Totals + Chart */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-blue-100 rounded shadow p-4">
 
<MixComparisonTable
  activeMixId={activeMixId}
  mixes={mixes}
  annualInflation={annualInflation}
  compareMixId={compareMixId}
/>



          
        </div>
        <div className="bg-green-100 p-4 rounded shadow">
       
  
        
        
        
        
        
        </div>
       
      </div>

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


 {/* <MixSummary
            activeMixId={activeMixId}
            compareMixId={compareMixId}
            mixes={mixes}
          /> */}
        


































// "use client"

// import { useState, useEffect, useRef } from "react";
// import { useParams } from "next/navigation";
// import LoanTable, { Loan } from "../components/LoanTable";
// import { useLoanPaths } from "@/app/data/hooks/useLoanPaths";

// //חישובים להשוואת תמהילים
// import { calculateAllMixTotals } from "../components/calculate/mixCalculators";
// import MixTotals from "../components/MixTotals";

// import MergedScheduleChart from "../components/MergedScheduleChart";
// import { mergeSchedulesForMix } from "../components/calculate/mergeSchedulesForMix";




// type Mix = {
//   id: string;
//   mix_name: string;
//   loans?: Loan[];
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

//   const containerRef = useRef<HTMLDivElement>(null);

//   // 🔹 state חדש לאינפלציה
//   const [annualInflation, setAnnualInflation] = useState<number>(2.8);

//   // להביא לי רשימת תמהילים להשוואה
//   const [compareMixId, setCompareMixId] = useState<string | null>(null);
//   const compareMix = mixes.find((m) => m.id === compareMixId);
// ;
//  // לשמירת התיק
//   const [isSaving, setIsSaving] = useState(false);
//   const [successMessage, setSuccessMessage] = useState<string | null>(null);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);





// const fieldClasses =
//   "h-9 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-orange-100";


//   useEffect(() => {
//     async function fetchData() {
//       const res = await fetch(`/api/mixes/${leadId}`);
//       const data = await res.json();
//       setMixes(data.mixes || []);
//       if (data.mixes?.length) setActiveMixId(data.mixes[0].id);
//     }
//     fetchData();
//   }, [leadId]);

//   const activeMix = mixes.find((m) => m.id === activeMixId);

//   const addMix = () => {
//     const newMix: Mix = {
//       id: crypto.randomUUID(),
//       mix_name: "תמהיל חדש",
//       loans: [],
//     };
//     setMixes((prev) => [...prev, newMix]);
//     setActiveMixId(newMix.id);
//   };

// // איפוס compareMixId כשעוברים תמהיל
// useEffect(() => {
//   setCompareMixId(null);
// }, [activeMixId]);








//   const deleteMix = (id: string) => {
//     setMixes((prev) => prev.filter((m) => m.id !== id));
//     const remaining = mixes.filter((m) => m.id !== id);
//     setActiveMixId(remaining.length ? remaining[0].id : null);
//     if (openMenuId === id) setOpenMenuId(null);
//   };
//   //שמירת התיק
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
//         // נעלם אחרי 3 שניות
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
 
// // מחשב את המיקום של התפריט ביחס לטאב (תמיד משמאל)
// const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//   const rect = e.currentTarget.getBoundingClientRect();
//   setMenuPosition({ 
//     top: rect.top,            // יישר לגובה של הכרטיסייה
//     left: rect.left - 140     // 140px שמאלה (אפשר לשנות לפי הרוחב של התפריט שלך)
//   });
//   setOpenMenuId(openMenuId === id ? null : id);
// };

// const allTotals = calculateAllMixTotals(
//   mixes.flatMap((m) => m.loans || []),
//   true, // isIndexed
//   annualInflation
// );


//   return (
//     <div className="p-6" ref={containerRef}>
//       {/* כותרת + שדה אינפלציה */}     
//      <div className="flex items-center gap-4 mb-4">
//         <h1 className="text-2xl font-bold">סימולטור לליד {leadId}</h1>
//         <div className="flex items-center gap-2">
//           <label className="text-sm font-medium text-gray-700">
//             אינפלציה שנתית צפויה:
//           </label>
//           <input
//             type="number"
//             step="0.1"
//             value={annualInflation}
//             onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
//             className={`${fieldClasses} w-20`}
//           />
//           <span className="text-sm text-gray-600">
//             חודשי: {(annualInflation / 12).toFixed(3)}%
//           </span>

//           {activeMix && (
//             <div>
//               <label className="text-sm font-medium text-gray-700 mr-2">
//                 תמהיל להשוואה :
//               </label>
//               <select
//                 value={compareMixId ?? ""}
//                 onChange={(e) => setCompareMixId(e.target.value || null)}
//                 className={fieldClasses}
//               >
//                 <option value="">בחר תמהיל להשוואה</option>
//                 {mixes
//                   .filter((m) => m.id !== activeMixId)
//                   .map((m) => (
//                     <option key={m.id} value={m.id}>
//                       {m.mix_name}
//                     </option>
//                   ))}
//               </select>
//             </div>
//           )}
      
      
//       {/* שמור שינויים */}
//      <div className="relative inline-block">
//       <button
//         onClick={handleSave}
//         disabled={isSaving}
//         className={`h-9 px-4 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition flex items-center justify-center gap-2 ${
//           isSaving ? "opacity-70 cursor-not-allowed" : ""
//         }`}
//       >
//         {isSaving && (
//           <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
//         )}
//         שמור שינויים
//       </button>

//       {/* הודעת הצלחה / שגיאה */}
//       {(successMessage || errorMessage) && (
//         <div
//           className={`absolute top-full mt-2 p-2 rounded text-white text-sm shadow-lg ${
//             successMessage ? "bg-green-600" : "bg-red-600"
//           }`}
//         >
//           {successMessage || errorMessage}
//         </div>
//       )}
//     </div>
     
//         </div>   
//         {/* הודעת הצלחה / שגיאה */}
//         {(successMessage || errorMessage) && (
//           <div
//             className={`absolute top-full mt-2 p-2 rounded text-white text-sm shadow-lg ${
//               successMessage ? "bg-green-600" : "bg-red-600"
//             }`}
//           >
//             {successMessage || errorMessage}
//           </div>
//         )}
   
   
   
   
   
   
   
   
//      </div>
  
//       {/* Tabs */}
//       <div className="flex gap-2 mb-4 overflow-x-auto">
//         {mixes.map((m) => (
//           <div
//             key={m.id}
//             className={`relative flex items-center px-3 py-0.5 rounded-t-lg shadow-sm cursor-pointer transition 
//               ${
//                 m.id === activeMixId
//                   ? "bg-purple-600 text-white"
//                   : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//               }`}
//             onClick={() => setActiveMixId(m.id)}
//           >
//             {/* שם התמהיל או עריכה */}
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

//             {/* Dropdown Menu Button */}
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

//         {/* כפתור + בסוף ה־Tabs */}
//         <button
//           onClick={addMix}
//           className="px-3 py-0.5 rounded-t-lg shadow-sm bg-green-600 text-white hover:bg-green-700 transition"
//         >
//           +
//         </button>
//       </div>

//       {/* Dropdown Menu שמוצג משמאל לכרטיסיה */}
//       {openMenuId && (
//         <div
//           className="fixed w-32 bg-white border rounded shadow-lg z-[9999]"
//           style={{
//             top: menuPosition.top,
//             left: menuPosition.left,
//           }}
//         >
//           {/* שורת סגירה עם כפתור X בלבד */}
//           <div className="flex justify-end items-center px-2 py-1 border-b">
//             <button
//               onClick={() => setOpenMenuId(null)}
//               className="text-gray-500 hover:text-red-600"
//             >
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

//       {/* טבלה */}
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
//                     prev.map((m) =>
//                       m.id === activeMix.id ? { ...m, loans: newLoans } : m
//                     )
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


//   <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
//           {/* תיבה 1 */}
//           <div className="bg-blue-100  rounded shadow">
//                   <MixTotals
//             totals={allTotals}
//             mixes={mixes}
//             activeMixId={activeMixId}
//             compareMixId={compareMixId}
//           />
//           </div>

//           {/* תיבה 2 */}
//           <div className="bg-green-100 p-4 rounded shadow">
        
//           </div>

//           {/* תיבה 3 */}
//           <div className="bg-yellow-100 p-4 rounded shadow">
//             תוכן 3
//           </div>
//     </div>




//     </div>
//   );
// }
















"use client"

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import LoanTable, { Loan } from "../components/LoanTable";
import { useLoanPaths } from "@/app/data/hooks/useLoanPaths";

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

  const containerRef = useRef<HTMLDivElement>(null);

  // 🔹 state חדש לאינפלציה
  const [annualInflation, setAnnualInflation] = useState<number>(2.8);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/mixes/${leadId}`);
      const data = await res.json();
      setMixes(data.mixes || []);
      if (data.mixes?.length) setActiveMixId(data.mixes[0].id);
    }
    fetchData();
  }, [leadId]);

  const activeMix = mixes.find((m) => m.id === activeMixId);

  const addMix = () => {
    const newMix: Mix = {
      id: crypto.randomUUID(),
      mix_name: "תמהיל חדש",
      loans: [],
    };
    setMixes((prev) => [...prev, newMix]);
    setActiveMixId(newMix.id);
  };

  const deleteMix = (id: string) => {
    setMixes((prev) => prev.filter((m) => m.id !== id));
    const remaining = mixes.filter((m) => m.id !== id);
    setActiveMixId(remaining.length ? remaining[0].id : null);
    if (openMenuId === id) setOpenMenuId(null);
  };

  const handleSave = async () => {
    const res = await fetch(`/api/mixes/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: leadId, mixes }),
    });
    const data = await res.json();
    alert(data.success ? "✅ נשמר בהצלחה!" : `❌ שגיאה: ${data.error}`);
  };

 
// מחשב את המיקום של התפריט ביחס לטאב (תמיד משמאל)
const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  setMenuPosition({ 
    top: rect.top,            // יישר לגובה של הכרטיסייה
    left: rect.left - 140     // 140px שמאלה (אפשר לשנות לפי הרוחב של התפריט שלך)
  });
  setOpenMenuId(openMenuId === id ? null : id);
};


  return (
    <div className="p-6" ref={containerRef}>
      {/* כותרת + שדה אינפלציה */}
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">סימולטור לליד {leadId}</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">אינפלציה שנתית צפויה:</label>
          <input
            type="number"
            step="0.1"
            value={annualInflation}
            onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <span className="text-sm text-gray-600">
            חודשי: {(annualInflation / 12).toFixed(3)}%
          </span>
          <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
          >
            שמור שינויים      
          </button>
          
        </div>
      </div>

     
      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {mixes.map((m) => (
          <div
            key={m.id}
            className={`relative flex items-center px-3 py-0.5 rounded-t-lg shadow-sm cursor-pointer transition 
              ${
                m.id === activeMixId
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            onClick={() => setActiveMixId(m.id)}
          >
            {/* שם התמהיל או עריכה */}
            {editingId === m.id ? (
              <input
                type="text"
                value={m.mix_name}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setMixes((prev) =>
                    prev.map((x) =>
                      x.id === m.id ? { ...x, mix_name: e.target.value } : x
                    )
                  )
                }
                onBlur={() => setEditingId(null)}
                className="px-2 py-0.5 rounded border focus:outline-none focus:ring-2 focus:ring-purple-400 text-black"
              />
            ) : (
              <span className="font-medium">{m.mix_name}</span>
            )}

            {/* Dropdown Menu Button */}
            <div className="ml-1 relative" onClick={(e) => e.stopPropagation()}>
              <button
                className="px-1.5 py-0.5 rounded hover:bg-white/20"
                onClick={(e) => openMenu(m.id, e)}
              >
                ⋮
              </button>
            </div>
          </div>
        ))}

        {/* כפתור + בסוף ה־Tabs */}
        <button
          onClick={addMix}
          className="px-3 py-0.5 rounded-t-lg shadow-sm bg-green-600 text-white hover:bg-green-700 transition"
        >
          +
        </button>
      </div>

      {/* Dropdown Menu שמוצג משמאל לכרטיסיה */}
      {openMenuId && (
        <div
          className="fixed w-32 bg-white border rounded shadow-lg z-[9999]"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {/* שורת סגירה עם כפתור X בלבד */}
          <div className="flex justify-end items-center px-2 py-1 border-b">
            <button
              onClick={() => setOpenMenuId(null)}
              className="text-gray-500 hover:text-red-600"
            >
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

      {/* טבלה */}
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
                    prev.map((m) =>
                      m.id === activeMix.id ? { ...m, loans: newLoans } : m
                    )
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
    </div>
  );
}




















// "use client";

// import { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import LoanTable, { Loan } from "../components/LoanTable";

// type Mix = {
//   id: string;
//   mix_name: string;
//   loans?: Loan[];
// };

// type LoanPath = {
//   id: number;
//   name: string;
//   indexed: boolean;
// };

// export default function SimulatorPage() {
//   const params = useParams();
//   const leadId = Number(params.id);

//   const [mixes, setMixes] = useState<Mix[]>([]);
//   const [activeMixId, setActiveMixId] = useState<string | null>(null);
//   const [loanPaths, setLoanPaths] = useState<LoanPath[]>([]);

//   // טעינת נתונים מה-API
  
// useEffect(() => {
//   async function fetchData() {
//     const res = await fetch(`/api/mixes/${leadId}`);
//     const data = await res.json();
//     setMixes(data.mixes || []);
//     if (data.mixes?.length) setActiveMixId(data.mixes[0].id);

//     const pathsRes = await fetch(`/api/loan_paths`);
//     const pathsData = await pathsRes.json();
//     setLoanPaths(pathsData || []);
//   }
//   fetchData();
// }, [leadId]);

//   const activeMix = mixes.find((m) => m.id === activeMixId);

//   function addMix() {
//     const newMix: Mix = {
//       id: crypto.randomUUID(),
//       mix_name: "תמהיל חדש",
//       loans: [],
//     };
//     setMixes((prev) => [...prev, newMix]);
//     setActiveMixId(newMix.id);
//   }

//   function deleteMix(id: string) {
//     setMixes((prev) => prev.filter((m) => m.id !== id));
//     const remaining = mixes.filter((m) => m.id !== id);
//     setActiveMixId(remaining.length ? remaining[0].id : null);
//   }

//   async function handleSave() {
//     const response = await fetch(`/api/mixes/save`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         client_id: leadId,
//         mixes,
//       }),
//     });
//     const data = await response.json();
//     if (data.success) {
//       alert("✅ נשמר בהצלחה!");
//     } else {
//       alert("❌ שגיאה: " + data.error);
//     }
//   }

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">סימולטור לליד {leadId}</h1>

//       <div className="flex gap-2 mb-4">
//         <button
//           onClick={addMix}
//           className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
//         >
//           + הוסף תמהיל
//         </button>
//         <button
//           onClick={handleSave}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
//         >
//           שמור שינויים
//         </button>
//         {activeMix && (
//           <button
//             onClick={() => deleteMix(activeMix.id)}
//             className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
//           >
//             מחק תמהיל
//           </button>
//         )}
//       </div>

//       {/* כרטיסיות תמהילים */}
//       <div className="flex gap-2 mb-4 overflow-x-auto">
//         {mixes.map((m) => (
//           <button
//             key={m.id}
//             onClick={() => setActiveMixId(m.id)}
//             className={`px-4 py-2 rounded-t ${
//               m.id === activeMixId
//                 ? "bg-purple-600 text-white"
//                 : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//             } transition`}
//           >
//             {m.mix_name || "תמהיל ללא שם"}
//           </button>
//         ))}
//       </div>

//       {activeMix && (
//         <div className="border rounded shadow w-full flex flex-col">
//           <div className="p-4 border-b flex items-center justify-between">
//             <span className="font-medium">שם תמהיל:</span>
//             <input
//               type="text"
//               value={activeMix.mix_name}
//               onChange={(e) =>
//                 setMixes((prev) =>
//                   prev.map((m) =>
//                     m.id === activeMix.id
//                       ? { ...m, mix_name: e.target.value }
//                       : m
//                   )
//                 )
//               }
//               className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
//             />
//           </div>

//           <div className="p-4 flex-1 bg-gray-50">
//             <LoanTable
//               loans={activeMix.loans || []}
//               paths={loanPaths}
//               onChange={(newLoans) =>
//                 setMixes((prev) =>
//                   prev.map((m) =>
//                     m.id === activeMix.id ? { ...m, loans: newLoans } : m
//                   )
//                 )
//               }
//             />
//           </div>

//           <div className="p-2 border-t bg-gray-100 text-sm text-gray-600 text-right">
//             ID של התמהיל: {activeMix.id}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }









// "use client";

// import { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import LoanTable from "../components/LoanTable";

// type Mix = {
//   id: string;
//   mix_name: string;
// };

// export default function SimulatorPage() {
//   const params = useParams();
//   const leadId = params.id as string;

//   const [mixes, setMixes] = useState<Mix[]>([]);
//   const [activeMixId, setActiveMixId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);

//   // טוען את התמהילים מה-DB
//   useEffect(() => {
//     async function fetchMixes() {
//       setLoading(true);
//       try {
//         const res = await fetch(`/api/mixes/${leadId}`);
//         const data = await res.json();
//         if (Array.isArray(data)) {
//           setMixes(data);
//           setActiveMixId(data.length ? data[0].id : null);
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchMixes();
//   }, [leadId]);

//   function addMix() {
//     const newMix: Mix = {
//       id: crypto.randomUUID(),
//       mix_name: "תמהיל חדש",
//     };
//     setMixes((prev) => [...prev, newMix]);
//     setActiveMixId(newMix.id);
//   }

//   function deleteMix(id: string) {
//     setMixes((prev) => prev.filter((mix) => mix.id !== id));
//     const remaining = mixes.filter((mix) => mix.id !== id);
//     setActiveMixId(remaining.length ? remaining[0].id : null);
//   }

//   async function handleSave() {
//     const response = await fetch("/api/mixes/save", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         lead_id: Number(leadId),
//         mixes,
//       }),
//     });

//     const data = await response.json();
//     if (data.success) {
//       alert("✅ נשמר בהצלחה!");
//     } else {
//       alert("❌ שגיאה: " + data.error);
//     }
//   }

//   const activeMix = mixes.find((mix) => mix.id === activeMixId);

//   if (loading) return <p>טוען תמהילים...</p>;

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">סימולטור לליד {leadId}</h1>

//       <div className="flex gap-2 mb-4">
//         <button onClick={addMix} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
//           + הוסף תמהיל
//         </button>
//         <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
//           שמור שינויים
//         </button>
//         {activeMix && (
//           <button onClick={() => deleteMix(activeMix.id)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">
//             מחק תמהיל
//           </button>
//         )}
//       </div>

//       <div className="flex gap-2 mb-4 overflow-x-auto">
//         {mixes.map((mix) => (
//           <button
//             key={mix.id}
//             onClick={() => setActiveMixId(mix.id)}
//             className={`px-4 py-2 rounded-t ${
//               mix.id === activeMixId ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//             } transition`}
//           >
//             {mix.mix_name || "תמהיל ללא שם"}
//           </button>
//         ))}
//       </div>

//       {activeMix && (
//         <div className="border rounded shadow w-full flex flex-col">
//           <div className="p-4 border-b flex items-center justify-between">
//             <span className="font-medium">שם תמהיל:</span>
//             <input
//               type="text"
//               value={activeMix.mix_name}
//               onChange={(e) =>
//                 setMixes((prev) =>
//                   prev.map((m) => (m.id === activeMix.id ? { ...m, mix_name: e.target.value } : m))
//                 )
//               }
//               className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
//             />
//           </div>

//           <div className="p-4 flex-1 bg-gray-50 min-h-[150px]">
//             <p className="text-gray-400 text-center">שטח לטבלה / קומפוננט</p>
         
   
         
         
//           </div>

//           <div className="p-2 border-t bg-gray-100 text-sm text-gray-600 text-right">
//             ID של התמהיל: {activeMix.id}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




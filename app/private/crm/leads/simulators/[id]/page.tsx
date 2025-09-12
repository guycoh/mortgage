"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type Mix = {
  id: string;
  mix_name: string;
};

export default function SimulatorPage() {
  const params = useParams();
  const leadId = params.id as string;

  const [mixes, setMixes] = useState<Mix[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // טוען את התמהילים מה-DB
  useEffect(() => {
    async function fetchMixes() {
      setLoading(true);
      try {
        const res = await fetch(`/api/mixes/${leadId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMixes(data);
          setActiveMixId(data.length ? data[0].id : null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchMixes();
  }, [leadId]);

  function addMix() {
    const newMix: Mix = {
      id: crypto.randomUUID(),
      mix_name: "תמהיל חדש",
    };
    setMixes((prev) => [...prev, newMix]);
    setActiveMixId(newMix.id);
  }

  function deleteMix(id: string) {
    setMixes((prev) => prev.filter((mix) => mix.id !== id));
    const remaining = mixes.filter((mix) => mix.id !== id);
    setActiveMixId(remaining.length ? remaining[0].id : null);
  }

  async function handleSave() {
    const response = await fetch("/api/mixes/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: Number(leadId),
        mixes,
      }),
    });

    const data = await response.json();
    if (data.success) {
      alert("✅ נשמר בהצלחה!");
    } else {
      alert("❌ שגיאה: " + data.error);
    }
  }

  const activeMix = mixes.find((mix) => mix.id === activeMixId);

  if (loading) return <p>טוען תמהילים...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">סימולטור לליד {leadId}</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={addMix} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
          + הוסף תמהיל
        </button>
        <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
          שמור שינויים
        </button>
        {activeMix && (
          <button onClick={() => deleteMix(activeMix.id)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">
            מחק תמהיל
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {mixes.map((mix) => (
          <button
            key={mix.id}
            onClick={() => setActiveMixId(mix.id)}
            className={`px-4 py-2 rounded-t ${
              mix.id === activeMixId ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            } transition`}
          >
            {mix.mix_name || "תמהיל ללא שם"}
          </button>
        ))}
      </div>

      {activeMix && (
        <div className="border rounded shadow w-full flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <span className="font-medium">שם תמהיל:</span>
            <input
              type="text"
              value={activeMix.mix_name}
              onChange={(e) =>
                setMixes((prev) =>
                  prev.map((m) => (m.id === activeMix.id ? { ...m, mix_name: e.target.value } : m))
                )
              }
              className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="p-4 flex-1 bg-gray-50 min-h-[150px]">
            <p className="text-gray-400 text-center">שטח לטבלה / קומפוננט</p>
          </div>

          <div className="p-2 border-t bg-gray-100 text-sm text-gray-600 text-right">
            ID של התמהיל: {activeMix.id}
          </div>
        </div>
      )}
    </div>
  );
}






// "use client"

// import { useState, useEffect } from "react";
// import { useParams } from "next/navigation";

// type Mix = {
//   id: string;
//   mix_name: string;
// };

// export default function SimulatorPage() {
//   const params = useParams();
//   const leadId = params.id as string;

//   const [mixes, setMixes] = useState<Mix[]>([]);
//   const [activeMixId, setActiveMixId] = useState<string | null>(null);

//   useEffect(() => {
//     // בעתיד: טען מה־DB לפי leadId
//     const initialMixes: Mix[] = [
//       { id: crypto.randomUUID(), mix_name: "תמהיל ראשון" },
//       { id: crypto.randomUUID(), mix_name: "תמהיל שני" },
//     ];
//     setMixes(initialMixes);
//     setActiveMixId(initialMixes[0].id);
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
//     try {
//       const response = await fetch("/api/mixes/save", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           lead_id: Number(leadId), // ✅ חשוב: lead_id ולא client_id
//           mixes,
//         }),
//       });

//       const data = await response.json();
//       console.log("🔎 Response from API:", data);

//       if (data.success) {
//         alert("✅ נשמר בהצלחה ב-Supabase!");
//       } else {
//         alert("❌ שגיאה: " + data.error);
//       }
//     } catch (err: any) {
//       console.error("Save error:", err);
//       alert("❌ שגיאה בשרת: " + err.message);
//     }
//   }

//   const activeMix = mixes.find((mix) => mix.id === activeMixId);

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

//       {/* כרטיסיות */}
//       <div className="flex gap-2 mb-4 overflow-x-auto">
//         {mixes.map((mix) => (
//           <button
//             key={mix.id}
//             onClick={() => setActiveMixId(mix.id)}
//             className={`px-4 py-2 rounded-t ${
//               mix.id === activeMixId
//                 ? "bg-purple-600 text-white"
//                 : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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

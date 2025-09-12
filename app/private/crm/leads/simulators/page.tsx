// "use client";

// import { useState } from "react";

// export default function AddMixForm() {
//   const [mixName, setMixName] = useState("");
//   const [leadId, setLeadId] = useState("5"); // 👈 שים כאן id של ליד קיים
//   const [message, setMessage] = useState("");

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();

//     const res = await fetch("/api/mixes", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         id: crypto.randomUUID(),
//         mix_name: mixName,
//         lead_id: leadId,
//       }),
//     });

//     const data = await res.json();

//     if (res.ok) {
//       setMessage("✅ נשמר בהצלחה!");
//       setMixName("");
//     } else {
//       setMessage("❌ שגיאה: " + data.error);
//     }
//   }

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className="p-4 border rounded shadow max-w-md mx-auto mt-6"
//     >
//       <h2 className="text-xl font-bold mb-4">הוסף תמהיל</h2>

//       <div className="mb-3">
//         <label className="block mb-1 font-medium">שם תמהיל:</label>
//         <input
//           type="text"
//           value={mixName}
//           onChange={(e) => setMixName(e.target.value)}
//           className="border px-2 py-1 rounded w-full"
//           required
//         />
//       </div>

//       <div className="mb-3">
//         <label className="block mb-1 font-medium">Lead ID:</label>
//         <input
//           type="text"
//           value={leadId}
//           onChange={(e) => setLeadId(e.target.value)}
//           className="border px-2 py-1 rounded w-full"
//           required
//         />
//       </div>

//       <button
//         type="submit"
//         className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
//       >
//         שמור
//       </button>

//       {message && <p className="mt-3 text-sm">{message}</p>}
//     </form>
//   );
// }















"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type Mix = {
  id: string;
  mix_name: string;
  lead_id?: string;
};

export default function SimulatorPage() {
  const params = useParams();
  const leadId = params.id as string;

  const [mixes, setMixes] = useState<Mix[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // שליפת התמהילים מה־API
  useEffect(() => {
    async function fetchMixes() {
      try {
        const res = await fetch(`/api/mixes/${leadId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMixes(data);
          if (data.length > 0) {
            setActiveMixId(data[0].id);
          }
        }
      } catch (err) {
        console.error("שגיאה בשליפת תמהילים:", err);
      }
    }

    fetchMixes();
  }, [leadId]);

  // הוספת תמהיל חדש
  function addMix() {
    const newMix: Mix = {
      id: crypto.randomUUID(),
      mix_name: "תמהיל חדש",
      lead_id: leadId,
    };
    setMixes((prev) => [...prev, newMix]);
    setActiveMixId(newMix.id);
  }

  // מחיקת תמהיל
  function removeMix(id: string) {
    setMixes((prev) => prev.filter((mix) => mix.id !== id));
    if (activeMixId === id && mixes.length > 1) {
      setActiveMixId(mixes[0].id);
    } else if (mixes.length === 1) {
      setActiveMixId(null);
    }
  }

  // עדכון שם תמהיל
  function updateMixName(id: string, newName: string) {
    setMixes((prev) =>
      prev.map((mix) => (mix.id === id ? { ...mix, mix_name: newName } : mix))
    );
  }

  // שמירה ל־API → Supabase
  async function saveMixes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/mixes/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mixes }),
      });

      const data = await res.json();
      console.log("נשמר בהצלחה:", data);
      alert("התמהילים נשמרו בהצלחה!");
    } catch (err) {
      console.error("שגיאה בשמירה:", err);
      alert("שגיאה בשמירת התמהילים");
    } finally {
      setLoading(false);
    }
  }

  const activeMix = mixes.find((mix) => mix.id === activeMixId);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">סימולטור לליד {leadId}</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={addMix}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
        >
          + הוסף תמהיל
        </button>

        <button
          onClick={saveMixes}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? "שומר..." : "💾 שמור"}
        </button>
      </div>

      {/* כרטיסיות */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {mixes.map((mix) => (
          <div key={mix.id} className="flex items-center gap-1">
            <button
              onClick={() => setActiveMixId(mix.id)}
              className={`px-4 py-2 rounded-t ${
                mix.id === activeMixId
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } transition`}
            >
              {mix.mix_name || "תמהיל ללא שם"}
            </button>
            <button
              onClick={() => removeMix(mix.id)}
              className="text-red-500 text-sm px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* תוכן הכרטיסיה הפעילה */}
      {activeMix && (
        <div className="border rounded shadow w-full flex flex-col">
          {/* כותרת ועריכת שם תמהיל */}
          <div className="p-4 border-b flex items-center justify-between">
            <span className="font-medium">שם תמהיל:</span>
            <input
              type="text"
              value={activeMix.mix_name}
              onChange={(e) => updateMixName(activeMix.id, e.target.value)}
              className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* שטח לקומפוננט / טבלה */}
          <div className="p-4 flex-1 bg-gray-50 min-h-[150px]">
            <p className="text-gray-400 text-center">שטח לטבלה / קומפוננט</p>
          </div>

          {/* ID בתחתית */}
          <div className="p-2 border-t bg-gray-100 text-sm text-gray-600 text-right">
            ID של התמהיל: {activeMix.id}
          </div>
        </div>
      )}
    </div>
  );
 }

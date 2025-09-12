"use client"

import { useState } from "react";
import LoanTable from "./add/LoanTable";

type Mix = {
  id: string;
  name: string;
};

export default function Page() {
  // ערכים קבועים ללקוח
  const clientId = 2;
  const clientName = "גיא";

  // אינפלציה
  const [annualInflation, setAnnualInflation] = useState<number>(0);
  const monthlyInflation =
    annualInflation > 0
      ? (Math.pow(1 + annualInflation / 100, 1 / 12) - 1) * 100
      : 0;

  // תמהילים
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [newMixName, setNewMixName] = useState("");

  // פונקציה שמוסיפה תמהיל חדש
  const addMix = () => {
    if (!newMixName.trim()) return;

    const newMix: Mix = { id: crypto.randomUUID(), name: newMixName.trim() };
    setMixes((prev) => [...prev, newMix]);
    setActiveMixId(newMix.id);
    setNewMixName("");
  };

  return (
    <div className="p-6 w-full bg-white rounded-2xl shadow-lg px-4 md:px-8">
  {/* שורה עליונה */}
  <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
    <div className="text-lg font-semibold text-gray-800">
      {clientName} (ID: {clientId})
    </div>

    <div className="flex items-center gap-2">
      <label className="font-medium">אינפלציה שנתית (%):</label>
      <input
        type="number"
        value={annualInflation}
        onChange={(e) =>
          setAnnualInflation(parseFloat(e.target.value) || 0)
        }
        className="w-24 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-center"
      />
    </div>

    <div className="text-gray-700">
      <span className="font-medium">חודשית:</span>{" "}
      <span className="text-orange-600 font-bold">
        {monthlyInflation.toFixed(3)}%
      </span>
    </div>
  </div>

  {/* הוספת כרטיסיות */}
  <div className="flex flex-col md:flex-row items-center gap-2 mb-4">
    <input
      type="text"
      placeholder="שם תמהיל חדש"
      value={newMixName}
      onChange={(e) => setNewMixName(e.target.value)}
      className="p-2 border rounded-lg flex-1"
    />
    <button
      onClick={addMix}
      className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
    >
      הוסף תמהיל
    </button>
  </div>

  {/* כרטיסיות */}
  <div className="border-b mb-4 flex flex-wrap gap-2">
    {mixes.map((mix) => (
      <button
        key={mix.id}
        onClick={() => setActiveMixId(mix.id)}
        className={`px-4 py-2 rounded-t-lg font-medium ${
          activeMixId === mix.id
            ? "bg-orange-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {mix.name}
      </button>
    ))}
  </div>

  {/* תוכן הכרטיסייה הפעילה */}
  {activeMixId && (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-xl font-semibold mb-2">
        {mixes.find((m) => m.id === activeMixId)?.name}
      </h3>
      <LoanTable
        clientId={clientId}
        mixId={activeMixId}
        monthlyInflation={monthlyInflation}
      />
    </div>
  )}
</div>

  );
}

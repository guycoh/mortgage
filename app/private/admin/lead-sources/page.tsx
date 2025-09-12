"use client";

import { useState, useEffect } from "react";
import { useLeadSource, Source } from "@/app/data/hooks/useLeadSource";

export default function LeadSourcesPage() {
  const { sources, loading, error, addSource, updateSource, deleteSource } =
    useLeadSource();

  const [newSource, setNewSource] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    console.log("Updated sources:", sources);
  }, [sources]);

  const handleAdd = async () => {
  if (!newSource.trim()) return;
  const added = await addSource(newSource.trim());
  if (added) {
    setNewSource(""); // ✅ איפוס השדה אחרי הוספה
  }
};

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;
    try {
      await updateSource(id, editingValue.trim());
      setEditingId(null);
      setEditingValue("");
    } catch {
      alert("שמירה נכשלה");
    }
  };

  if (loading) return <p className="p-6">טוען...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ניהול מקורות לידים</h1>

      {/* טופס הוספה */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="שם מקור חדש..."
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-orange-400"
        />
        <button
          onClick={handleAdd}
          disabled={!newSource.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          הוסף
        </button>
      </div>

      {/* טבלה */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 bg-white rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-right min-w-[60px]">#</th>
              <th className="p-2 text-right">שם המקור</th>
              <th className="p-2 text-right">תאריך יצירה</th>
              <th className="p-2 text-center">פעולות</th>
            </tr>
          </thead>
        <tbody>
        {sources.filter(Boolean).map((s: Source, i) => (
          <tr key={s.id ?? `source-${i}`} className="border-t">
            <td className="p-2">{s.id}</td>
            <td className="p-2">
              {editingId === s.id ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              ) : (
                s.source
              )}
            </td>
            <td className="p-2 text-sm text-gray-500">
              {s.created_at
                ? new Date(s.created_at).toLocaleDateString("he-IL")
                : "-"}
            </td>
            <td className="p-2 flex justify-center gap-2">
                        {editingId === s.id ? (
                          <>
                            <button
                              onClick={() => handleSave(s.id!)}
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                              שמור
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingValue("");
                              }}
                              className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                            >
                              ביטול
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(s.id!);
                                setEditingValue(s.source);
                              }}
                              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                            >
                              ערוך
                            </button>
                            <button
                              onClick={() => deleteSource(s.id!)}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              מחק
                            </button>
                          </>
                        )}
                      </td>
          </tr>
        ))}
      </tbody>

        </table>
      </div>
    </div>
  );
}


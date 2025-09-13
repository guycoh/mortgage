"use client";

import { useState, useEffect } from "react";
import { useLoanPaths, LoanPath } from "@/app/data/hooks/useLoanPaths";

export default function LoanPathsPage() {
  const { paths, loading, error, addPath, updatePath, deletePath } = useLoanPaths();

  const [newId, setNewId] = useState<number | "">("");
  const [newPath, setNewPath] = useState("");
  const [newIndexed, setNewIndexed] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingIndexed, setEditingIndexed] = useState(false);

  const handleAdd = async () => {
    if (!newPath.trim() || newId === "") return;
    const added = await addPath(newPath.trim(), newIndexed);
    if (added) {
      setNewPath("");
      setNewId("");
      setNewIndexed(false);
    }
  };

  const handleSave = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      await updatePath(id, editingName.trim(), editingIndexed);
      setEditingId(null);
      setEditingName("");
      setEditingIndexed(false);
    } catch {
      alert("שמירה נכשלה");
    }
  };

  if (loading) return <p className="p-6">טוען...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ניהול מסלולי הלוואה</h1>

      {/* טופס הוספה */}
      <div className="flex gap-2 mb-6 items-center">
        <input
          type="number"
          placeholder="ID"
          value={newId}
          onChange={(e) => setNewId(Number(e.target.value))}
          className="w-20 border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-orange-200 focus:bg-orange-50 transition-colors"
        />
        <input
          type="text"
          placeholder="שם מסלול חדש..."
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-orange-200 focus:bg-orange-50 transition-colors"
        />
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={newIndexed}
            onChange={(e) => setNewIndexed(e.target.checked)}
            className="w-4 h-4"
          />
          צמוד מדד
        </label>
        <button
          onClick={handleAdd}
          disabled={newPath.trim() === "" || newId === ""}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          הוסף
        </button>
      </div>

      {/* טבלה */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 bg-white rounded-lg overflow-hidden shadow">
          <thead className="text-white bg-gray-800">
            <tr>
              <th className="p-2 text-right min-w-[60px]">#</th>
              <th className="p-2 text-right">שם המסלול</th>
              <th className="p-2 text-center">צמוד מדד</th>
              <th className="p-2 text-right">תאריך יצירה</th>
              <th className="p-2 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {paths.filter(Boolean).map((p: LoanPath, i) => (
              <tr key={p.id ?? `path-${i}`} className="border-t">
                <td className="p-2">{p.id}</td>
                <td className="p-2">
                  {editingId === p.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    p.name
                  )}
                </td>
                <td className="p-2 text-center">
                  {editingId === p.id ? (
                    <input
                      type="checkbox"
                      checked={editingIndexed}
                      onChange={(e) => setEditingIndexed(e.target.checked)}
                    />
                  ) : (
                    <input type="checkbox" checked={p.is_indexed} readOnly />
                  )}
                </td>
                <td className="p-2 text-sm text-gray-500">
                  {p.created_at
                    ? new Date(p.created_at).toLocaleDateString("he-IL")
                    : "-"}
                </td>
                <td className="p-2 flex justify-center gap-2">
                  {editingId === p.id ? (
                    <>
                      <button
                        onClick={() => handleSave(p.id!)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                      >
                        שמור
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                          setEditingIndexed(false);
                        }}
                        className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 transition"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(p.id!);
                          setEditingName(p.name);
                          setEditingIndexed(p.is_indexed);
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => deletePath(p.id!)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
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

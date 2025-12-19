/**
 * 📍 מיקום:
 * app/sign/forms/new/page.tsx
 *
 * 🎯 תפקיד:
 * יצירת טופס חדש:
 * - העלאת PDF
 * - הזנת שם טופס
 * - מעבר למסך בניית תבנית (שדות + חתימות)
 */

"use client"

import { useState } from "react";

export default function NewFormPage() {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !name) return alert("חסר שם או קובץ");

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);


const res = await fetch("/sign/forms/api/upload", {
  method: "POST",
  body: formData,
});

const data = await res.json(); // ✅ פעם אחת בלבד

if (!res.ok) {
  alert(data.error || "Upload failed");
  return;
}

const { formId } = data;

// ➡️ מעבר לבניית התבנית
window.location.href = `/sign/forms/${formId}/template`;


   };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">הוספת טופס חדש</h1>

      <label className="block mb-4">
        <span className="block mb-1">שם הטופס</span>
        <input
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="block mb-6">
        <span className="block mb-1">קובץ PDF</span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-black text-white px-6 py-2 rounded"
      >
        {loading ? "מעלה..." : "המשך לבניית תבנית"}
      </button>
    </div>
  );
}

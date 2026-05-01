// /app/private/crm/leads/import/components/UploadBox.tsx

"use client";

import { useState } from "react";
import { useLeadsImport } from "../hooks/useLeadsImport";
import MappingTable from "./MappingTable";
import PreviewTable from "./PreviewTable";
import UploadProgress from "./UploadProgress";



export default function UploadBox() {
 const {
  headers,
  preview,
  mapping,      // 👈 תוסיף את זה
  setMapping,
  handleFile,
  generatePreview,
  uploadLeads,
  progress,
  status,

} = useLeadsImport();

  const [fileType, setFileType] = useState<"csv" | "excel" | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* 🧠 בחירת פורמט */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setFileType("csv")}
          className={`px-6 py-2 rounded-xl border transition ${
            fileType === "csv"
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white hover:bg-orange-50"
          }`}
        >
          CSV
        </button>

        <button
          onClick={() => setFileType("excel")}
          className={`px-6 py-2 rounded-xl border transition ${
            fileType === "excel"
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white hover:bg-orange-50"
          }`}
        >
          Excel
        </button>
      </div>

      {/* 📂 אזור העלאה */}
      <div className="border-2 border-dashed rounded-2xl p-10 text-center hover:border-orange-400 transition">
        <label className="cursor-pointer flex flex-col items-center gap-3">
          <span className="text-lg font-semibold text-gray-700">
            העלה קובץ {fileType === "csv" ? "CSV" : fileType === "excel" ? "Excel" : ""}
          </span>

          <span className="text-sm text-gray-400">
            לחץ לבחירה או גרור קובץ לכאן
          </span>

          <input
            type="file"
            accept={fileType === "csv" ? ".csv" : ".xlsx"}
            className="hidden"
            disabled={!fileType}
            onChange={(e) => handleFile(e.target.files?.[0]!)}
          />

          <div className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition">
            בחר קובץ
          </div>
        </label>
      </div>

      {/* 🧩 Mapping */}
      {headers.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h2 className="text-xl font-bold">מיפוי שדות</h2>
          <MappingTable
            headers={headers}
            setMapping={setMapping}
            mapping={mapping}
            />
        </div>
      )}

      {/* 👀 Preview */}
      <div className="flex justify-center gap-4">
        {/* תצוגה מקדימה */}
        <button
            onClick={generatePreview}
            disabled={!Object.keys(mapping || {}).length}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl disabled:opacity-40"
        >
            תצוגה מקדימה
        </button>

        {/* ייבוא לידים */}
        <button
            onClick={uploadLeads}
            disabled={!preview.length || status === "uploading"}
            className="px-6 py-2 bg-orange-500 text-white rounded-xl shadow hover:bg-orange-600 transition disabled:opacity-40"
        >
            🚀 ייבוא לידים
        </button>
      </div>

{status !== "idle" && (
  <UploadProgress progress={progress} status={status} />
)}


      {preview.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h2 className="text-xl font-bold">תצוגה מקדימה</h2>
          <PreviewTable data={preview} />
        </div>
      )}

    </div>
  );
}
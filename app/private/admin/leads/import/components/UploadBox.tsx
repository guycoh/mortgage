// /app/private/admin/leads/import/components/UploadBox.tsx


"use client";

import { useState, useEffect } from "react";
import { useLeadsImport } from "../hooks/useLeadsImport";
import MappingTable from "./MappingTable";
import PreviewTable from "./PreviewTable";
import UploadProgress from "./UploadProgress";

export default function UploadBox() {
  const {
    headers,
    preview,
    mapping,
    setMapping,
    handleFile,
    generatePreview,
    uploadLeads,
    progress,
    status,
  } = useLeadsImport();

  const [fileType, setFileType] = useState<"csv" | "excel" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // 🔥 חסימת drag/drop ברמת הדפדפן
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();

    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);

    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  const onFileSelect = (file: File) => {
    setFileName(file.name);
    handleFile(file);
  };

  const removeFile = () => {
    setFileName(null);
    setMapping({});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* 🧠 בחירת פורמט */}
      <div className="flex gap-4 justify-center items-center">
        <button
          onClick={() => setFileType("csv")}
          className={`px-6 py-2 rounded-xl border ${
            fileType === "csv"
              ? "bg-orange-500 text-white"
              : "bg-white hover:bg-orange-50"
          }`}
        >
          CSV
        </button>

        <button
          onClick={() => setFileType("excel")}
          className={`px-6 py-2 rounded-xl border ${
            fileType === "excel"
              ? "bg-orange-500 text-white"
              : "bg-white hover:bg-orange-50"
          }`}
        >
          Excel
        </button>

        {fileName && (
          <button
            onClick={removeFile}
            className="text-xs text-red-500 hover:underline"
          >
            הסר קובץ
          </button>
        )}
      </div>

      {/* 📂 אזור העלאה */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition ${
          dragActive
            ? "border-orange-500 bg-orange-50"
            : "hover:border-orange-400"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);

          const file = e.dataTransfer.files?.[0];
          if (file) onFileSelect(file);
        }}
      >
        <label className="cursor-pointer flex flex-col items-center gap-3">

          {/* אין קובץ */}
          {!fileName && (
            <>
              <span className="text-lg font-semibold text-gray-700">
                העלה קובץ {fileType === "csv" ? "CSV" : fileType === "excel" ? "Excel" : ""}
              </span>

              <span className="text-sm text-gray-400">
                גרור קובץ לכאן או לחץ לבחירה
              </span>

              <div className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600">
                בחר קובץ
              </div>
            </>
          )}

          {/* יש קובץ */}
          {fileName && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl">📄</div>
              <p className="font-semibold text-gray-800">{fileName}</p>
              <p className="text-xs text-gray-400">הקובץ נטען בהצלחה</p>
            </div>
          )}

          <input
            type="file"
            accept={fileType === "csv" ? ".csv" : ".xlsx"}
            className="hidden"
            disabled={!fileType}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
        </label>
      </div>

      {/* 🧩 Mapping */}
      {headers.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="text-xl font-bold mb-4">מיפוי שדות</h2>
          <MappingTable
            headers={headers}
            setMapping={setMapping}
            mapping={mapping}
          />
        </div>
      )}

      {/* 👀 פעולות */}
      <div className="flex justify-center gap-4">
        <button
          onClick={generatePreview}
          disabled={!Object.keys(mapping || {}).length}
          className="px-6 py-2 bg-gray-900 text-white rounded-xl disabled:opacity-40"
        >
          תצוגה מקדימה
        </button>

        <button
          onClick={uploadLeads}
          disabled={!preview.length || status === "uploading"}
          className="px-6 py-2 bg-orange-500 text-white rounded-xl disabled:opacity-40"
        >
          {status === "uploading" ? "מעלה..." : "🚀 ייבוא לידים"}
        </button>
      </div>

      {/* progress */}
      {status !== "idle" && (
        <UploadProgress progress={progress} status={status} />
      )}

      {/* preview */}
      {preview.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="text-xl font-bold mb-4">תצוגה מקדימה</h2>
          <PreviewTable data={preview} />
        </div>
      )}
    </div>
  );
}


















// "use client";

// import { useState } from "react";
// import { useLeadsImport } from "../hooks/useLeadsImport";
// import MappingTable from "./MappingTable";
// import PreviewTable from "./PreviewTable";
// import UploadProgress from "./UploadProgress";



// export default function UploadBox() {
//  const {
//   headers,
//   preview,
//   mapping,      // 👈 תוסיף את זה
//   setMapping,
//   handleFile,
//   generatePreview,
//   uploadLeads,
//   progress,
//   status,

// } = useLeadsImport();

//   const [fileType, setFileType] = useState<"csv" | "excel" | null>(null);
//   const [fileName, setFileName] = useState<string | null>(null);
//   const [dragActive, setDragActive] = useState(false);


// const onFileSelect = (file: File) => {
//   setFileName(file.name);
//   handleFile(file);
// };





//   return (
//     <div className="max-w-4xl mx-auto space-y-8">

//       {/* 🧠 בחירת פורמט */}
//       <div className="flex gap-4 justify-center">
//         <button
//           onClick={() => setFileType("csv")}
//           className={`px-6 py-2 rounded-xl border transition ${
//             fileType === "csv"
//               ? "bg-orange-500 text-white border-orange-500"
//               : "bg-white hover:bg-orange-50"
//           }`}
//         >
//           CSV
//         </button>

//         <button
//           onClick={() => setFileType("excel")}
//           className={`px-6 py-2 rounded-xl border transition ${
//             fileType === "excel"
//               ? "bg-orange-500 text-white border-orange-500"
//               : "bg-white hover:bg-orange-50"
//           }`}
//         >
//           Excel
//         </button>


// <button
//   onClick={() => setFileName(null)}
//   className="text-xs text-red-500 hover:underline"
// >
//   הסר קובץ
// </button>








//       </div>

//       {/* 📂 אזור העלאה */}
//       <div
//         className={`border-2 border-dashed rounded-2xl p-10 text-center transition ${
//           dragActive
//             ? "border-orange-500 bg-orange-50"
//             : "hover:border-orange-400"
//         }`}
//         onDragOver={(e) => {
//           e.preventDefault();
//           setDragActive(true);
//         }}
//         onDragLeave={() => setDragActive(false)}
//         onDrop={(e) => {
//           e.preventDefault();
//           setDragActive(false);
//           const file = e.dataTransfer.files?.[0];
//           if (file) {
//             onFileSelect(file);
//           }
//         }}
//       >
//         <label className="cursor-pointer flex flex-col items-center gap-3">

//           {/* 📄 אם אין קובץ */}
//           {!fileName && (
//             <>
//               <span className="text-lg font-semibold text-gray-700">
//                 העלה קובץ {fileType === "csv" ? "CSV" : fileType === "excel" ? "Excel" : ""}
//               </span>

//               <span className="text-sm text-gray-400">
//                 גרור קובץ לכאן או לחץ לבחירה
//               </span>
//             </>
//           )}

//           {/* ✅ אם יש קובץ */}
//           {fileName && (
//             <div className="flex flex-col items-center gap-2">
//               <div className="text-4xl">📄</div>
//               <p className="font-semibold text-gray-800">{fileName}</p>
//               <p className="text-xs text-gray-400">הקובץ נטען בהצלחה</p>
//             </div>
//           )}

//           <input
//             type="file"
//             accept={fileType === "csv" ? ".csv" : ".xlsx"}
//             className="hidden"
//             disabled={!fileType}
//             onChange={(e) => {
//               const file = e.target.files?.[0];
//               if (file) onFileSelect(file);
//             }}
//           />

//           {!fileName && (
//             <div className="px-5 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition">
//               בחר קובץ
//             </div>
//           )}

//         </label>
//       </div>

//       {/* 🧩 Mapping */}
//       {headers.length > 0 && (
//         <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
//           <h2 className="text-xl font-bold">מיפוי שדות</h2>
//           <MappingTable
//             headers={headers}
//             setMapping={setMapping}
//             mapping={mapping}
//             />
//         </div>
//       )}

//       {/* 👀 Preview */}
//       <div className="flex justify-center gap-4">
//         {/* תצוגה מקדימה */}
//         <button
//             onClick={generatePreview}
//             disabled={!Object.keys(mapping || {}).length}
//             className="px-6 py-2 bg-gray-900 text-white rounded-xl disabled:opacity-40"
//         >
//             תצוגה מקדימה
//         </button>

//         {/* ייבוא לידים */}
//         <button
//             onClick={uploadLeads}
//             disabled={!preview.length || status === "uploading"}
//             className="px-6 py-2 bg-orange-500 text-white rounded-xl shadow hover:bg-orange-600 transition disabled:opacity-40"
//         >
//             🚀 ייבוא לידים
//         </button>
//       </div>

// {status !== "idle" && (
//   <UploadProgress progress={progress} status={status} />
// )}


//       {preview.length > 0 && (
//         <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
//           <h2 className="text-xl font-bold">תצוגה מקדימה</h2>
//           <PreviewTable data={preview} />
//         </div>
//       )}

//     </div>
//   );
// }
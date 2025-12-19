// app/sign/forms/[formId]/template/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TemplatePage() {
  const { formId } = useParams();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      const res = await fetch(`/sign/forms/api/get-pdf?formId=${formId}`);
      const data = await res.json();
      setPdfUrl(data.url);
    };

    loadPdf();
  }, [formId]);

  if (!pdfUrl) {
    return <p className="p-6">טוען PDF…</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">
        Template Builder – {formId}
      </h1>

      <div className="border rounded overflow-hidden h-[85vh]">
        <iframe
          src={pdfUrl}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}


















// "use client";

// import { useParams } from "next/navigation";
// import { useEffect, useRef, useState } from "react";

// // סוגי שדות אפשריים
// type FieldType = "signature" | "text" | "email";

// interface Field {
//   id: string;
//   type: FieldType;
//   x: number;
//   y: number;
//   page: number;
// }

// export default function TemplatePage() {
//   const { formId } = useParams();
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [pdfUrl, setPdfUrl] = useState<string | null>(null);
//   const [fields, setFields] = useState<Field[]>([]);
//   const [selectedType, setSelectedType] = useState<FieldType>("signature");

//   // טען את PDF מהשרת
//   useEffect(() => {
//     // לדוגמה, קובץ ה-PDF ב-Supabase public bucket
//     const url = `/api/get-pdf?formId=${formId}`;
//     setPdfUrl(url);
//   }, [formId]);

//   // הוספת שדה בלחיצה
//   const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const x = ((e.clientX - rect.left) / rect.width) * 100; // אחוזים
//     const y = ((e.clientY - rect.top) / rect.height) * 100;

//     const newField: Field = {
//       id: crypto.randomUUID(),
//       type: selectedType,
//       x,
//       y,
//       page: 1, // בגרסה בסיסית יש דף אחד
//     };

//     setFields((prev) => [...prev, newField]);
//   };

//   // שמירה
//   const handleSave = async () => {
//     try {
//       const res = await fetch(`/sign/forms/api/save-template`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ formId, fields }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Error saving template");

//       alert("Template saved!");
//     } catch (err: any) {
//       alert(err.message);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6">
//       <h1 className="text-2xl font-bold mb-4">Template Builder: {formId}</h1>

//       {/* בחירת סוג השדה */}
//       <div className="flex gap-4 mb-4">
//         {(["signature", "text", "email"] as FieldType[]).map((type) => (
//           <button
//             key={type}
//             onClick={() => setSelectedType(type)}
//             className={`px-4 py-2 rounded ${
//               selectedType === type ? "bg-blue-600 text-white" : "bg-gray-200"
//             }`}
//           >
//             {type}
//           </button>
//         ))}
//       </div>

//       {/* PDF canvas */}
//       <div className="border relative">
//         <canvas
//           ref={canvasRef}
//           className="w-full h-[600px] cursor-crosshair"
//           onClick={handleCanvasClick}
//         />
//         {fields.map((f) => (
//           <div
//             key={f.id}
//             className={`absolute w-8 h-8 rounded-full ${
//               f.type === "signature" ? "bg-red-500" : "bg-green-500"
//             }`}
//             style={{
//               left: `${f.x}%`,
//               top: `${f.y}%`,
//               transform: "translate(-50%, -50%)",
//             }}
//           />
//         ))}
//       </div>

//       <button
//         onClick={handleSave}
//         className="mt-4 px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
//       >
//         שמור תבנית
//       </button>
//     </div>
//   );
// }

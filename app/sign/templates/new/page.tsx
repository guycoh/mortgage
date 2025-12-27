// app/sign/templates/new/page.tsx
"use client"
import { useEffect, useRef, useState } from "react";
import PdfIframe from "@/app/sign/components/PdfIframe";
import TemplateOverlay, {
  FieldType,
  TemplateFieldData,
} from "../../components/TemplateOverlay";

type Form = { id: string; title: string; file_path: string };




export default function NewTemplatePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  const [fields, setFields] = useState<TemplateFieldData[]>([]);
  const [selectedFieldType, setSelectedFieldType] =
    useState<FieldType>("name");

  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);



  useEffect(() => {
    fetch("/sign/api/forms")
      .then((res) => res.json())
      .then((data) => setForms(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (!selectedFormId) return;
    const form = forms.find((f) => f.id === selectedFormId);
    if (form) {
      setPdfUrl(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forms/${form.file_path}`
      );
    }
  }, [selectedFormId, forms]);

  const addField = () => {
    setFields((prev) => [
      ...prev,
     {
        id: crypto.randomUUID(),
        type: selectedFieldType,
        page: currentPage,
        x: 20,
        y: 20,
      }
    ]);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">יצירת תבנית חדשה</h1>

      {/* בחירת טופס */}
      <select
        className="border rounded px-3 py-2 w-full max-w-md"
        value={selectedFormId}
        onChange={(e) => setSelectedFormId(e.target.value)}
      >
        <option value="">בחר טופס</option>
        {forms.map((f) => (
          <option key={f.id} value={f.id}>
            {f.title}
          </option>
        ))}
      </select>

      {/* כלי עבודה */}
      <div className="flex gap-4 items-center">
        <select
          value={selectedFieldType}
          onChange={(e) =>
            setSelectedFieldType(e.target.value as FieldType)
          }
          className="border px-2 py-1 rounded"
        >
          <option value="name">שם</option>
          <option value="id">ת"ז</option>
          <option value="email">מייל</option>
          <option value="signature">חתימה</option>
        </select>

        <button
          onClick={addField}
          className="px-4 py-1 bg-blue-600 text-white rounded"
        >
          הוסף שדה
        </button>

        {/* Zoom */}
        <div className="flex gap-2">
          <button onClick={() => setScale((s) => s - 0.1)}>➖</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => s + 0.1)}>➕</button>
        </div>
      </div>

<div className="flex gap-2 items-center">
  <button
    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
    className="px-2 border rounded"
  >
    ◀
  </button>

  <span>עמוד {currentPage}</span>

  <button
    onClick={() => setCurrentPage((p) => p + 1)}
    className="px-2 border rounded"
  >
    ▶
  </button>
</div>

      {pdfUrl && (
        <div
          ref={containerRef}
          className="relative border mx-auto"
          style={{ width: "800px" }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
            <PdfIframe url={pdfUrl} />

            <TemplateOverlay
              fields={fields}
              setFields={setFields}
              containerRef={containerRef}
              scale={scale}
              currentPage={currentPage}
            />





          </div>
        </div>
      )}
    </div>
  );
}























// import { useEffect, useState } from "react";
// import PdfIframe from "@/app/sign/components/PdfIframe";


// import TemplateOverlay
// , {
//   TemplateField,
//   FieldType,
// } from "../../components/TemplateOverlay";

// import DragOverlay from "../../components/DragOverlay";

// type Form = { id: string; title: string; file_path: string };



// type Field = {
//   id: string;
//   type: FieldType;
//   x: number; // באחוזים
//   y: number;
// };


// export default function NewTemplatePage() {
//   const [forms, setForms] = useState<Form[]>([]);
//   const [selectedFormId, setSelectedFormId] = useState("");
//   const [pdfUrl, setPdfUrl] = useState("");

//   const [fields, setFields] = useState<Field[]>([]);
//   const [selectedFieldType, setSelectedFieldType] =
//     useState<FieldType>("name");





//   useEffect(() => {
//     const fetchForms = async () => {
//       const res = await fetch("/sign/api/forms");
//       const data = await res.json();
//       setForms(Array.isArray(data) ? data : []);
//     };
//     fetchForms();
//   }, []);

  
// useEffect(() => {
//   if (!selectedFormId) return;

//   const form = forms.find((f) => f.id === selectedFormId);
//   if (form) {
//     // כאן מוסיפים את שם ה-bucket לפני ה-file_path
//     const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forms/${form.file_path}`;
//     setPdfUrl(url);
//   }
// }, [selectedFormId, forms]);


//   return (
//     <div className="p-6 space-y-6">
//       <h1 className="text-2xl font-bold">יצירת תבנית חדשה</h1>

//       <select
//         className="border rounded px-3 py-2 w-full max-w-md"
//         value={selectedFormId}
//         onChange={(e) => setSelectedFormId(e.target.value)}
//       >
//         <option value="">בחר טופס</option>
//         {forms.map((f) => (
//           <option key={f.id} value={f.id}>
//             {f.title}
//           </option>
//         ))}
//       </select>

//       <select
//         value={selectedFieldType}
//         onChange={(e) =>
//           setSelectedFieldType(e.target.value as FieldType)
//         }
//         className="border px-2 py-1 rounded"
//       >
//         <option value="name">שם</option>
//         <option value="id">ת"ז</option>
//         <option value="email">מייל</option>
//         <option value="signature">חתימה</option>
//       </select>

// {pdfUrl && (
//   <div className="relative w-full max-w-4xl border">
//     <PdfIframe url={pdfUrl} />


// {/* Overlay */}
//   <div className="absolute inset-0">
//     <DragOverlay />
//   </div>


//   </div>
// )}

//     </div>
//   );
// }



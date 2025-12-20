// app/sign/templates/new/page.tsx

"use client";

import { useEffect, useState } from "react";
import PdfIframe from "@/app/sign/components/PdfIframe";

type Form = { id: string; title: string; file_path: string };

export default function NewTemplatePage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    const fetchForms = async () => {
      const res = await fetch("/sign/api/forms");
      const data = await res.json();
      setForms(Array.isArray(data) ? data : []);
    };
    fetchForms();
  }, []);

  
useEffect(() => {
  if (!selectedFormId) return;

  const form = forms.find((f) => f.id === selectedFormId);
  if (form) {
    // כאן מוסיפים את שם ה-bucket לפני ה-file_path
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forms/${form.file_path}`;
    setPdfUrl(url);
  }
}, [selectedFormId, forms]);








  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">יצירת תבנית חדשה</h1>

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

      {pdfUrl && (
        <>
          <div className="border mt-4">
            <PdfIframe url={pdfUrl} />
          </div>

          {/* שדה URL לקריאה בלבד */}
          <div className="mt-2">
            <label className="block mb-1 font-medium">URL של הקובץ:</label>
            <input
              type="text"
              value={pdfUrl}
              readOnly
              className="w-full border px-2 py-1 text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}



// "use client";

// import { useEffect, useState } from "react";

// import PdfViewer from "../../components/pdfViewer";


// type Form = {
//   id: string;
//   title: string;
// };

// export default function NewTemplatePage() {
//   const [forms, setForms] = useState<Form[]>([]);
//   const [selectedFormId, setSelectedFormId] = useState("");
//   const [pdfUrl, setPdfUrl] = useState("");

//   // טפסים
//   useEffect(() => {
//     fetch("/sign/api/forms")
//       .then(res => res.json())
//       .then(setForms);
//   }, []);

//   // PDF של הטופס
//   useEffect(() => {
//     if (!selectedFormId) return;

//     fetch(`/sign/api/forms/${selectedFormId}/pdf`)
//       .then(res => res.json())
//       .then(data => setPdfUrl(data.pdfUrl));
//   }, [selectedFormId]);

//   return (
//     <div className="p-6 space-y-4">
//       <h1 className="text-2xl font-bold">יצירת תבנית חדשה</h1>

//       <select
//         className="border p-2 rounded w-full"
//         value={selectedFormId}
//         onChange={(e) => setSelectedFormId(e.target.value)}
//       >
//         <option value="">בחר טופס</option>
//         {forms.map(f => (
//           <option key={f.id} value={f.id}>
//             {f.title}
//           </option>
//         ))}
//       </select>

//       {pdfUrl && <PdfViewer pdfUrl={pdfUrl} />}
//     </div>
//   );
// }

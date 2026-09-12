"use client";

import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// @ts-ignore
import 'react-pdf/dist/Page/AnnotationLayer.css';
// @ts-ignore
import 'react-pdf/dist/Page/TextLayer.css';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);








pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const CRM_FIELDS = [
  { id: "customer_name", label: "שם לקוח", type: "text" },
  { id: "company_id", label: "ח.פ / ת.ז", type: "text" },
  { id: "signature", label: "חתימה", type: "signature" },
  { id: "date", label: "תאריך", type: "date" },
];

export default function TemplateBuilder() {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  const [templateName, setTemplateName] = useState("");
  const [htmlAppendix, setHtmlAppendix] = useState("");
  const [placedFields, setPlacedFields] = useState<any[]>([]);
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLibraryFiles();
  }, []);

  const fetchLibraryFiles = async () => {
    const { data } = await supabase.from("sign_files").select("*");
    if (data) setFiles(data);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fileId = e.target.value;
    setSelectedFileId(fileId);
    const selectedFile = files.find(f => f.id === fileId);
    setPdfUrl(selectedFile ? selectedFile.public_url : null);
    setPlacedFields([]);
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !selectedFileId) return alert("חובה לבחור שם ותבנית בסיס");

    try {
      const { data: templateData, error: templateError } = await supabase
        .from('sign_templates')
        .insert([{ 
          name: templateName, 
          file_id: selectedFileId,
          html_appendix: htmlAppendix,
          is_active: true 
        }]).select().single();

      if (templateError) throw templateError;

      if (placedFields.length > 0) {
        const fields = placedFields.map(f => ({
          template_id: templateData.id, field_name: f.id, field_type: f.type,
          page_number: f.page, position_x: f.x, position_y: f.y
        }));
        await supabase.from('sign_template_fields').insert(fields);
      }

      alert("תבנית נשמרה בהצלחה!");
    } catch (error) {
      console.error(error);
      alert("שגיאה בשמירה");
    }
  };

  return (
    <div className="flex gap-6 min-h-[80vh] dir-rtl">
      
      {/* סיידבר הגדרות התבנית ושדות ה-CRM */}
      <div className="w-72 border-l border-gray-200 pl-6 flex flex-col">
        <h3 className="font-bold text-lg mb-4 text-gray-800">הגדרות התבנית</h3>
        
        <input 
          type="text" 
          placeholder="שם התבנית (למשל: חוזה שירות)" 
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="w-full p-2 mb-4 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        
        <label className="text-sm text-gray-600 mb-1 block">בחר קובץ בסיס מהספרייה:</label>
        <select 
          value={selectedFileId} 
          onChange={handleFileSelection}
          className="w-full p-2 mb-6 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">-- בחר קובץ --</option>
          {files.map(f => <option key={f.id} value={f.id}>{f.file_name}</option>)}
        </select>

        {pdfUrl && (
          <>
            <h3 className="font-bold text-gray-800 mt-2 mb-3">שדות CRM לגרירה</h3>
            <p className="text-xs text-gray-500 mb-3">גרור את השדות אל מסמך ה-PDF שמאלי</p>
            <div className="flex flex-col gap-2">
              {CRM_FIELDS.map(f => (
                <div 
                  key={f.id} 
                  draggable 
                  onDragStart={(e) => e.dataTransfer.setData("field", JSON.stringify(f))}
                  className="p-2 bg-indigo-50 border border-dashed border-indigo-400 rounded text-center text-indigo-700 cursor-grab hover:bg-indigo-100 transition-colors"
                >
                  {f.label}
                </div>
              ))}
            </div>
          </>
        )}

        <button 
          onClick={handleSaveTemplate} 
          className="w-full mt-auto mb-4 p-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors shadow-sm"
        >
          שמור תבנית
        </button>
      </div>

      {/* אזור העריכה המרכזי (PDF ונספחי HTML) */}
      <div className="flex-1 bg-gray-50 p-6 rounded-lg border border-gray-200 overflow-y-auto flex flex-col items-center">
        {!pdfUrl ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <p className="text-lg">בחר קובץ בסיס מהתפריט הימני כדי להתחיל</p>
          </div>
        ) : (
          <div className="w-full max-w-3xl flex flex-col gap-8">
            
            {/* מקטע מסמך ה-PDF */}
            <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100 w-full">
              <h2 className="text-xl font-bold mb-4 text-gray-800 self-start">מסמך המקור (PDF)</h2>
              
              <div className="flex gap-4 mb-4 items-center">
                <button 
                  onClick={() => setPageNumber(p => p - 1)} 
                  disabled={pageNumber <= 1}
                  className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  הקודם
                </button>
                <span className="font-semibold text-gray-700">עמוד {pageNumber} מתוך {numPages || '-'}</span>
                <button 
                  onClick={() => setPageNumber(p => p + 1)} 
                  disabled={numPages !== null && pageNumber >= numPages}
                  className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  הבא
                </button>
              </div>

              <div 
                ref={documentRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rect = documentRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const field = JSON.parse(e.dataTransfer.getData("field"));
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setPlacedFields(prev => [...prev, { ...field, uniqueId: Math.random().toString(), x, y, page: pageNumber }]);
                }}
                className="relative shadow-md border border-gray-300 inline-block bg-white"
              >
                <Document file={pdfUrl} onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}>
                  <Page pageNumber={pageNumber} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>

                {placedFields.filter(f => f.page === pageNumber).map(field => (
                  <div key={field.uniqueId} 
                       onClick={() => setPlacedFields(placedFields.filter(f => f.uniqueId !== field.uniqueId))}
                       className="absolute bg-indigo-600 bg-opacity-90 text-white px-2 py-1 text-xs rounded cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10 shadow hover:bg-red-500 transition-colors"
                       style={{ left: `${field.x}%`, top: `${field.y}%` }}
                       title="לחץ למחיקה"
                  >
                    {field.label}
                  </div>
                ))}
              </div>
            </div>

            {/* מקטע דפים נוספים / HTML */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 w-full">
              <h2 className="text-xl font-bold mb-2 text-gray-800">דפים נוספים למסמך (HTML)</h2>
              <p className="text-sm text-gray-500 mb-4">
                התוכן שתזין כאן יצורף כדפים נוספים (נספחים) בסוף מסמך ה-PDF הסופי. תומך בתגיות HTML.
              </p>
              <textarea 
                placeholder="<h1>נספח להסכם</h1><p>הזן כאן את תוכן הנספח...</p>" 
                value={htmlAppendix} 
                onChange={(e) => setHtmlAppendix(e.target.value)}
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-left"
                dir="ltr"
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}









// "use client";


// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );







// import React, { useState, useRef } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
// // @ts-ignore
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// // @ts-ignore
// import 'react-pdf/dist/Page/TextLayer.css';

// // הגדרת ה-Worker של PDF.js
// pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// // שדות ה-CRM לדוגמה
// const CRM_FIELDS = [
//   { id: "customer_name", label: "שם לקוח", type: "text" },
//   { id: "company_id", label: "ח.פ / ת.ז", type: "text" },
//   { id: "deal_amount", label: "סכום עסקה", type: "text" },
//   { id: "signature", label: "חתימה", type: "signature" },
//   { id: "date", label: "תאריך", type: "date" },
// ];

// export default function TemplateBuilder() {
//   const [templateName, setTemplateName] = useState("");
//   const [pdfFile, setPdfFile] = useState<string | null>(null);
//   const [placedFields, setPlacedFields] = useState<any[]>([]);
  
//   const [numPages, setNumPages] = useState<number | null>(null);
//   const [pageNumber, setPageNumber] = useState<number>(1);

//   const [rawFile, setRawFile] = useState<File | null>(null);

//   const documentRef = useRef<HTMLDivElement>(null);

//   function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
//     setNumPages(numPages);
//     setPageNumber(1); // איפוס לעמוד הראשון בהעלאת מסמך חדש
//   }

//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file && file.type === "application/pdf") {
//       setRawFile(file); // שמירת הקובץ המקורי להעלאה
//       const fileUrl = URL.createObjectURL(file);
//       setPdfFile(fileUrl);
//     } else {
//       alert("אנא העלה קובץ PDF תקין.");
//     }
//   };

//   const handleDragStart = (e: React.DragEvent, field: any) => {
//     e.dataTransfer.setData("field", JSON.stringify(field));
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     if (!documentRef.current) return;

//     const fieldData = e.dataTransfer.getData("field");
//     if (!fieldData) return;

//     const field = JSON.parse(fieldData);
    
//     // חישוב הקואורדינטות באחוזים
//     const rect = documentRef.current.getBoundingClientRect();
//     const x = ((e.clientX - rect.left) / rect.width) * 100;
//     const y = ((e.clientY - rect.top) / rect.height) * 100;

//     setPlacedFields([
//       ...placedFields,
//       // שים לב: הוספנו כאן את page: pageNumber כדי לדעת באיזה עמוד השדה הונח
//       { ...field, uniqueId: Math.random().toString(36).substr(2, 9), x, y, page: pageNumber },
//     ]);
//   };

//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//   };

//  const handleSaveTemplate = async () => {
//     if (!templateName) return alert("אנא הזן שם לתבנית");
//     if (!rawFile) return alert("אנא העלה קובץ PDF");
//     if (placedFields.length === 0) return alert("אנא גרור לפחות שדה אחד");

//     try {
//       // 1. העלאת ה-PDF ל-Supabase Storage
//       const fileExt = rawFile.name.split('.').pop();
//       const fileName = `${Math.random()}.${fileExt}`;
//       const filePath = `templates/${fileName}`;

//       const { error: uploadError, data: uploadData } = await supabase.storage
//         .from('sign-templates')
//         .upload(filePath, rawFile);

//       if (uploadError) throw uploadError;

//       // קבלת כתובת ה-URL הציבורית של הקובץ
//       const { data: { publicUrl } } = supabase.storage
//         .from('sign-templates')
//         .getPublicUrl(filePath);

//       // 2. שמירת רשומת התבנית במסד הנתונים
//       const { data: templateData, error: templateError } = await supabase
//         .from('sign_templates')
//         .insert([{ 
//           name: templateName, 
//           original_file_url: publicUrl,
//           is_active: true 
//         }])
//         .select()
//         .single();

//       if (templateError) throw templateError;

//       // 3. הכנה ושמירת השדות שנגררו למסד הנתונים
//       const fieldsToInsert = placedFields.map(field => ({
//         template_id: templateData.id,
//         field_name: field.id, // מזהה ה-CRM המקורי
//         field_type: field.type,
//         page_number: field.page,
//         position_x: field.x,
//         position_y: field.y,
//       }));

//       const { error: fieldsError } = await supabase
//         .from('sign_template_fields')
//         .insert(fieldsToInsert);

//       if (fieldsError) throw fieldsError;

//       alert("התבנית והשדות נשמרו בהצלחה!");
      
//     } catch (error) {
//       console.error("Error saving template:", error);
//       alert("שגיאה בשמירת התבנית. בדוק את הקונסול.");
//     }
//   };

//   return (
//     <div style={{ display: "flex", height: "100vh", backgroundColor: "#f3f4f6", direction: "rtl" }}>
      
//       {/* תפריט הצד - שדות נגררים */}
//       <div style={{ width: "250px", backgroundColor: "#fff", borderLeft: "1px solid #e5e7eb", padding: "20px" }}>
//         <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "20px" }}>שדות CRM</h2>
//         <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//           {CRM_FIELDS.map((field) => (
//             <div
//               key={field.id}
//               draggable
//               onDragStart={(e) => handleDragStart(e, field)}
//               style={{
//                 padding: "10px", backgroundColor: "#e0e7ff", border: "1px dashed #4f46e5", 
//                 borderRadius: "6px", cursor: "grab", textAlign: "center", fontWeight: "500", color: "#3730a3"
//               }}
//             >
//               {field.label}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* אזור העבודה המרכזי */}
//       <div style={{ flex: 1, padding: "30px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
        
//         {/* סרגל עליון */}
//         <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "800px", marginBottom: "20px" }}>
//           <input 
//             type="text" 
//             placeholder="שם התבנית (למשל: הסכם התקשרות)" 
//             value={templateName}
//             onChange={(e) => setTemplateName(e.target.value)}
//             style={{ padding: "10px", fontSize: "1rem", borderRadius: "6px", border: "1px solid #ccc", width: "300px" }}
//           />
//           <button 
//             onClick={handleSaveTemplate}
//             style={{ padding: "10px 20px", backgroundColor: "#10b981", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}
//           >
//             שמור תבנית
//           </button>
//         </div>

//         {/* תצוגת הקובץ או כפתור העלאה */}
//         {!pdfFile ? (
//           <div style={{ width: "100%", maxWidth: "800px", padding: "50px", border: "2px dashed #9ca3af", borderRadius: "10px", textAlign: "center", backgroundColor: "#fff" }}>
//             <h3>העלה מסמך PDF ליצירת תבנית</h3>
//             <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ marginTop: "20px" }} />
//           </div>
//         ) : (
//           <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            
//             {/* תפריט דפדוף עמודים */}
//             <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
//               <button 
//                 onClick={() => setPageNumber(pageNumber - 1)} 
//                 disabled={pageNumber <= 1}
//                 style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", cursor: pageNumber <= 1 ? "not-allowed" : "pointer", backgroundColor: "#fff" }}
//               >
//                 הקודם
//               </button>
//               <span style={{ fontWeight: "bold" }}>
//                 עמוד {pageNumber} מתוך {numPages || '-'}
//               </span>
//               <button 
//                 onClick={() => setPageNumber(pageNumber + 1)} 
//                 disabled={numPages !== null && pageNumber >= numPages}
//                 style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", cursor: (numPages !== null && pageNumber >= numPages) ? "not-allowed" : "pointer", backgroundColor: "#fff" }}
//               >
//                 הבא
//               </button>
//             </div>

//             <div 
//               ref={documentRef}
//               onDrop={handleDrop}
//               onDragOver={handleDragOver}
//               style={{ 
//                 position: "relative",
//                 boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", 
//                 border: "1px solid #e5e7eb",
//                 display: "inline-block" 
//               }}
//             >
//               {/* רכיב ה-PDF שקורא לפונקציית הטעינה ומתעדכן לפי העמוד הנוכחי */}
//               <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
//                 <Page pageNumber={pageNumber} width={800} renderTextLayer={false} renderAnnotationLayer={false} />
//               </Document>

//               {/* סינון והצגת השדות שמוקמו רק על גבי העמוד הנוכחי */}
//               {placedFields
//                 .filter(field => field.page === pageNumber)
//                 .map((field) => (
//                 <div
//                   key={field.uniqueId}
//                   style={{
//                     position: "absolute",
//                     left: `${field.x}%`,
//                     top: `${field.y}%`,
//                     padding: "5px 10px",
//                     backgroundColor: "rgba(79, 70, 229, 0.9)",
//                     color: "white",
//                     fontSize: "12px",
//                     borderRadius: "4px",
//                     transform: "translate(-50%, -50%)",
//                     cursor: "pointer",
//                     zIndex: 10
//                   }}
//                   onClick={() => setPlacedFields(placedFields.filter(f => f.uniqueId !== field.uniqueId))}
//                   title="לחץ למחיקה"
//                 >
//                   {field.label} {field.type === 'signature' ? '✍️' : '📝'}
//                 </div>
//               ))}
//             </div>

//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
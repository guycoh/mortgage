"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
// @ts-ignore
import 'react-pdf/dist/Page/AnnotationLayer.css';
// @ts-ignore
import 'react-pdf/dist/Page/TextLayer.css';

export default function SignDocumentClient({ token }: { token: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("מאתחל רכיבים...");
  
  const [documentData, setDocumentData] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  
  // שינוי קריטי 1: מתחילים מ-0 כדי לאלץ את המערכת להמתין למדידת מסך הנייד
  const [pdfWidth, setPdfWidth] = useState<number>(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // שינוי קריטי 2: טעינת ה-Worker מתבצעת רק לאחר שהעמוד נטען בוודאות בדפדפן
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    // מדידת המסך והגדרת רוחב בטוח לנייד
    const safeWidth = window.innerWidth < 768 ? window.innerWidth - 40 : 800;
    setPdfWidth(safeWidth);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!token) {
      setErrorMsg("שגיאה: לא התקבל מזהה מסמך.");
      return;
    }
    setLoadingStep(`מתחבר לשרת...`);
    fetchDocumentData();
  }, [token, isMounted]);

  const fetchDocumentData = async () => {
    try {
      if (!supabase) throw new Error("חיבור ל-Supabase לא הוגדר.");

      setLoadingStep("מושך נתוני מסמך...");
      const { data: docData, error: docError } = await supabase
        .from("sign_documents")
        .select("*, sign_templates(*, sign_files(*))")
        .eq("sign_token", token)
        .single();

      if (docError) return setErrorMsg(`שגיאת מסד נתונים: ${docError.message}`);
      if (!docData) return setErrorMsg("המסמך לא נמצא.");
      if (!docData.sign_templates) return setErrorMsg("התבנית חסומה.");

      setDocumentData(docData);
      setTemplate(docData.sign_templates);

      const { data: fieldsData } = await supabase
        .from("sign_template_fields")
        .select("*")
        .eq("template_id", docData.template_id);

      if (fieldsData) setFields(fieldsData);
      if (docData.status === 'signed') setIsDone(true);
      
    } catch (err: any) {
      setErrorMsg(`שגיאה: ${err.message}`);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const valuesToInsert = fields.map(field => ({
        document_id: documentData.id,
        field_id: field.id,
        value: fieldValues[field.id] || ""
      }));
      await supabase.from("sign_document_field_values").insert(valuesToInsert);
      await supabase.from("sign_documents").update({ status: 'signed', signed_at: new Date().toISOString() }).eq("id", documentData.id);
      setIsDone(true);
    } catch (error) {
      alert("שגיאה בעת שמירת החתימה.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;
  if (errorMsg) return <div className="min-h-screen flex items-center justify-center p-8 text-red-600 font-bold">{errorMsg}</div>;
  if (isDone) return <div className="min-h-screen flex items-center justify-center p-8 text-emerald-600 font-bold text-2xl">המסמך נחתם בהצלחה!</div>;
  
  // שינוי קריטי 3: מונעים מה-PDF להתרנדר אם הרוחב עדיין 0
  if (!documentData || !template || pdfWidth === 0) {
    return <div className="min-h-screen flex items-center justify-center p-8 text-gray-600 font-bold animate-pulse">{loadingStep}</div>;
  }

  const pdfFileUrl = template.sign_files?.public_url || (Array.isArray(template.sign_files) ? template.sign_files[0]?.public_url : null);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 dir-rtl flex flex-col items-center overflow-x-hidden" dir="rtl">
      
      <div className="w-full max-w-4xl bg-white p-4 rounded-t-xl shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div className="text-center md:text-right">
          <h1 className="text-xl font-bold text-gray-800">שלום, {documentData.customer_name}</h1>
          <p className="text-sm text-gray-500">אנא עיין במסמך, מלא את השדות ולחץ על אישור.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow disabled:opacity-50 w-full md:w-auto"
        >
          {isSubmitting ? "שומר..." : "אני מאשר וחותם על המסמך"}
        </button>
      </div>

      <div className="w-full max-w-4xl bg-gray-50 p-2 md:p-6 flex flex-col items-center shadow-lg rounded-b-xl overflow-hidden">
        {!pdfFileUrl ? (
           <div className="p-8 text-red-500 font-bold">שגיאה: קובץ ה-PDF אינו זמין.</div>
        ) : (
          <>
            <div className="flex gap-4 mb-4 items-center">
              <button onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1} className="px-4 py-2 border rounded bg-white disabled:opacity-50 text-sm">הקודם</button>
              <span className="font-semibold text-sm">עמוד {pageNumber} מתוך {numPages || '-'}</span>
              <button onClick={() => setPageNumber(p => p + 1)} disabled={numPages !== null && pageNumber >= numPages} className="px-4 py-2 border rounded bg-white disabled:opacity-50 text-sm">הבא</button>
            </div>

            {/* מעטפת שמונעת גלישה אופקית בנייד */}
            <div className="relative shadow-md border border-gray-300 bg-white max-w-full overflow-hidden flex justify-center">
              <Document file={pdfFileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page 
                  pageNumber={pageNumber} 
                  width={pdfWidth} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false} 
                  devicePixelRatio={Math.min(window.devicePixelRatio, 1.5)} 
                />
              </Document>

              {fields.filter(f => f.page_number === pageNumber).map(field => (
                <div key={field.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${field.position_x}%`, top: `${field.position_y}%` }}>
                  {field.field_type === 'signature' ? (
                    <input type="text" placeholder="הקלד שם..." value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-1 py-1 bg-yellow-100 border border-yellow-400 text-indigo-900 font-bold text-center shadow-sm focus:ring-2 outline-none w-20 md:w-48 rounded text-xs md:text-base" />
                  ) : (
                    <input type="text" placeholder={field.field_name} value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-1 py-1 bg-blue-50 border border-blue-200 text-gray-800 text-[10px] md:text-sm shadow-sm focus:ring-2 outline-none w-16 md:w-32 rounded" />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}











// "use client";

// import React, { useState, useEffect } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

// // @ts-ignore
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// // @ts-ignore
// import 'react-pdf/dist/Page/TextLayer.css';

// // הגדרת ה-Worker מחוץ לקומפוננטה (בטוח יותר ל-Next.js)
// pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// export default function SignDocumentClient({ token }: { token: string }) {
//   const [isMounted, setIsMounted] = useState(false);
//   const [loadingStep, setLoadingStep] = useState<string>("מאתחל רכיבים...");
  
//   const [documentData, setDocumentData] = useState<any>(null);
//   const [template, setTemplate] = useState<any>(null);
//   const [fields, setFields] = useState<any[]>([]);
//   const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});
  
//   const [numPages, setNumPages] = useState<number | null>(null);
//   const [pageNumber, setPageNumber] = useState<number>(1);
//   const [pdfWidth, setPdfWidth] = useState<number>(800);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isDone, setIsDone] = useState(false);
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);

//   useEffect(() => {
//     setIsMounted(true);
//     if (typeof window !== "undefined") {
//       // הגבלת רוחב בטוחה: מינימום 300 פיקסלים, מקסימום 800
//       const safeWidth = Math.max(Math.min(window.innerWidth - 32, 800), 300);
//       setPdfWidth(safeWidth);
//     }
//   }, []);

//   useEffect(() => {
//     if (!isMounted) return;
    
//     if (!token) {
//       setErrorMsg("שגיאה: לא התקבל מזהה מסמך (Token). ודא שהקישור מלא ותקין.");
//       return;
//     }
    
//     setLoadingStep(`מזהה מסמך התקבל. מתחבר לשרת...`);
//     fetchDocumentData();
//   }, [token, isMounted]);

//   const fetchDocumentData = async () => {
//     try {
//       if (!supabase) throw new Error("חיבור ל-Supabase לא הוגדר כראוי.");

//       setLoadingStep("מושך נתוני מסמך מ-Supabase...");
//       const { data: docData, error: docError } = await supabase
//         .from("sign_documents")
//         .select("*, sign_templates(*, sign_files(*))")
//         .eq("sign_token", token)
//         .single();

//       if (docError) return setErrorMsg(`שגיאת מסד נתונים: ${docError.message}`);
//       if (!docData) return setErrorMsg("המסמך לא נמצא במסד הנתונים.");
//       if (!docData.sign_templates) return setErrorMsg("התבנית חסומה לקריאה.");

//       setDocumentData(docData);
//       setTemplate(docData.sign_templates);

//       setLoadingStep("מושך שדות למילוי...");
//       const { data: fieldsData } = await supabase
//         .from("sign_template_fields")
//         .select("*")
//         .eq("template_id", docData.template_id);

//       if (fieldsData) setFields(fieldsData);
//       if (docData.status === 'signed') setIsDone(true);
      
//     } catch (err: any) {
//       setErrorMsg(`קריסת קוד (Exception): ${err.message}`);
//     }
//   };

//   const handleFieldChange = (fieldId: string, value: string) => {
//     setFieldValues(prev => ({ ...prev, [fieldId]: value }));
//   };

//   const handleSubmit = async () => {
//     setIsSubmitting(true);
//     try {
//       const valuesToInsert = fields.map(field => ({
//         document_id: documentData.id,
//         field_id: field.id,
//         value: fieldValues[field.id] || ""
//       }));

//       await supabase.from("sign_document_field_values").insert(valuesToInsert);

//       await supabase
//         .from("sign_documents")
//         .update({ status: 'signed', signed_at: new Date().toISOString() })
//         .eq("id", documentData.id);

//       setIsDone(true);
//     } catch (error) {
//       alert("אירעה שגיאה בעת שמירת החתימה.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (!isMounted) return null;

//   if (errorMsg) {
//     return (
//       <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dir-rtl" dir="rtl">
//         <div className="bg-red-50 text-red-700 p-6 rounded-lg border border-red-200 max-w-lg w-full shadow-sm text-center">
//           <h2 className="font-bold text-xl mb-2">שגיאה בטעינת המסמך</h2>
//           <p>{errorMsg}</p>
//         </div>
//       </div>
//     );
//   }

//   if (isDone) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dir-rtl" dir="rtl">
//         <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-emerald-100">
//           <div className="text-6xl mb-4">✅</div>
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">המסמך נחתם בהצלחה!</h2>
//           <p className="text-gray-500">תודה רבה. פרטי החתימה נקלטו במערכת.</p>
//         </div>
//       </div>
//     );
//   }
  
//   if (!documentData || !template) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dir-rtl" dir="rtl">
//         <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
//         <p className="text-gray-600 text-lg font-medium">{loadingStep}</p>
//       </div>
//     );
//   }

//   const pdfFileUrl = template.sign_files?.public_url || (Array.isArray(template.sign_files) ? template.sign_files[0]?.public_url : null);

//   return (
//     <div className="min-h-screen bg-gray-100 p-4 md:p-8 dir-rtl flex flex-col items-center" dir="rtl">
      
//       <div className="w-full max-w-4xl bg-white p-6 rounded-t-xl shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
//         <div>
//           <h1 className="text-xl font-bold text-gray-800">שלום, {documentData.customer_name}</h1>
//           <p className="text-sm text-gray-500">אנא עיין במסמך, מלא את השדות ולחץ על אישור בסיום.</p>
//         </div>
//         <button 
//           onClick={handleSubmit}
//           disabled={isSubmitting}
//           className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors disabled:opacity-50 w-full md:w-auto"
//         >
//           {isSubmitting ? "שומר..." : "אני מאשר וחותם על המסמך"}
//         </button>
//       </div>

//       <div className="w-full max-w-4xl bg-gray-50 p-4 md:p-6 flex flex-col items-center shadow-lg rounded-b-xl overflow-hidden">
        
//         {!pdfFileUrl ? (
//            <div className="p-8 text-red-500 font-bold bg-white rounded border border-red-200 w-full text-center">
//              שגיאה: קובץ ה-PDF אינו זמין לקריאה. אנא בדוק הרשאות מסד נתונים.
//            </div>
//         ) : (
//           <>
//             <div className="flex gap-4 mb-4 items-center">
//               <button onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1} className="px-4 py-2 border rounded bg-white disabled:opacity-50">הקודם</button>
//               <span className="font-semibold">עמוד {pageNumber} מתוך {numPages || '-'}</span>
//               <button onClick={() => setPageNumber(p => p + 1)} disabled={numPages !== null && pageNumber >= numPages} className="px-4 py-2 border rounded bg-white disabled:opacity-50">הבא</button>
//             </div>

//             <div className="relative inline-block shadow-md border border-gray-300 bg-white">
//               <Document file={pdfFileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} onLoadError={(e) => console.error(e)}>
//                 <Page 
//                   pageNumber={pageNumber} 
//                   width={pdfWidth} 
//                   renderTextLayer={false} 
//                   renderAnnotationLayer={false} 
//                   devicePixelRatio={1} /* שורת הקסם שמונעת קריסת זיכרון בנייד */
//                 />
//               </Document>

//               {fields.filter(f => f.page_number === pageNumber).map(field => (
//                 <div key={field.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${field.position_x}%`, top: `${field.position_y}%` }}>
//                   {field.field_type === 'signature' ? (
//                     <input type="text" placeholder="שם מלא לחתימה..." value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-yellow-100 border border-yellow-400 text-indigo-900 font-bold text-center shadow-sm focus:ring-2 outline-none w-32 md:w-48 rounded text-sm md:text-base" />
//                   ) : (
//                     <input type="text" placeholder={field.field_name} value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-gray-800 text-xs md:text-sm shadow-sm focus:ring-2 outline-none w-24 md:w-32 rounded" />
//                   )}
//                 </div>
//               ))}
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }
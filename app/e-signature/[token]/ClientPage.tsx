"use client";

import  { useState, useEffect } from "react";
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



// הפתרון הרשמי ל-Next.js: טעינת ה-Worker מקומית במקום משרת חיצוני כדי למנוע חסימות במובייל
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function SignDocumentClient({ token }: { token: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("מאתחל רכיבים...");
  
  const [documentData, setDocumentData] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfWidth, setPdfWidth] = useState<number>(800);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      // רוחב רספונסיבי בטוח
      setPdfWidth(Math.max(Math.min(window.innerWidth - 32, 800), 300));
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!token) return setErrorMsg("שגיאה: לא התקבל מזהה מסמך.");
    
    setLoadingStep(`מתחבר לשרת...`);
    fetchDocumentData();
  }, [token, isMounted]);

  const fetchDocumentData = async () => {
    try {
      if (!supabase) throw new Error("חיבור ל-Supabase לא הוגדר.");

      const { data: docData, error: docError } = await supabase
        .from("sign_documents")
        .select("*, sign_templates(*, sign_files(*))")
        .eq("sign_token", token)
        .single();

      if (docError) return setErrorMsg(`שגיאת מסד נתונים: ${docError.message}`);
      if (!docData) return setErrorMsg("המסמך לא נמצא.");
      if (!docData.sign_templates) return setErrorMsg("התבנית חסומה לקריאה.");

      setDocumentData(docData);
      setTemplate(docData.sign_templates);

      const { data: fieldsData } = await supabase
        .from("sign_template_fields")
        .select("*")
        .eq("template_id", docData.template_id);

      if (fieldsData) setFields(fieldsData);
      if (docData.status === 'signed') setIsDone(true);
      
    } catch (err: any) {
      setErrorMsg(`קריסת קוד: ${err.message}`);
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
      alert("אירעה שגיאה בעת שמירת החתימה.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  if (errorMsg) return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-red-600 font-bold dir-rtl" dir="rtl">{errorMsg}</div>;
  if (isDone) return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-emerald-600 font-bold text-2xl dir-rtl" dir="rtl">המסמך נחתם בהצלחה!</div>;
  if (!documentData || !template) return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-gray-600 font-bold dir-rtl" dir="rtl">{loadingStep}</div>;

  const pdfFileUrl = template.sign_files?.public_url || (Array.isArray(template.sign_files) ? template.sign_files[0]?.public_url : null);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 dir-rtl flex flex-col items-center" dir="rtl">
      
      <div className="w-full max-w-4xl bg-white p-4 rounded-t-xl shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">שלום, {documentData.customer_name}</h1>
          <p className="text-sm text-gray-500">אנא עיין במסמך, מלא את השדות ולחץ על אישור.</p>
        </div>
        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow w-full md:w-auto">
          {isSubmitting ? "שומר..." : "אני מאשר וחותם"}
        </button>
      </div>

      <div className="w-full max-w-4xl bg-gray-50 p-2 md:p-6 flex flex-col items-center shadow-lg rounded-b-xl overflow-hidden">
        
        {!pdfFileUrl ? (
           <div className="p-8 text-red-500 font-bold">שגיאה: קובץ אינו זמין במסד הנתונים.</div>
        ) : (
          <>
            <div className="flex gap-4 mb-4 items-center">
              <button onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1} className="px-4 py-2 border rounded bg-white">הקודם</button>
              <span className="font-semibold text-sm">עמוד {pageNumber} מתוך {numPages || '-'}</span>
              <button onClick={() => setPageNumber(p => p + 1)} disabled={numPages !== null && pageNumber >= numPages} className="px-4 py-2 border rounded bg-white">הבא</button>
            </div>

            <div className="relative shadow-md border border-gray-300 bg-white overflow-hidden max-w-full">
              <Document 
                file={pdfFileUrl} 
                onLoadSuccess={({ numPages }) => setNumPages(numPages)} 
                onLoadError={(e) => console.error("PDF Load Error:", e)}
              >
                <Page 
                  pageNumber={pageNumber} 
                  width={pdfWidth} 
                  devicePixelRatio={1} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false} 
                />
              </Document>

              {fields.filter(f => f.page_number === pageNumber).map(field => (
                <div key={field.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${field.position_x}%`, top: `${field.position_y}%` }}>
                  {field.field_type === 'signature' ? (
                    <input type="text" placeholder="הקלד שם..." value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-yellow-100 border border-yellow-400 text-indigo-900 font-bold text-center shadow-sm outline-none w-24 md:w-48 rounded text-sm md:text-base" />
                  ) : (
                    <input type="text" placeholder={field.field_name} value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-gray-800 text-xs md:text-sm shadow-sm outline-none w-20 md:w-32 rounded" />
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

// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );


// import React, { useState, useEffect } from "react";
// import { Document, Page, pdfjs } from "react-pdf";

// // @ts-ignore
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// // @ts-ignore
// import 'react-pdf/dist/Page/TextLayer.css';

// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// export default function SignDocumentClient({ token }: { token: string }) {
//   const [isMounted, setIsMounted] = useState(false);
//   const [loadingStep, setLoadingStep] = useState<string>("מאתחל רכיבים...");
  
//   const [documentData, setDocumentData] = useState<any>(null);
//   const [template, setTemplate] = useState<any>(null);
//   const [fields, setFields] = useState<any[]>([]);
//   const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});
  
//   const [numPages, setNumPages] = useState<number | null>(null);
//   const [pageNumber, setPageNumber] = useState<number>(1);
//   const [pdfWidth, setPdfWidth] = useState<number>(320);
  
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isDone, setIsDone] = useState(false);
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);

//   useEffect(() => {
//     setIsMounted(true);
//     if (typeof window !== "undefined") {
//       setPdfWidth(Math.min(window.innerWidth - 32, 800));
//     }
//   }, []);

//   useEffect(() => {
//     if (!isMounted) return;
//     if (!token) return setErrorMsg("שגיאה: לא התקבל מזהה מסמך (Token).");
    
//     setLoadingStep(`מתחבר לשרת...`);
//     fetchDocumentData();
//   }, [token, isMounted]);

//   const fetchDocumentData = async () => {
//     try {
//       if (!supabase) throw new Error("חיבור ל-Supabase לא הוגדר.");

//       const { data: docData, error: docError } = await supabase
//         .from("sign_documents")
//         .select("*, sign_templates(*, sign_files(*))")
//         .eq("sign_token", token)
//         .single();

//       if (docError) return setErrorMsg(`שגיאת מסד נתונים: ${docError.message}`);
//       if (!docData) return setErrorMsg("המסמך לא נמצא.");
//       if (!docData.sign_templates) return setErrorMsg("התבנית חסומה לקריאה.");

//       setDocumentData(docData);
//       setTemplate(docData.sign_templates);

//       const { data: fieldsData } = await supabase
//         .from("sign_template_fields")
//         .select("*")
//         .eq("template_id", docData.template_id);

//       if (fieldsData) setFields(fieldsData);
//       if (docData.status === 'signed') setIsDone(true);
      
//     } catch (err: any) {
//       setErrorMsg(`קריסת קוד: ${err.message}`);
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
//       await supabase.from("sign_documents").update({ status: 'signed', signed_at: new Date().toISOString() }).eq("id", documentData.id);
//       setIsDone(true);
//     } catch (error) {
//       alert("אירעה שגיאה בעת שמירת החתימה.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (!isMounted) return null;

//   if (errorMsg) return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-red-600 font-bold dir-rtl" dir="rtl">{errorMsg}</div>;
//   if (isDone) return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-emerald-600 font-bold text-2xl dir-rtl" dir="rtl">המסמך נחתם בהצלחה!</div>;
//   if (!documentData || !template) return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 text-gray-600 font-bold dir-rtl" dir="rtl">{loadingStep}</div>;

//   const pdfFileUrl = template.sign_files?.public_url || (Array.isArray(template.sign_files) ? template.sign_files[0]?.public_url : null);

//   return (
//     <div className="min-h-screen bg-gray-100 p-4 md:p-8 dir-rtl flex flex-col items-center" dir="rtl">
      
//       <div className="w-full max-w-4xl bg-white p-4 rounded-t-xl shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
//         <div>
//           <h1 className="text-xl font-bold text-gray-800">שלום, {documentData.customer_name}</h1>
//           <p className="text-sm text-gray-500">אנא עיין במסמך, מלא את השדות ולחץ על אישור.</p>
//         </div>
//         <button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow w-full md:w-auto">
//           {isSubmitting ? "שומר..." : "אני מאשר וחותם"}
//         </button>
//       </div>

//       <div className="w-full max-w-4xl bg-gray-50 p-2 md:p-6 flex flex-col items-center shadow-lg rounded-b-xl overflow-hidden">
        
//         {!pdfFileUrl ? (
//           <div className="p-8 text-red-500 font-bold bg-white rounded border border-red-200 w-full text-center" dir="ltr">
//             <p>שגיאה: קובץ ה-PDF אינו זמין.</p>
//             <p className="text-xs text-gray-500 mt-4 font-mono break-words text-left">
//               Template Data: {JSON.stringify(template || 'null')}
//             </p>
//           </div>
//         ) : (
//           <>
//             <div className="flex gap-4 mb-4 items-center">
//               <button onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1} className="px-4 py-2 border rounded bg-white">הקודם</button>
//               <span className="font-semibold text-sm">עמוד {pageNumber} מתוך {numPages || '-'}</span>
//               <button onClick={() => setPageNumber(p => p + 1)} disabled={numPages !== null && pageNumber >= numPages} className="px-4 py-2 border rounded bg-white">הבא</button>
//             </div>

//             <div className="relative shadow-md border border-gray-300 bg-white overflow-hidden max-w-full">
//               <Document 
//                 file={pdfFileUrl} 
//                 onLoadSuccess={({ numPages }) => setNumPages(numPages)} 
//                 onLoadError={(e) => setErrorMsg(`ה-PDF נכשל מלטעון: ${e.message}`)}
//               >
//                 <Page 
//                   pageNumber={pageNumber} 
//                   width={pdfWidth} 
//                   devicePixelRatio={1} /* חוסם את מגבלת הזיכרון במובייל */
//                   renderTextLayer={false} 
//                   renderAnnotationLayer={false} 
//                 />
//               </Document>

//               {fields.filter(f => f.page_number === pageNumber).map(field => (
//                 <div key={field.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${field.position_x}%`, top: `${field.position_y}%` }}>
//                   {field.field_type === 'signature' ? (
//                     <input type="text" placeholder="הקלד שם..." value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-yellow-100 border border-yellow-400 text-indigo-900 font-bold text-center shadow-sm outline-none w-24 md:w-48 rounded text-sm md:text-base" />
//                   ) : (
//                     <input type="text" placeholder={field.field_name} value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-gray-800 text-xs md:text-sm shadow-sm outline-none w-20 md:w-32 rounded" />
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






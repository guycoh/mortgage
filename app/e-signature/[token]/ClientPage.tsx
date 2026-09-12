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

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function SignDocumentClient({ token }: { token: string }) {
  const [isMounted, setIsMounted] = useState(false);
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
    const handleResize = () => setPdfWidth(Math.min(window.innerWidth - 32, 800));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (token) fetchDocumentData();
  }, [token]);

  const fetchDocumentData = async () => {
    try {
      const { data: docData, error: docError } = await supabase
        .from("sign_documents")
        .select("*, sign_templates(*, sign_files(*))")
        .eq("sign_token", token)
        .single();

      if (docError) {
        return setErrorMsg(`שגיאת מסד נתונים: ${docError.message}`);
      }
      if (!docData) {
        return setErrorMsg("המסמך לא נמצא או שהקישור פג תוקף.");
      }
      
      // כאן אנחנו תופסים את חסימת האבטחה שגרמה לתקיעות:
      if (!docData.sign_templates) {
        return setErrorMsg("המסמך נמצא, אך התבנית חסומה לקריאה! ודא שהרצת את פקודות ה-SQL (RLS).");
      }

      setDocumentData(docData);
      setTemplate(docData.sign_templates);

      const { data: fieldsData } = await supabase
        .from("sign_template_fields")
        .select("*")
        .eq("template_id", docData.template_id);

      if (fieldsData) setFields(fieldsData);
      if (docData.status === 'signed') setIsDone(true);
      
    } catch (err: any) {
      setErrorMsg(`שגיאה בלתי צפויה: ${err.message}`);
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

      await supabase
        .from("sign_documents")
        .update({ status: 'signed', signed_at: new Date().toISOString() })
        .eq("id", documentData.id);

      setIsDone(true);
    } catch (error) {
      alert("אירעה שגיאה בעת שמירת החתימה.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (errorMsg) return <div className="min-h-screen flex items-center justify-center p-8 text-center text-red-600 font-bold text-xl dir-rtl" dir="rtl">{errorMsg}</div>;
  if (isDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-emerald-100">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">המסמך נחתם בהצלחה!</h2>
          <p className="text-gray-500">תודה רבה. פרטי החתימה נקלטו במערכת.</p>
        </div>
      </div>
    );
  }
  
  if (!documentData || !template || !isMounted) return <div className="min-h-screen flex items-center justify-center p-8 text-center text-gray-600 text-lg">טוען מסמך...</div>;

  const pdfFileUrl = template.sign_files?.public_url || (Array.isArray(template.sign_files) ? template.sign_files[0]?.public_url : null);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 dir-rtl flex flex-col items-center" dir="rtl">
      
      <div className="w-full max-w-4xl bg-white p-6 rounded-t-xl shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">שלום, {documentData.customer_name}</h1>
          <p className="text-sm text-gray-500">אנא עיין במסמך, מלא את השדות ולחץ על אישור בסיום.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors disabled:opacity-50 w-full md:w-auto"
        >
          {isSubmitting ? "שומר..." : "אני מאשר וחותם על המסמך"}
        </button>
      </div>

      <div className="w-full max-w-4xl bg-gray-50 p-4 md:p-6 flex flex-col items-center shadow-lg rounded-b-xl overflow-hidden">
        
        {!pdfFileUrl ? (
           <div className="p-8 text-red-500 font-bold bg-white rounded border border-red-200 w-full text-center">
             שגיאה: קובץ ה-PDF אינו זמין לקריאה. אנא בדוק הרשאות מסד נתונים.
           </div>
        ) : (
          <>
            <div className="flex gap-4 mb-4 items-center">
              <button onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1} className="px-4 py-2 border rounded bg-white disabled:opacity-50">הקודם</button>
              <span className="font-semibold">עמוד {pageNumber} מתוך {numPages || '-'}</span>
              <button onClick={() => setPageNumber(p => p + 1)} disabled={numPages !== null && pageNumber >= numPages} className="px-4 py-2 border rounded bg-white disabled:opacity-50">הבא</button>
            </div>

            <div className="relative inline-block shadow-md border border-gray-300 bg-white">
              <Document file={pdfFileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} onLoadError={(e) => console.error(e)}>
                <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>

              {fields.filter(f => f.page_number === pageNumber).map(field => (
                <div key={field.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${field.position_x}%`, top: `${field.position_y}%` }}>
                  {field.field_type === 'signature' ? (
                    <input type="text" placeholder="שם מלא לחתימה..." value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-yellow-100 border border-yellow-400 text-indigo-900 font-bold text-center shadow-sm focus:ring-2 outline-none w-32 md:w-48 rounded text-sm md:text-base" />
                  ) : (
                    <input type="text" placeholder={field.field_name} value={fieldValues[field.id] || ""} onChange={(e) => handleFieldChange(field.id, e.target.value)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-gray-800 text-xs md:text-sm shadow-sm focus:ring-2 outline-none w-24 md:w-32 rounded" />
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

// // שימוש בגרסת JS רגילה לתאימות טובה יותר בדפדפני מובייל (Safari/Chrome)
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// export default function SignDocumentClient({ token }: { token: string }) {
//   const [isMounted, setIsMounted] = useState(false);
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

//   // מניעת קריסות Hydration והתאמה למובייל
//   useEffect(() => {
//     setIsMounted(true);
//     const handleResize = () => setPdfWidth(Math.min(window.innerWidth - 32, 800));
//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useEffect(() => {
//     if (isMounted) fetchDocumentData();
//   }, [token, isMounted]);

//   const fetchDocumentData = async () => {
//     try {
//       const { data: docData, error: docError } = await supabase
//         .from("sign_documents")
//         .select("*, sign_templates(*, sign_files(*))")
//         .eq("sign_token", token)
//         .single();

//       if (docError || !docData) {
//         return setErrorMsg("מסמך לא נמצא או שהקישור פג תוקף.");
//       }
      
//       setDocumentData(docData);
//       setTemplate(docData.sign_templates);

//       const { data: fieldsData } = await supabase
//         .from("sign_template_fields")
//         .select("*")
//         .eq("template_id", docData.template_id);

//       if (fieldsData) setFields(fieldsData);
//       if (docData.status === 'signed') setIsDone(true);
      
//     } catch (err) {
//       setErrorMsg("שגיאה בטעינת הנתונים מהשרת.");
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
//   if (errorMsg) return <div className="min-h-screen flex items-center justify-center p-8 text-center text-red-600 font-bold">{errorMsg}</div>;
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
//   if (!documentData || !template) return <div className="min-h-screen flex items-center justify-center p-8 text-center">טוען מסמך...</div>;

//   // שליפה בטוחה של הקישור ל-PDF למניעת קריסות
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
//                 <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={false} renderAnnotationLayer={false} />
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






































// "use client";

// import React, { useState, useEffect, useRef } from "react";
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

// pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// export default function SignDocumentClient({ token }: { token: string }) {
//   const [documentData, setDocumentData] = useState<any>(null);
//   const [template, setTemplate] = useState<any>(null);
//   const [fields, setFields] = useState<any[]>([]);
//   const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});
  
//   const [numPages, setNumPages] = useState<number | null>(null);
//   const [pageNumber, setPageNumber] = useState<number>(1);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isDone, setIsDone] = useState(false);
//   const [pdfWidth, setPdfWidth] = useState<number>(800);

//   useEffect(() => {
//     fetchDocumentData();
//   }, [token]);

//   useEffect(() => {
//       const handleResize = () => {
//         setPdfWidth(Math.min(window.innerWidth - 48, 800));
//       };
      
//       // קריאה ראשונה בעת טעינת העמוד
//       handleResize();
      
//       window.addEventListener("resize", handleResize);
//       return () => window.removeEventListener("resize", handleResize);
//     }, []);


//   const fetchDocumentData = async () => {
//     // 1. הבאת פרטי המסמך והתבנית
//     const { data: docData, error: docError } = await supabase
//       .from("sign_documents")
//       .select("*, sign_templates(*, sign_files(*))")
//       .eq("sign_token", token)
//       .single();

//     if (docError || !docData) return alert("מסמך לא נמצא או שהקישור פג תוקף.");
    
//     setDocumentData(docData);
//     setTemplate(docData.sign_templates);

//     // 2. הבאת השדות של התבנית
//     const { data: fieldsData } = await supabase
//       .from("sign_template_fields")
//       .select("*")
//       .eq("template_id", docData.template_id);

//     if (fieldsData) setFields(fieldsData);
    
//     // אם המסמך כבר נחתם, נציג מסך סיום מיד
//     if (docData.status === 'signed') {
//       setIsDone(true);
//     }
//   };

//   const handleFieldChange = (fieldId: string, value: string) => {
//     setFieldValues(prev => ({ ...prev, [fieldId]: value }));
//   };

//   const handleSubmit = async () => {
//     setIsSubmitting(true);
//     try {
//       // 1. שמירת הערכים שהלקוח מילא
//       const valuesToInsert = fields.map(field => ({
//         document_id: documentData.id,
//         field_id: field.id,
//         value: fieldValues[field.id] || ""
//       }));

//       await supabase.from("sign_document_field_values").insert(valuesToInsert);

//       // 2. עדכון סטטוס המסמך ל"נחתם" + חותמת זמן
//       await supabase
//         .from("sign_documents")
//         .update({ 
//           status: 'signed', 
//           signed_at: new Date().toISOString() 
//         })
//         .eq("id", documentData.id);

//       setIsDone(true);
//     } catch (error) {
//       console.error(error);
//       alert("אירעה שגיאה בעת שמירת החתימה.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (isDone) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dir-rtl" dir="rtl">
//         <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-emerald-100">
//           <div className="text-6xl mb-4">✅</div>
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">המסמך נחתם בהצלחה!</h2>
//           <p className="text-gray-500">תודה רבה, {documentData?.customer_name}. פרטי החתימה נקלטו במערכת והועברו להמשך טיפול.</p>
//         </div>
//       </div>
//     );
//   }

//   if (!documentData || !template) return null;

//   return (
//     <div className="min-h-screen bg-gray-100 p-4 md:p-8 dir-rtl flex flex-col items-center" dir="rtl">
      
//       {/* פאנל עליון להנחיות ופעולות */}
//       <div className="w-full max-w-4xl bg-white p-6 rounded-t-xl shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
//         <div>
//           <h1 className="text-xl font-bold text-gray-800">שלום, {documentData.customer_name}</h1>
//           <p className="text-sm text-gray-500">אנא עיין במסמך, מלא את השדות הנדרשים ולחץ על אישור וחתימה בסיום.</p>
//         </div>
//         <button 
//           onClick={handleSubmit}
//           disabled={isSubmitting}
//           className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors disabled:opacity-50"
//         >
//           {isSubmitting ? "שומר..." : "אני מאשר וחותם על המסמך"}
//         </button>
//       </div>

//       {/* אזור ה-PDF */}
//       <div className="w-full max-w-4xl bg-gray-50 p-6 flex flex-col items-center shadow-lg rounded-b-xl overflow-hidden">
        
//         <div className="flex gap-4 mb-4 items-center">
//           <button 
//             onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1}
//             className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
//           >הקודם</button>
//           <span className="font-semibold text-gray-700">עמוד {pageNumber} מתוך {numPages || '-'}</span>
//           <button 
//             onClick={() => setPageNumber(p => p + 1)} disabled={numPages !== null && pageNumber >= numPages}
//             className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
//           >הבא</button>
//         </div>

//         <div className="relative inline-block shadow-md border border-gray-300 bg-white">
//           <Document 
//             file={template.sign_files?.public_url} 
//             onLoadSuccess={({ numPages }) => setNumPages(numPages)}
//           >
            
//             <Page 
//               pageNumber={pageNumber} 
//               width={pdfWidth} 
//               renderTextLayer={false} 
//               renderAnnotationLayer={false} 
//             />
         
//           </Document>

//           {/* רינדור השדות כאינפוטים פעילים על גבי המסמך */}
//           {fields.filter(f => f.page_number === pageNumber).map(field => (
//             <div 
//               key={field.id}
//               className="absolute transform -translate-x-1/2 -translate-y-1/2"
//               style={{ left: `${field.position_x}%`, top: `${field.position_y}%` }}
//             >
//               {field.field_type === 'signature' ? (
//                 <input 
//                   type="text" 
//                   placeholder="הקלד שם מלא לחתימה..." 
//                   value={fieldValues[field.id] || ""}
//                   onChange={(e) => handleFieldChange(field.id, e.target.value)}
//                   className="px-2 py-1 bg-yellow-100 border border-yellow-400 text-indigo-900 placeholder-indigo-300 font-bold text-center shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-48 rounded"
//                 />
//               ) : (
//                 <input 
//                   type="text" 
//                   placeholder={field.field_name}
//                   value={fieldValues[field.id] || ""}
//                   onChange={(e) => handleFieldChange(field.id, e.target.value)}
//                   className="px-2 py-1 bg-blue-50 border border-blue-200 text-gray-800 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-32 rounded"
//                 />
//               )}
//             </div>
//           ))}
//         </div>

//         {/* הצגת נספח ה-HTML אם קיים בתבנית */}
//         {template.html_appendix && pageNumber === numPages && (
//           <div className="mt-8 w-full max-w-[800px] bg-white border border-gray-300 p-8 shadow-md">
//             <div dangerouslySetInnerHTML={{ __html: template.html_appendix }} className="prose prose-indigo max-w-none text-right" dir="rtl" />
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }
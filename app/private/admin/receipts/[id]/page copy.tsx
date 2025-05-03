"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";



interface Receipt {
  id: number;
  date: string;
  recipient: string;
  payment_method: string;
  quantity: number;
  price: number;
  total: number;
  comment?: string;
  service?: string | null;
}

const ReceiptDetails = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : null;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const fetchReceipt = async () => {
      try {
        const res = await fetch(`/api/receipts/${id}`);
        if (!res.ok) throw new Error("Failed to fetch receipt");
        const data = await res.json();
        setReceipt(data);
      } catch (err) {
        setError("שגיאה בטעינת הנתונים. נסה שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [id]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('he-IL', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(date);
    } catch (err) {
      return dateString; // Return original if formatting fails
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { 
      style: 'currency', 
      currency: 'ILS' 
    }).format(amount);
  };

  const generatePDF = async () => {
    if (!receipt || !receiptRef.current) return;
  
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
  
      const pdf = new jsPDF("p", "mm", "a4");
  
      const imgWidth = 210; // רוחב A4 (מ"מ)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
      // מניעת חריגה מהדף
      const maxHeight = 297; // גובה A4 (מ"מ)
      const scaleFactor = imgHeight > maxHeight ? maxHeight / imgHeight : 1;
      const adjustedHeight = imgHeight * scaleFactor;
  
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, adjustedHeight);
  
      // הקטנת המרווחים בין השורות
      pdf.setFontSize(10); // גודל טקסט קטן יותר
      pdf.setLineHeightFactor(0.5); // קביעת יחס מרווח נמוך יותר
  
      pdf.save(`receipt_${receipt.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("שגיאה ביצירת ה-PDF. נסה שוב מאוחר יותר.");
    } finally {
      setPdfLoading(false);
    }
  };

  



  if (loading) return <p className="text-center text-gray-500">טוען נתונים...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-10 bg-white shadow-lg rounded-xl mt-10 border border-gray-300 relative print:w-full print:max-w-none print:shadow-none print:border-none">
      {/* Receipt container with ref for PDF generation */}
      <div ref={receiptRef} className="bg-white p-6 shadow-md">
        <div className="flex justify-between items-start border-b border-gray-400 pb-4 mb-4">
          <div className="absolute top-16 left-12 ">
            <Image
              src="/assets/myLogo.svg"
              alt="לוגו מורגי משכנתאות"
              width={140}
              height={140}
            />
          </div>
          <div className="text-right text-gray-700 ml-auto">
            <p className="text-2xl font-bold">מורגי משכנתאות</p>
            <p>ע.פ: 28979896</p>
            <p>טלפון: 052-3684844</p>
            <p>אימייל: guycoh@outlook.co.il</p>
            <p>כתובת: שמואל הנגיד 6, רמת השרון</p>
          </div>
        </div>

        {receipt && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">קבלה מספר {receipt.id}</h1>
              <p className="text-lg">תאריך: {formatDate(receipt.date)}</p>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-lg text-gray-700 mb-6">
              <tbody>
                <tr className="border border-gray-300">
                  <td className="p-3 font-semibold bg-gray-100">לכבוד:</td>
                  <td className="p-3">{receipt.recipient}</td>
                </tr>
                <tr className="border border-gray-300">
                  <td className="p-3 font-semibold bg-gray-100">אמצעי תשלום:</td>
                  <td className="p-3">{receipt.payment_method}</td>
                </tr>
                {receipt.service && (
                  <tr className="border border-gray-300">
                    <td className="p-3 font-semibold bg-gray-100">שירות:</td>
                    <td className="p-3">{receipt.service}</td>
                  </tr>
                )}
                <tr className="border border-gray-300">
                  <td className="p-3 font-semibold bg-gray-100">כמות:</td>
                  <td className="p-3">{receipt.quantity}</td>
                </tr>
                <tr className="border border-gray-300">
                  <td className="p-3 font-semibold bg-gray-100">מחיר:</td>
                  <td className="p-3">{formatCurrency(receipt.price)}</td>
                </tr>
                <tr className="border border-gray-300 bg-gray-50">
                  <td className="p-3 font-bold">סה"כ לתשלום:</td>
                  <td className="p-3 font-bold">{formatCurrency(receipt.total)}</td>
                </tr>
                {receipt.comment && (
                  <tr className="border border-gray-300">
                    <td className="p-3 font-semibold bg-gray-100">הערות:</td>
                    <td className="p-3">{receipt.comment}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-8 text-center">
              <p className="font-bold">תודה על שיתוף הפעולה!</p>
              <p className="text-sm mt-2">מסמך זה הופק אוטומטית ואינו דורש חתימה.</p>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 space-y-4">
        <button
          onClick={generatePDF}
          disabled={pdfLoading}
          className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300 transition-colors duration-200 print:hidden"
        >
          {pdfLoading ? "מכין PDF..." : "הורד כ-PDF"}
        </button>
        <button
          onClick={() => router.push("/private/admin/receipts")}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 print:hidden"
        >
          חזרה לרשימת הקבלות
        </button>
      </div>
    </div>
  );
};

export default ReceiptDetails;




// "use client";

// import { useRouter, useParams } from "next/navigation";
// import { useEffect, useState, useRef } from "react";
// import Image from "next/image";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";

// interface Receipt {
//   id: number;
//   date: string;
//   recipient: string;
//   payment_method: string;
//   quantity: number;
//   price: number;
//   total: number;
//   comment?: string;
//   service?: string | null;
// }

// const ReceiptDetails = () => {
//   const router = useRouter();
//   const params = useParams<{ id: string }>();
//   const id = params?.id ? Number(params.id) : null;
//   const [receipt, setReceipt] = useState<Receipt | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [pdfLoading, setPdfLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const receiptRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!id) return;

//     const fetchReceipt = async () => {
//       try {
//         const res = await fetch(`/api/receipts/${id}`);
//         if (!res.ok) throw new Error("Failed to fetch receipt");
//         const data = await res.json();
//         setReceipt(data);
//       } catch (err) {
//         setError("שגיאה בטעינת הנתונים. נסה שוב מאוחר יותר.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchReceipt();
//   }, [id]);

//   const formatDate = (dateString: string) => {
//     try {
//       const date = new Date(dateString);
//       return new Intl.DateTimeFormat('he-IL', { 
//         year: 'numeric', 
//         month: '2-digit', 
//         day: '2-digit' 
//       }).format(date);
//     } catch (err) {
//       return dateString; // Return original if formatting fails
//     }
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('he-IL', { 
//       style: 'currency', 
//       currency: 'ILS' 
//     }).format(amount);
//   };

  

//   const generatePDF = async () => {
//     if (!receipt || !receiptRef.current) return;
    
//     setPdfLoading(true);
//     try {
//       const canvas = await html2canvas(receiptRef.current, { 
//         scale: 2,
//         useCORS: true,
//         logging: false
//       });
//       const imgData = canvas.toDataURL("image/png");
  
//       const pdf = new jsPDF("p", "mm", "a4");
  
//       const imgWidth = 210; // רוחב A4 (מ"מ)
//       const imgHeight = (canvas.height * imgWidth) / canvas.width; // שמירה על פרופורציה
  
//       // תוודא שהתמונה לא חורגת מהדף
//       if (imgHeight > 297) { // גובה A4 (מ"מ)
//         const scaleFactor = 297 / imgHeight; // מחשב את יחס הקטנה
//         canvas.height = canvas.height * scaleFactor;
//         canvas.width = canvas.width * scaleFactor;
//       }
  
//       pdf.addImage(imgData, "PNG", 0, 0, 210, (canvas.height * 210) / canvas.width); // הוספת התמונה ל-PDF
//       pdf.save(`receipt_${receipt.id}.pdf`);
//     } catch (error) {
//       console.error("Error generating PDF:", error);
//       setError("שגיאה ביצירת ה-PDF. נסה שוב מאוחר יותר.");
//     } finally {
//       setPdfLoading(false);
//     }
//   };
  



//   if (loading) return <p className="text-center text-gray-500">טוען נתונים...</p>;
//   if (error) return <p className="text-center text-red-500">{error}</p>;

//   return (
//     <div className="max-w-3xl mx-auto p-10 bg-white shadow-lg rounded-xl mt-10 border border-gray-300 relative print:w-full print:max-w-none print:shadow-none print:border-none">
//       {/* Receipt container with ref for PDF generation */}
//       <div ref={receiptRef} className="bg-white p-6 shadow-md">
//         <div className="flex justify-between items-start border-b border-gray-400 pb-4 mb-4">
//           <div className="absolute top-16 left-12 ">
//             <Image
//               src="/assets/myLogo.svg"
//               alt="לוגו מורגי משכנתאות"
//               width={140}
//               height={140}
//             />
//           </div>
//           <div className="text-right text-gray-700 ml-auto">
//             <p className="text-2xl font-bold">מורגי משכנתאות</p>
//             <p>ע.פ: 28979896</p>
//             <p>טלפון: 052-3684844</p>
//             <p>אימייל: guycoh@outlook.co.il</p>
//             <p>כתובת: שמואל הנגיד 6, רמת השרון</p>
//           </div>
//         </div>

//         {receipt && (
//           <>
//             <div className="text-center mb-6">
//               <h1 className="text-2xl font-bold">קבלה מספר {receipt.id}</h1>
//               <p className="text-lg">תאריך: {formatDate(receipt.date)}</p>
//             </div>

//             <table className="w-full border-collapse border border-gray-300 text-lg text-gray-700 mb-6">
//               <tbody>
//                 <tr className="border border-gray-300">
//                   <td className="p-3 font-semibold bg-gray-100">לכבוד:</td>
//                   <td className="p-3">{receipt.recipient}</td>
//                 </tr>
//                 <tr className="border border-gray-300">
//                   <td className="p-3 font-semibold bg-gray-100">אמצעי תשלום:</td>
//                   <td className="p-3">{receipt.payment_method}</td>
//                 </tr>
//                 {receipt.service && (
//                   <tr className="border border-gray-300">
//                     <td className="p-3 font-semibold bg-gray-100">שירות:</td>
//                     <td className="p-3">{receipt.service}</td>
//                   </tr>
//                 )}
//                 <tr className="border border-gray-300">
//                   <td className="p-3 font-semibold bg-gray-100">כמות:</td>
//                   <td className="p-3">{receipt.quantity}</td>
//                 </tr>
//                 <tr className="border border-gray-300">
//                   <td className="p-3 font-semibold bg-gray-100">מחיר:</td>
//                   <td className="p-3">{formatCurrency(receipt.price)}</td>
//                 </tr>
//                 <tr className="border border-gray-300 bg-gray-50">
//                   <td className="p-3 font-bold">סה"כ לתשלום:</td>
//                   <td className="p-3 font-bold">{formatCurrency(receipt.total)}</td>
//                 </tr>
//                 {receipt.comment && (
//                   <tr className="border border-gray-300">
//                     <td className="p-3 font-semibold bg-gray-100">הערות:</td>
//                     <td className="p-3">{receipt.comment}</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>

//             <div className="mt-8 text-center">
//               <p className="font-bold">תודה על שיתוף הפעולה!</p>
//               <p className="text-sm mt-2">מסמך זה הופק אוטומטית ואינו דורש חתימה.</p>
//             </div>
//           </>
//         )}
//       </div>

//       {/* Action buttons */}
//       <div className="mt-6 space-y-4">
//         <button
//           onClick={generatePDF}
//           disabled={pdfLoading}
//           className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300 transition-colors duration-200 print:hidden"
//         >
//           {pdfLoading ? "מכין PDF..." : "הורד כ-PDF"}
//         </button>
//         <button
//           onClick={() => router.push("/private/admin/receipts")}
//           className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 print:hidden"
//         >
//           חזרה לרשימת הקבלות
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ReceiptDetails;



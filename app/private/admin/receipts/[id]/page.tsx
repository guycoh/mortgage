"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

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

  const handlePrint = () => {
    if (!receiptRef.current) return;
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) return <p className="text-center text-gray-500">טוען נתונים...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <>
      <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-lg border border-gray-300 text-right">
        <div ref={receiptRef} className="print-container">
          <div className="flex justify-between items-center border-b pb-2 mb-2">
            <div className="text-sm leading-tight">
              <h2 className="text-lg font-bold">מורגי משכנתאות</h2>
              <p className="text-xs">גיא כהן</p>
              <p className="text-xs">ע.פ: 028979896</p>
              <p className="text-xs">טלפון: 052-3684844</p>
              <p className="text-xs">מייל: guycoh@outlook.co.il</p>
              <p className="text-xs">כתובת: שמואל הנגיד 6, רמת השרון</p>
            </div>
            <Image src="/assets/myLogo.svg" alt="לוגו" width={100} height={100} />
          </div>

          <h1 className="text-lg font-bold text-center">קבלה מס' : {receipt?.id}</h1>

          <p className="mt-2 text-sm"><span className="font-bold">תאריך:</span> {receipt?.date ? formatDate(receipt.date) : ""}</p>
          <p className="mt-2 text-sm"><span className="font-bold">לכבוד:</span> {receipt?.recipient}</p>
          <p className="mt-2 text-sm"><span className="font-bold">אמצעי תשלום:</span> {receipt?.payment_method}</p>
          {receipt?.service && <p className="mt-2 text-sm"><span className="font-bold">שירות:</span> {receipt.service}</p>}
          <p className="mt-2 text-sm"><span className="font-bold">כמות:</span> {receipt?.quantity}</p>
          <p className="mt-2 text-sm"><span className="font-bold">מחיר:</span> ₪{receipt?.price}</p>
          <p className="mt-2 text-sm font-bold"><span className="font-bold">סה"כ לתשלום:</span> ₪{receipt?.total}</p>
          {receipt?.comment && <p className="mt-2 text-sm"><span className="font-bold">הערות:</span> {receipt.comment}</p>}

          <div className="text-center mt-6">
            <Image src="/assets/images/imgFiles/signature.png" alt="חתימה" width={150} height={50} />
            <hr className="border-t-2 border-black w-48 mx-auto mb-2" />
            <p className="text-sm mt-1">חתימה</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 print:hidden">
          <button onClick={handlePrint} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors duration-200">
            הדפס קבלה
          </button>
          <button onClick={() => router.push("/private/admin/receipts")} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
            חזרה לרשימת הקבלות
          </button>
        </div>
      </div>

      {/* סגנון הדפסה – רק לדף הזה */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .print-container,
          .print-container * {
            visibility: visible;
          }

          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          header, footer, .print\\:hidden, nav {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default ReceiptDetails;

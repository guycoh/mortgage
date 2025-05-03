"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";



interface Receipt {
  id: number;
  date: string;
  recipient: string;
  payment_method: string;
  quantity: number;
  price: number;
  total: number;
  comment: string | null;
  service: string | null;
}

const ReceiptTable = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await fetch("/api/receipts");
      if (!response.ok) throw new Error("Failed to fetch receipts");
      const data = await response.json();
      setReceipts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/private/admin/receipts/${id}`);
    // כאן ניתן להוסיף לוגיקת עריכה
  };

  const handleAdd = () => {
    router.push("/private/admin/receipts/new");
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow-lg rounded-lg border-2 border-gray-800">
      <h2 className="text-center text-3xl font-bold text-gray-900 mb-6">רשימת קבלות</h2>
      <button
        onClick={handleAdd}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
      >
        + הוסף קבלה
      </button>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 border-b">ID</th>
            <th className="py-2 px-4 border-b">תאריך</th>
            <th className="py-2 px-4 border-b">נמען</th>
            <th className="py-2 px-4 border-b">תשלום</th>
            <th className="py-2 px-6 border-b w-48">שירות</th>
            <th className="py-2 px-4 border-b">כמות</th>
            <th className="py-2 px-4 border-b">מחיר</th>
            <th className="py-2 px-4 border-b">סה"כ</th>
            <th className="py-2 px-4 border-b">עריכה</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((receipt) => (
            <tr key={receipt.id}>
              <td className="py-2 px-4 border-b">{receipt.id}</td>
              <td className="py-2 px-4 border-b">{new Date(receipt.date).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b">{receipt.recipient}</td>
              <td className="py-2 px-4 border-b">{receipt.payment_method}</td>
              <td className="py-2 px-6 border-b w-48">{receipt.service || "לא צוין"}</td>
              <td className="py-2 px-4 border-b">{receipt.quantity}</td>
              <td className="py-2 px-4 border-b">{receipt.price}</td>
              <td className="py-2 px-4 border-b">{receipt.total}</td>
              <td className="py-2 px-4 border-b text-center">
                <button
                  onClick={() => handleEdit(receipt.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  ערוך
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReceiptTable;

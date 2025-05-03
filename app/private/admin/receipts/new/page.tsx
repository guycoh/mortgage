"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Receipt {
  date: Date;
  recipient: string;
  payment_method: string;
  service: string;
  quantity: number;
  price: number;
  comment: string | null;
}

const ReceiptForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<Receipt>({
    date: new Date(),
    recipient: "",
    payment_method: "",
    service: "",
    quantity: 1,
    price: 0,
    comment: "",
  });

  const total = formData.quantity * formData.price;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, date: formData.date.toISOString().split("T")[0] }),
      });
      if (response.ok) {
        alert("קבלה נוספה בהצלחה");
        router.push("/");
      } else {
        alert("שגיאה בהוספת קבלה");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("שגיאה לא ידועה");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white border-2 border-gray-800 shadow-lg rounded-lg">
      <h2 className="text-center text-2xl font-bold mb-6">טופס קבלה</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          תאריך:
          <input
            type="date"
            name="date"
            value={formData.date.toISOString().split("T")[0]}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />
        </label>

        <label className="block">
          נמען:
          <input
            type="text"
            name="recipient"
            value={formData.recipient}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />
        </label>

        <label className="block">
          שיטת תשלום:
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          >
            <option value="">בחר שיטת תשלום</option>
            <option value="מזומן">מזומן</option>
            <option value="המחאה">המחאה</option>
            <option value="העברה בנקאית">העברה בנקאית</option>
            <option value="כרטיס אשראי">כרטיס אשראי</option>
          </select>
        </label>

        <label className="block">
          שירות:
          <input
            type="text"
            name="service"
            value={formData.service}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />
        </label>

        <label className="block">
          כמות:
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />
        </label>

        <label className="block">
          מחיר:
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />
        </label>

        <label className="block">
          סה"כ:
          <input
            type="number"
            value={total}
            readOnly
            className="w-full p-2 border rounded-md bg-gray-200"
          />
        </label>

        <label className="block">
          הערות:
          <textarea
            name="comment"
            value={formData.comment || ""}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />
        </label>

        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          הוסף קבלה
        </button>
      </form>
    </div>
  );
};

export default ReceiptForm;

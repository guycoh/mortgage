"use client"

import { useEffect, useState, Fragment } from "react";
import { paths } from "@/app/data/paths";
import AmortizationModal from "./AmortizationModal";

type LoanRow = {
  id: string;
  amount: number;
  rate: number;
  months: number;
  pathId: number;
  indexed: boolean;
  endDate?: string;
};

type LoanTableProps = {
  clientId: number;
  mixId: string;
  monthlyInflation: number;
};

export default function LoanTable({
  clientId,
  mixId,
  monthlyInflation,
}: LoanTableProps) {
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<LoanRow | null>(null);
  
  const annualInflation = monthlyInflation * 12; // פשטני, אפשר גם להשתמש בנוסחה של צמיחה מצטברת אם רוצים

  useEffect(() => {
    const defaultRows: LoanRow[] = Array.from({ length: 3 }, (_, i) => ({
      id: `${mixId}-${i + 1}`,
      amount: 0,
      rate: 0,
      months: 0,
      pathId: paths[0].id,
      indexed: false,
      endDate: "",
    }));
    setRows(defaultRows);
  }, [mixId]);

  const updateRow = (id: string, field: keyof LoanRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        let updatedRow = { ...r, [field]: value };

        if (field === "endDate" && value) {
          const today = new Date();
          const end = new Date(value);
          const monthsDiff = Math.max(
            0,
            end.getFullYear() * 12 +
              end.getMonth() -
              (today.getFullYear() * 12 + today.getMonth())
          );
          updatedRow.months = monthsDiff;
        }

        return updatedRow;
      })
    );
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const calculateMonthlyPayment = (amount: number, rate: number, months: number) => {
    if (months === 0) return 0;
    const monthlyRate = rate / 12 / 100;
    return monthlyRate === 0
      ? amount / months
      : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">#</th>
            <th className="border p-2">סכום הלוואה</th>
            <th className="border p-2 min-w-[140px]">מסלול</th>
            <th className="border p-2 w-14">מרווח</th>
            <th className="border p-2">ריבית שנתית %</th>
            <th className="border p-2">מספר חודשים</th>
            <th className="border p-2">תאריך סיום</th>
            <th className="border p-2">תשלום חודשי</th>
            <th className="border p-2">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const amount = row.amount || 0;
            const rate = row.rate || 0;
            const months = row.months || 0;
            const monthlyPayment = calculateMonthlyPayment(amount, rate, months);

            return (
              <Fragment key={row.id}>
                <tr>
                  <td className="border p-2 text-center">{idx + 1}</td>

                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.amount || ""}
                      onChange={(e) =>
                        updateRow(row.id, "amount", parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-1 border rounded"
                      placeholder="סכום"
                    />
                  </td>

                  <td className="border p-2">
                    <select
                      value={row.pathId}
                      onChange={(e) => {
                        const selectedPath = paths.find(
                          (p) => p.id === parseInt(e.target.value)
                        );
                        if (!selectedPath) return;
                        updateRow(row.id, "pathId", selectedPath.id);
                        updateRow(row.id, "indexed", selectedPath.indexed);
                      }}
                      className="w-full p-1 border rounded"
                    >
                      {paths.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="border p-2 w-14">
                    <input
                      type="text"
                      maxLength={4}
                      className="w-full p-1 border rounded text-center"
                      placeholder="+0.5"
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.rate || ""}
                      onChange={(e) =>
                        updateRow(row.id, "rate", parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-1 border rounded"
                      placeholder="ריבית"
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.months || ""}
                      onChange={(e) =>
                        updateRow(row.id, "months", parseInt(e.target.value) || 0)
                      }
                      className="w-full p-1 border rounded"
                      placeholder="חודשים"
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="date"
                      value={row.endDate || ""}
                      onChange={(e) => updateRow(row.id, "endDate", e.target.value)}
                      className="w-full p-1 border rounded text-center"
                    />
                  </td>

                  <td className="border p-2 text-center">
                    {monthlyPayment > 0 ? monthlyPayment.toFixed(2) : ""}
                  </td>

                  <td className="border p-2 flex gap-2">
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      onClick={() => {
                        setSelectedRow(row);
                        setIsModalOpen(true);
                      }}
                    >
                      לוח סילוקין
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      onClick={() => deleteRow(row.id)}
                    >
                      מחיקה
                    </button>
                  </td>
                </tr>

                <tr className="bg-red-100 text-sm text-gray-700 hidden ">
                  <td className="border p-2 text-center">—</td>
                  <td className="border p-2">
                    אינפלציה חודשית:{" "}
                    <span className="font-bold text-orange-600">
                      {monthlyInflation.toFixed(3)}%
                    </span>
                  </td>
                  <td className="border p-2">Client ID: {clientId}</td>
                  <td className="border p-2">Mix ID: {mixId}</td>
                  <td className="border p-2">
                    צמוד: <input type="checkbox" checked={row.indexed} readOnly />
                  </td>
                  <td className="border p-2">—</td>
                  <td className="border p-2">—</td>
                  <td className="border p-2">—</td>
                  <td className="border p-2">—</td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* המודל */}
      {/* המודל */}
{selectedRow && (
  <AmortizationModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    loan={{
      amount: selectedRow.amount || 0,
      months: selectedRow.months || 0,
      isIndexed: selectedRow.indexed || false,
      annualRate: selectedRow.rate || 0,
      monthlyRate: (selectedRow.rate || 0) / 12, // ריבית חודשית (ב־%)
      annualIndex: annualInflation,              // מדד שנתי %
    }}
  />
)}


    </div>
  );
}

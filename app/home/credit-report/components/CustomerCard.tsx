import { ParsedCreditReport } from "../lib/parseCreditReport";

export function CustomerCard({ data }: { data: ParsedCreditReport }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="text-gray-500 text-sm">לקוח</div>

      <div className="text-lg font-bold">{data.fullName}</div>
      <div className="text-gray-600">{data.idNumber}</div>
    </div>
  );
}
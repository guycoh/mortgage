import { ParsedCreditReport } from "../lib/parseCreditReport";

export function KpiRow({ data }: { data: ParsedCreditReport }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Kpi title="ציון אשראי" value={data.score} />
      <Kpi title="הלוואות" value={data.totalLoans} />
      <Kpi title="החזר חודשי" value={`₪${data.monthlyPayment}`} />
      <Kpi title="אירועים שליליים" value={data.negativeEvents} />
    </div>
  );
}

function Kpi({ title, value }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow text-center">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
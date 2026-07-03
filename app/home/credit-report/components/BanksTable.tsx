import { ParsedCreditReport } from "../lib/parseCreditReport";

export function BanksTable({
  banks,
}: {
  banks: ParsedCreditReport["banks"];
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="font-bold mb-4">בנקים</div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-left">
            <th>בנק</th>
            <th>יתרה</th>
            <th>סטטוס</th>
          </tr>
        </thead>

        <tbody>
          {banks.map((b, i) => (
            <tr key={i} className="border-t">
              <td className="py-2">{b.name}</td>
              <td>₪{b.balance.toLocaleString()}</td>
              <td
                className={
                  b.status === "good"
                    ? "text-green-600"
                    : b.status === "warning"
                    ? "text-yellow-500"
                    : "text-red-600"
                }
              >
                {b.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
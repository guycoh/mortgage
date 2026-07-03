import { ParsedCreditReport } from "../lib/parseCreditReport";

export function AlertsCard({ data }: { data: ParsedCreditReport }) {
  const alerts = [];

  if (data.negativeEvents > 0) {
    alerts.push("קיימים אירועים שליליים");
  }

  if (data.score < 600) {
    alerts.push("ציון אשראי נמוך");
  }

  if (data.creditUtilization > 70) {
    alerts.push("ניצול אשראי גבוה");
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="font-bold mb-2">התראות</div>

      {alerts.length === 0 ? (
        <div className="text-green-600">אין התראות</div>
      ) : (
        <ul className="space-y-1 text-red-600">
          {alerts.map((a, i) => (
            <li key={i}>⚠ {a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

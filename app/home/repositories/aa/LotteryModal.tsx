"use client";

import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
};

export default function LotteryModal({
  open,
  onClose,
  data,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const kpis = useMemo(() => {
    if (!data) return null;

    return {
      units: data.LotteryHousingUnits || 0,
      subscribers: data.Subscribers || 0,
      winners: data.Winners || 0,
      price: data.PriceForMeter || "-",
    };
  }, [data]);

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      
      {/* CARD */}
      <div className="w-full md:w-[1100px] max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">

        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0B2F42] via-[#145374] to-[#1D75A1] text-white p-5 flex justify-between items-start rounded-t-3xl">
          
          <div>
            <h2 className="text-xl font-bold">
              {data.LamasName || "הגרלה"}
            </h2>

            <p className="text-sm opacity-80">
              {data.Neighborhood} • {data.LotteryStatusValue}
            </p>
          </div>

          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 rounded-full w-9 h-9"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">

          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <Kpi label="דירות" value={kpis?.units} />
            <Kpi label="נרשמים" value={kpis?.subscribers} />
            <Kpi label="זוכים" value={kpis?.winners} />
            <Kpi label="מחיר למ״ר" value={kpis?.price} />

          </div>

          {/* INFO */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">

            <Row label="יזם" value={data.ProviderName} />
            <Row label="פרויקט" value={data.ProjectName} />
            <Row label="מס' פרויקט" value={data.ProjectId} />
            <Row label="סוג הגרלה" value={data.LotteryType} />
            <Row label="שיווק" value={data.MarketingMethodDesc} />
            <Row label="סטטוס" value={data.ProjectStatus} />

          </div>

          {/* DATES */}
          <div className="bg-white border rounded-2xl p-4 text-sm space-y-2">

            <Row label="סיום הרשמה" value={data.LotteryEndSignupDate} />
            <Row label="ביצוע הגרלה" value={data.LotteryExecutionDate} />

          </div>

          {/* ADVANCED */}
          <div className="border rounded-2xl overflow-hidden">

            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full p-4 text-right bg-gray-100 hover:bg-gray-200 font-semibold"
            >
              מידע מתקדם {showAll ? "▲" : "▼"}
            </button>

            {showAll && (
              <div className="p-4 text-xs space-y-2 max-h-[300px] overflow-auto">

                {Object.entries(data).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b py-1"
                  >
                    <span className="text-gray-600">{key}</span>
                    <span className="text-gray-900 break-all">
                      {String(value)}
                    </span>
                  </div>
                ))}

              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border hover:bg-gray-50"
          >
            סגור
          </button>

        </div>
      </div>
    </div>
  );
}

/* KPI */
function Kpi({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

/* ROW */
function Row({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">
        {value ?? "-"}
      </span>
    </div>
  );
}
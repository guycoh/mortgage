"use client";

import { useState, useMemo } from "react";
import { useHaglot } from "@/app/data/hooks/useHaglot";
import LotteryModal from "./LotteryModal";

type LotteryRecord = {
  LotteryHousingUnits: number;
  Subscribers: number;
  Winners: number;

  LamasName: string;
  Neighborhood: string;
  ProviderName: string;

  PriceForMeter: string;
  LotteryStatusValue: string;

  LotteryId?: number;
};





export default function HaglotDashboard() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] =
    useState<LotteryRecord | null>(null);

  const { data = [], isLoading } = useHaglot(search);

  /* KPIs */
 const kpis = useMemo(() => {
  return {
    total: data.length,

    totalDirot: data.reduce(
      (sum, item) =>
        sum + Number(item.LotteryHousingUnits || 0),
      0
    ),

    totalSubscribers: data.reduce(
      (sum, item) =>
        sum + Number(item.Subscribers || 0),
      0
    ),

    totalWinners: data.reduce(
      (sum, item) =>
        sum + Number(item.Winners || 0),
      0
    ),
  };
}, [data]);

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <h1 className="text-2xl font-bold">
          מעקב הגרלות דירה בהנחה
        </h1>

        <input
          className="border rounded-xl px-4 py-2 w-full md:w-64"
          placeholder="חיפוש עיר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="סה״כ הגרלות" value={kpis.total} />
        <KpiCard title="סה״כ דירות" value={kpis.totalDirot} />
        <KpiCard title="סה״כ נרשמים" value={kpis.totalSubscribers} />
        <KpiCard title="סה״כ זוכים" value={kpis.totalWinners} />
      </div>

      {/* TABLE */}
      <div className="overflow-auto rounded-xl border bg-white">

        <table className="w-full text-sm">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-right">עיר</th>
              <th className="p-3 text-right">שכונה</th>
              <th className="p-3 text-right">יזם</th>
              <th className="p-3 text-right">דירות</th>
              <th className="p-3 text-right">נרשמים</th>
              <th className="p-3 text-right">זוכים</th>
              <th className="p-3 text-right">סיכוי</th>
              <th className="p-3 text-right">מחיר</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>

          <tbody>

            {isLoading ? (
              <tr>
                <td
                  className="p-4 text-center"
                  colSpan={9}
                >
                  טוען נתונים...
                </td>
              </tr>
            ) : (
              data.map((item: LotteryRecord, i: number) => {
                const chance =
                  item.Subscribers > 0
                    ? (
                        (item.Winners /
                          item.Subscribers) *
                        100
                      ).toFixed(2)
                    : "0";

                return (
                  <tr
                    key={i}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-3">
                      {item.LamasName}
                    </td>

                    <td className="p-3">
                      {item.Neighborhood}
                    </td>

                    <td className="p-3">
                      {item.ProviderName}
                    </td>

                    <td className="p-3">
                      {item.LotteryHousingUnits}
                    </td>

                    <td className="p-3">
                      {item.Subscribers.toLocaleString()}
                    </td>

                    <td className="p-3">
                      {item.Winners}
                    </td>

                    <td className="p-3">{chance}%</td>

                    <td className="p-3">
                      ₪ {item.PriceForMeter}
                    </td>

                    {/* BUTTON */}
                    <td className="p-3">
                      <button
                        onClick={() =>
                          setSelected(item)
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-xs"
                      >
                        פרטי הגרלה
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <LotteryModal
        open={!!selected}
        data={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

/* KPI CARD */
function KpiCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="text-gray-500 text-sm">
        {title}
      </div>
      <div className="text-2xl font-bold">
        {value.toLocaleString()}
      </div>
    </div>
  );
}






// "use client";

// import { useState, useMemo } from "react";
// import { useHaglot } from "@/app/data/hooks/useHaglot";
// import LotteryModal from "./LotteryModal";


// type LotteryRecord = {
//   LotteryHousingUnits: number;
//   Subscribers: number;
//   Winners: number;

//   LamasName: string;
//   Neighborhood: string;
//   ProviderName: string;

//   PriceForMeter: string;
//   LotteryStatusValue: string;
// };

// export default function HaglotDashboard() {
//   const [search, setSearch] = useState("");
//   const { data = [], isLoading } = useHaglot(search);

//   const kpis = useMemo(() => {
//     const total = data.length;

//     const totalDirot = data.reduce(
//       (sum: number, item: LotteryRecord) =>
//         sum + Number(item.LotteryHousingUnits || 0),
//       0
//     );

//     const totalSubscribers = data.reduce(
//       (sum: number, item: LotteryRecord) =>
//         sum + Number(item.Subscribers || 0),
//       0
//     );

//     const totalWinners = data.reduce(
//       (sum: number, item: LotteryRecord) =>
//         sum + Number(item.Winners || 0),
//       0
//     );

//     return {
//       total,
//       totalDirot,
//       totalSubscribers,
//       totalWinners,
//     };
//   }, [data]);

//   return (
//     <div className="p-6 space-y-6">
//       {/* Header */}
//       <div className="flex flex-col md:flex-row gap-3 justify-between">
//         <h1 className="text-2xl font-bold">
//           מעקב הגרלות דירה בהנחה
//         </h1>

//         <input
//           className="border rounded-xl px-4 py-2 w-full md:w-64"
//           placeholder="חיפוש עיר..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//       </div>

//       {/* KPIs */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         <KpiCard title="סה״כ הגרלות" value={kpis.total} />
//         <KpiCard title="סה״כ דירות" value={kpis.totalDirot} />
//         <KpiCard title="סה״כ נרשמים" value={kpis.totalSubscribers} />
//         <KpiCard title="סה״כ זוכים" value={kpis.totalWinners} />
//       </div>

//       {/* Table */}
//       <div className="overflow-auto rounded-xl border">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="p-3 text-right">עיר</th>
//               <th className="p-3 text-right">שכונה</th>
//               <th className="p-3 text-right">יזם</th>
//               <th className="p-3 text-right">דירות</th>
//               <th className="p-3 text-right">נרשמים</th>
//               <th className="p-3 text-right">זוכים</th>
//               <th className="p-3 text-right">סיכוי זכייה</th>
//               <th className="p-3 text-right">מחיר למ"ר</th>
//             </tr>
//           </thead>

//           <tbody>
//             {isLoading ? (
//               <tr>
//                 <td className="p-4 text-center" colSpan={8}>
//                   טוען נתונים...
//                 </td>
//               </tr>
//             ) : (
//               data.map((item: LotteryRecord, i: number) => {
//                 const chance =
//                   item.Subscribers > 0
//                     ? (
//                         (item.Winners / item.Subscribers) *
//                         100
//                       ).toFixed(2)
//                     : "0";

//                 return (
//                   <tr
//                     key={i}
//                     className="border-t hover:bg-gray-50"
//                   >
//                     <td className="p-3">{item.LamasName}</td>

//                     <td className="p-3">
//                       {item.Neighborhood}
//                     </td>

//                     <td className="p-3">
//                       {item.ProviderName}
//                     </td>

//                     <td className="p-3">
//                       {item.LotteryHousingUnits}
//                     </td>

//                     <td className="p-3">
//                       {item.Subscribers.toLocaleString()}
//                     </td>

//                     <td className="p-3">
//                       {item.Winners}
//                     </td>

//                     <td className="p-3">
//                       {chance}%
//                     </td>

//                     <td className="p-3">
//                       ₪ {item.PriceForMeter}
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// function KpiCard({
//   title,
//   value,
// }: {
//   title: string;
//   value: number;
// }) {
//   return (
//     <div className="rounded-2xl border p-4 bg-white shadow-sm">
//       <div className="text-gray-500 text-sm">
//         {title}
//       </div>

//       <div className="text-2xl font-bold">
//         {value.toLocaleString()}
//       </div>
//     </div>
//   );
// }
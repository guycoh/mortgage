"use client";

import { useEffect, useState } from "react";

type Term = {
  id?: number;
  track: string;
  anchor_rate?: number;
  anchor_margin?: number;
  max_ltv?: number;
  second_lien?: boolean;
  max_years?: number;
  max_age?: number;
  notes?: string;
  opening_fee_fixed?: number;
  opening_fee_percent?: number;
  complex_clients?: boolean;
  is_active?: boolean;
  display_order?: number;
};

type Body = {
  id: number;
  name: string;
  is_non_bank: boolean;
  is_inactive: boolean;
  financing_terms: Term[];
};

export default function FinancingBodiesTable() {
  const [data, setData] = useState<Body[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/financing-bodies")
      .then((res) => res.json())
      .then((res) => {
        setData(res.data || []);
        setLoading(false);
      });
  }, []);

  const updateBody = (bodyIndex: number, field: string, value: any) => {
    const copy = [...data];
    (copy[bodyIndex] as any)[field] = value;
    setData(copy);
  };

  const updateTerm = (
    bodyIndex: number,
    termIndex: number,
    field: string,
    value: any
  ) => {
    const copy = [...data];
    (copy[bodyIndex].financing_terms[termIndex] as any)[field] = value;
    setData(copy);
  };

  const addTerm = (bodyIndex: number) => {
    const copy = [...data];
    copy[bodyIndex].financing_terms.push({
      track: "",
      is_active: true,
      display_order: 0,
    });
    setData(copy);
  };

  const saveBody = async (body: Body) => {
    await fetch("/api/financing-bodies/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    alert("נשמר בהצלחה");
  };

  if (loading) return <div>טוען...</div>;

  return (
    <div className="p-6 space-y-8">
      {data.map((body, bodyIndex) => (
        <div
          key={body.id}
          className="border rounded-xl p-4 shadow-sm bg-white"
        >
          {/* HEADER */}
          <div className="flex items-center gap-3 mb-4">
            <input
              className="border p-2 rounded w-64"
              value={body.name}
              onChange={(e) =>
                updateBody(bodyIndex, "name", e.target.value)
              }
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={body.is_non_bank}
                onChange={(e) =>
                  updateBody(bodyIndex, "is_non_bank", e.target.checked)
                }
              />
              חוץ בנקאי
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={body.is_inactive}
                onChange={(e) =>
                  updateBody(bodyIndex, "is_inactive", e.target.checked)
                }
              />
              לא פעיל
            </label>

            <button
              onClick={() => saveBody(body)}
              className="ml-auto bg-blue-600 text-white px-4 py-2 rounded"
            >
              שמור
            </button>
          </div>

          {/* TERMS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">מסלול</th>
                  <th className="p-2">עוגן</th>
                  <th className="p-2">מרווח</th>
                  <th className="p-2">אחוז מימון מקסימלי</th>
                  <th className="p-2">שנים</th>
                  <th className="p-2">גיל</th>
                  <th className="p-2">פעיל</th>
                </tr>
              </thead>

              <tbody>
                {body.financing_terms.map((term, termIndex) => (
                  <tr key={termIndex} className="border-t">
                    <td className="p-2">
                      <input
                        className="border p-1 w-32"
                        value={term.track}
                        onChange={(e) =>
                          updateTerm(
                            bodyIndex,
                            termIndex,
                            "track",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        className="border p-1 w-20"
                        value={term.anchor_rate || ""}
                        onChange={(e) =>
                          updateTerm(
                            bodyIndex,
                            termIndex,
                            "anchor_rate",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        className="border p-1 w-20"
                        value={term.anchor_margin || ""}
                        onChange={(e) =>
                          updateTerm(
                            bodyIndex,
                            termIndex,
                            "anchor_margin",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        className="border p-1 w-20"
                        value={term.max_ltv || ""}
                        onChange={(e) =>
                          updateTerm(
                            bodyIndex,
                            termIndex,
                            "max_ltv",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        className="border p-1 w-20"
                        value={term.max_years || ""}
                        onChange={(e) =>
                          updateTerm(
                            bodyIndex,
                            termIndex,
                            "max_years",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        className="border p-1 w-20"
                        value={term.max_age || ""}
                        onChange={(e) =>
                          updateTerm(
                            bodyIndex,
                            termIndex,
                            "max_age",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={term.is_active ?? true}
                        onChange={(e) =>
                          updateTerm(
                            bodyIndex,
                            termIndex,
                            "is_active",
                            e.target.checked
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => addTerm(bodyIndex)}
            className="mt-3 bg-green-600 text-white px-3 py-1 rounded"
          >
            + הוסף מסלול
          </button>
        </div>
      ))}
    </div>
  );
}





















// "use client";

// import { useEffect, useState } from "react";

// type Term = {
//   id?: number;
//   track: string;
//   anchor_rate?: number;
//   anchor_margin?: number;
//   max_ltv?: number;
//   second_lien?: boolean;
//   max_years?: number;
//   max_age?: number;
//   notes?: string;
//   opening_fee_fixed?: number;
//   opening_fee_percent?: number;
//   complex_clients?: boolean;
//   is_active?: boolean;
//   display_order?: number;
// };

// type Body = {
//   id: number;
//   name: string;
//   is_non_bank: boolean;
//   is_inactive: boolean;
//   financing_terms: Term[];
// };

// export default function FinancingBodiesTable() {
//   const [data, setData] = useState<Body[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetch("/api/financing-bodies")
//       .then((res) => res.json())
//       .then((res) => {
//         setData(res.data || []);
//         setLoading(false);
//       });
//   }, []);

//   const updateBody = (bodyIndex: number, field: string, value: any) => {
//     const copy = [...data];
//     (copy[bodyIndex] as any)[field] = value;
//     setData(copy);
//   };

//   const updateTerm = (
//     bodyIndex: number,
//     termIndex: number,
//     field: string,
//     value: any
//   ) => {
//     const copy = [...data];
//     (copy[bodyIndex].financing_terms[termIndex] as any)[field] = value;
//     setData(copy);
//   };

//   const addTerm = (bodyIndex: number) => {
//     const copy = [...data];
//     copy[bodyIndex].financing_terms.push({
//       track: "",
//       is_active: true,
//       display_order: 0,
//     });
//     setData(copy);
//   };

//   const saveBody = async (body: Body) => {
//     await fetch("/api/financing-bodies/update", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });
//     alert("נשמר בהצלחה");
//   };

//   if (loading) return <div>טוען...</div>;

//   return (
//     <div className="p-6 space-y-8">
//       {data.map((body, bodyIndex) => (
//         <div
//           key={body.id}
//           className="border rounded-xl p-4 shadow-sm bg-white"
//         >
//           {/* HEADER */}
//           <div className="flex items-center gap-3 mb-4">
//             <input
//               className="border p-2 rounded w-64"
//               value={body.name}
//               onChange={(e) =>
//                 updateBody(bodyIndex, "name", e.target.value)
//               }
//             />

//             <label className="flex items-center gap-2 text-sm">
//               <input
//                 type="checkbox"
//                 checked={body.is_non_bank}
//                 onChange={(e) =>
//                   updateBody(bodyIndex, "is_non_bank", e.target.checked)
//                 }
//               />
//               חוץ בנקאי
//             </label>

//             <label className="flex items-center gap-2 text-sm">
//               <input
//                 type="checkbox"
//                 checked={body.is_inactive}
//                 onChange={(e) =>
//                   updateBody(bodyIndex, "is_inactive", e.target.checked)
//                 }
//               />
//               לא פעיל
//             </label>

//             <button
//               onClick={() => saveBody(body)}
//               className="ml-auto bg-blue-600 text-white px-4 py-2 rounded"
//             >
//               שמור
//             </button>
//           </div>

//           {/* TERMS TABLE */}
//           <div className="overflow-x-auto">
//             <table className="w-full border text-sm">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="p-2">מסלול</th>
//                   <th className="p-2">עוגן</th>
//                   <th className="p-2">מרווח</th>
//                   <th className="p-2">LTV</th>
//                   <th className="p-2">שנים</th>
//                   <th className="p-2">גיל</th>
//                   <th className="p-2">פעיל</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {body.financing_terms.map((term, termIndex) => (
//                   <tr key={termIndex} className="border-t">
//                     <td className="p-2">
//                       <input
//                         className="border p-1 w-32"
//                         value={term.track}
//                         onChange={(e) =>
//                           updateTerm(
//                             bodyIndex,
//                             termIndex,
//                             "track",
//                             e.target.value
//                           )
//                         }
//                       />
//                     </td>

//                     <td className="p-2">
//                       <input
//                         type="number"
//                         className="border p-1 w-20"
//                         value={term.anchor_rate || ""}
//                         onChange={(e) =>
//                           updateTerm(
//                             bodyIndex,
//                             termIndex,
//                             "anchor_rate",
//                             Number(e.target.value)
//                           )
//                         }
//                       />
//                     </td>

//                     <td className="p-2">
//                       <input
//                         type="number"
//                         className="border p-1 w-20"
//                         value={term.anchor_margin || ""}
//                         onChange={(e) =>
//                           updateTerm(
//                             bodyIndex,
//                             termIndex,
//                             "anchor_margin",
//                             Number(e.target.value)
//                           )
//                         }
//                       />
//                     </td>

//                     <td className="p-2">
//                       <input
//                         type="number"
//                         className="border p-1 w-20"
//                         value={term.max_ltv || ""}
//                         onChange={(e) =>
//                           updateTerm(
//                             bodyIndex,
//                             termIndex,
//                             "max_ltv",
//                             Number(e.target.value)
//                           )
//                         }
//                       />
//                     </td>

//                     <td className="p-2">
//                       <input
//                         type="number"
//                         className="border p-1 w-20"
//                         value={term.max_years || ""}
//                         onChange={(e) =>
//                           updateTerm(
//                             bodyIndex,
//                             termIndex,
//                             "max_years",
//                             Number(e.target.value)
//                           )
//                         }
//                       />
//                     </td>

//                     <td className="p-2">
//                       <input
//                         type="number"
//                         className="border p-1 w-20"
//                         value={term.max_age || ""}
//                         onChange={(e) =>
//                           updateTerm(
//                             bodyIndex,
//                             termIndex,
//                             "max_age",
//                             Number(e.target.value)
//                           )
//                         }
//                       />
//                     </td>

//                     <td className="p-2 text-center">
//                       <input
//                         type="checkbox"
//                         checked={term.is_active ?? true}
//                         onChange={(e) =>
//                           updateTerm(
//                             bodyIndex,
//                             termIndex,
//                             "is_active",
//                             e.target.checked
//                           )
//                         }
//                       />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <button
//             onClick={() => addTerm(bodyIndex)}
//             className="mt-3 bg-green-600 text-white px-3 py-1 rounded"
//           >
//             + הוסף מסלול
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// }
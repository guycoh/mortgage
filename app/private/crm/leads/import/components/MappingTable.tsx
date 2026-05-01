// /app/private/crm/leads/import/components/MappingTable.tsx
"use client";
import { useMemo } from "react";
import { leadFields } from "../utils/leadFields";

export default function MappingTable({
  headers,
  setMapping,
  mapping,
}: any) {
  const selectedFields = useMemo(() => {
    return Object.values(mapping || {});
  }, [mapping]);

  return (
    <div className="space-y-4">
      {headers.map((header: string) => (
        <div key={header} className="flex gap-4">
          <div className="w-1/2 font-medium">{header}</div>

          <select
            className="w-1/2 border p-2 rounded"
            value={mapping?.[header] || ""}
            onChange={(e) =>
              setMapping((prev: any) => ({
                ...prev,
                [header]: e.target.value,
              }))
            }
          >
            <option value="">בחר שדה</option>

            {leadFields.map((field) => (
              <option
                key={field.key}
                value={field.key}
                disabled={
                  selectedFields.includes(field.key) &&
                  mapping?.[header] !== field.key
                }
              >
                {field.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
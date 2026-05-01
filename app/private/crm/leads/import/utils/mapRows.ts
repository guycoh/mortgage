// /app/private/crm/leads/import/utils/mapRows.ts

export function mapRows(
  headers: string[],
  rows: any[],
  mapping: Record<string, string>
) {
  return rows.map((row) => {
    const obj: any = {};

    headers.forEach((header, index) => {
      const field = mapping[header];
      if (field) {
        obj[field] = row[index];
      }
    });

    return obj;
  });
}
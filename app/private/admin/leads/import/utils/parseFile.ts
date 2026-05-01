// /app/private/crm/leads/import/utils/parseFile

import * as XLSX from "xlsx";

export async function parseFile(file: File) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = data[0] as string[];
  const rows = data.slice(1);

  return { headers, rows };
}
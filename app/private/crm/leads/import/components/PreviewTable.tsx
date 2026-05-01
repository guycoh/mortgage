// /app/private/crm/leads/import/components/PreviewTable.tsx

export default function PreviewTable({ data }: { data: any[] }) {
  if (!data.length) return null;

  return (
    <table className="w-full border">
      <thead>
        <tr>
          {Object.keys(data[0]).map((key) => (
            <th key={key} className="border p-2">
              {key}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {Object.values(row).map((val: any, j) => (
              <td key={j} className="border p-2">
                {val}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
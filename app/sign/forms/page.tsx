import { createClient } from "@/utils/supabase/server";

export default async function FormsPage() {
  const supabase = await createClient(); // ← חשוב!!

  const { data: forms, error } = await supabase
    .from("forms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <div>שגיאה בטעינת טפסים</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">טפסים</h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th>שם</th>
            <th>קובץ</th>
            <th>נוצר</th>
          </tr>
        </thead>
        <tbody>
          {forms?.map((form) => (
            <tr key={form.id}>
              <td>{form.name}</td>
              <td>{form.file_path}</td>
              <td>
                {new Date(form.created_at).toLocaleDateString("he-IL")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

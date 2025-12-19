import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import DeleteFormButton from "./DeleteFormButton";

export default async function FormsPage() {
  const supabase = await createClient();

  const { data: forms, error } = await supabase
    .from("forms")
    .select("id, title, original_name, file_path, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-6 text-red-600">שגיאה בטעינת טפסים</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ניהול טפסים</h1>

        <Link
          href="/sign/forms/new"
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          ➕ הוסף טופס
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="p-3 text-right">ID</th>
              <th className="p-3 text-right">כותרת</th>
              <th className="p-3 text-right">שם קובץ</th>
              <th className="p-3 text-right">נוצר</th>
              <th className="p-3 text-center">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {forms?.map((form) => (
              <tr
                key={form.id}
                className="border-t hover:bg-gray-50 transition"
              >
                {/* ID */}
                <td
                  className="p-3 font-mono text-xs text-gray-500"
                  title={form.id}
                >
                  {form.id.slice(0, 8)}…
                </td>

                {/* כותרת */}
                <td className="p-3 font-medium">
                  {form.title || "—"}
                </td>

                {/* שם קובץ */}
                <td className="p-3 text-sm text-gray-600">
                  {form.original_name}
                </td>

                {/* תאריך */}
                <td className="p-3 text-sm">
                  {new Date(form.created_at).toLocaleDateString("he-IL")}
                </td>

                {/* פעולות */}
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/sign/forms/${form.id}/template`}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      תבנית
                    </Link>

                    <DeleteFormButton formId={form.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {forms?.length === 0 && (
        <p className="text-gray-500 mt-6">אין טפסים עדיין</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Template = {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      const res = await fetch("/sign/api/templates/list");
      const data = await res.json();
      setTemplates(data.templates || []);
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  if (loading) return <p>טוען...</p>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link
          href="/sign/templates/new"
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          ➕ הוסף תבנית
        </Link>
      </div>

      <table className="w-full border border-gray-300 rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-right">שם התבנית</th>
            <th className="p-3 text-right">קובץ</th>
            <th className="p-3 text-right">נוצר</th>
            <th className="p-3 text-center">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {templates.map((tpl) => (
            <tr key={tpl.id} className="border-t">
              <td className="p-3">{tpl.title}</td>
              <td className="p-3 text-sm text-gray-600">
                <a
                  href={`/templates/${tpl.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  הצג PDF
                </a>
              </td>
              <td className="p-3 text-sm">
                {new Date(tpl.created_at).toLocaleDateString("he-IL")}
              </td>
              <td className="p-3 text-center flex gap-3 justify-center">
                <Link
                  href={`/sign/templates/${tpl.id}/fields`}
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  ערוך שדות
                </Link>

                <Link
                  href={`/sign/templates/${tpl.id}/send`}
                  className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  שלח ללקוח
                </Link>

                <button
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={async () => {
                    if (!confirm("למחוק תבנית זו?")) return;

                    await fetch("/sign/api/templates/delete", {
                      method: "POST",
                      body: JSON.stringify({ template_id: tpl.id, file_path: tpl.file_path }),
                      headers: { "Content-Type": "application/json" },
                    });

                    setTemplates(templates.filter(t => t.id !== tpl.id));
                  }}
                >
                  מחק
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {templates.length === 0 && <p className="text-gray-500 mt-6">אין תבניות עדיין</p>}
    </div>
  );
}

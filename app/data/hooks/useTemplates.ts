// /data/hooks/useTemplates.ts
import { useEffect, useState } from "react";

export type Template = {
  id: string;
  name: string;
  content: string;
  inactive: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  rank: number | null;
};

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  // טעינת נתונים ראשונית
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error(err);
      setError("שגיאה בעת טעינת התבניות");
    } finally {
      setLoading(false);
    }
  };

  // הוספה
  const addTemplate = async (template: Omit<Template, "id" | "created_at" | "updated_at">) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error("Failed to add template");
      const newTemplate = await res.json();
      setTemplates((prev) => [...prev, newTemplate]);
    } catch (err) {
      console.error(err);
    }
  };

  // עדכון
  const updateTemplate = async (template: Template) => {
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error("Failed to update template");
      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error(err);
    }
  };

  // מחיקה
  const deleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    fetchTemplates,
  };
}















// import { useEffect, useState } from 'react';



// export type Template = {
//   id: string;
//   name: string;
//   content: string;
//   inactive: boolean;
//   favorite: boolean;
//   created_at: string;
//   updated_at: string;
//   rank: number | null;
// };



// export function useTemplates() {
//   const [templates, setTemplates] = useState<Template[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<null | string>(null);

//   useEffect(() => {
//     const fetchTemplates = async () => {
//       try {
//         const res = await fetch('/api/templates');
//         if (!res.ok) throw new Error('Failed to fetch');
//         const data = await res.json();
//         setTemplates(data);
//       } catch (err) {
//         console.error(err);
//         setError('שגיאה בעת טעינת העובדים');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTemplates();
//   }, []);

//   return { templates, loading, error };
// }

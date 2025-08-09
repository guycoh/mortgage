"use client";

import { useState } from "react";
import { useTemplates, Template } from "@/app/data/hooks/useTemplates";

interface Props {
  onClose: () => void;
}

export default function NewTemplate({ onClose }: Props) {
  const { addTemplate } = useTemplates();
  const [form, setForm] = useState<Omit<Template, "id" | "created_at" | "updated_at">>({
    name: "",
    content: "",
    inactive: false,
    favorite: false,
    rank: null,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await addTemplate(form);
    setLoading(false);
    onClose(); // סוגר את המודל אחרי שמירה
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow w-96 space-y-3"
      >
        <h2 className="text-xl font-bold">הוספת תבנית חדשה</h2>

        <input
          type="text"
          name="name"
          placeholder="שם"
          value={form.name}
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />

        <textarea
          name="content"
          placeholder="תוכן"
          value={form.content}
          onChange={handleChange}
          className="border p-2 w-full h-28"
          required
        />

        <input
          type="number"
          name="rank"
          placeholder="דירוג"
          value={form.rank ?? ""}
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <label className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            name="inactive"
            checked={form.inactive}
            onChange={handleChange}
          />
          <span>לא פעיל</span>
        </label>

        <label className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            name="favorite"
            checked={form.favorite}
            onChange={handleChange}
          />
          <span>מועדף</span>
        </label>

        <div className="flex justify-end space-x-2 space-x-reverse">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 border rounded"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1 bg-green-600 text-white rounded"
          >
            {loading ? "מוסיף..." : "הוסף"}
          </button>
        </div>
      </form>
    </div>
  );
}

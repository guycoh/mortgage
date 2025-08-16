"use client";
import { useState, useEffect } from "react";
import type { Template } from "../page";

interface EditTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  onUpdated: (updated: Template) => void;
}

export default function EditTemplate({ isOpen, onClose, template, onUpdated }: EditTemplateProps) {
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    inactive: false,
    rank: null as number | null,
  });
  const [submitting, setSubmitting] = useState(false);

  // כשנפתח המודל, נמלא את השדות עם הנתונים הקיימים
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        content: template.content,
        inactive: template.inactive,
        rank: template.rank,
      });
    }
  }, [template]);

  if (!isOpen || !template) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormData((p) => ({ ...p, [name]: target.checked }));
      return;
    }

    if (name === "rank") {
      const v = (target as HTMLInputElement).value;
      setFormData((p) => ({ ...p, rank: v === "" ? null : Number(v) }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("שגיאה בעדכון התבנית");
      const updated = (await res.json()) as Template;
      onUpdated(updated); // מעדכן מיידית ב־UI
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">עריכת תבנית</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            name="name"
            placeholder="שם"
            value={formData.name}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
          <textarea
            name="content"
            placeholder="תוכן"
            value={formData.content}
            onChange={handleChange}
            className="border p-2 w-full h-32"
            required
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="inactive"
              checked={formData.inactive}
              onChange={handleChange}
            />
            לא פעיל
          </label>
          <input
            type="number"
            name="rank"
            placeholder="דירוג"
            value={formData.rank ?? ""}
            onChange={handleChange}
            className="border p-2 w-full"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
              ביטול
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              {submitting ? "שומר..." : "שמור"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

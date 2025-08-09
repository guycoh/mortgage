"use client";

import { useEffect, useState, FormEvent } from "react";

export type Template = {
  id: string;
  name: string;
  content: string;
  inactive: boolean;
  favorite: boolean;
};

interface EditTemplateModalProps {
  templateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function EditTemplateModal({
  templateId,
  isOpen,
  onClose,
  onUpdated,
}: EditTemplateModalProps) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && templateId) {
      setLoading(true);
      fetch(`/api/templates/${templateId}`)
        .then((res) => res.json())
        .then((data) => setTemplate(data))
        .catch((err) => console.error("Failed to fetch template", err))
        .finally(() => setLoading(false));
    }
  }, [templateId, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!template) return;

    setLoading(true);
    const res = await fetch(`/api/templates/${template.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });

    if (res.ok) {
      onUpdated?.();
      onClose();
    } else {
      const error = await res.json();
      alert("שגיאה בשמירה: " + error.error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">עריכת תבנית</h2>

        {loading || !template ? (
          <div>טוען...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium">שם התבנית</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) =>
                  setTemplate({ ...template, name: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block font-medium">תוכן</label>
              <textarea
                value={template.content}
                onChange={(e) =>
                  setTemplate({ ...template, content: e.target.value })
                }
                className="w-full border rounded px-3 py-2 h-32"
                required
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={template.inactive}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      inactive: e.currentTarget.checked,
                    })
                  }
                />
                לא פעיל
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={template.favorite}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      favorite: e.currentTarget.checked,
                    })
                  }
                />
                מועדף
              </label>
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              שמור שינויים
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

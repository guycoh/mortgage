import { useRef, FormEvent, useState, useEffect } from "react";

export type Template = {
  id: string;
  name: string;
  content: string;
  inactive: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export interface NewTemplateProps {
  isOpen: boolean; // external control to show/hide modal
  onClose: () => void; // called to request close
  onCreated?: (template: Template) => void;
  initialName?: string;
  initialContent?: string;
  initialFavorite?: boolean;
}

export default function NewTemplate({
  isOpen,
  onClose,
  onCreated,
  initialName,
  initialContent,
  initialFavorite = false,
}: NewTemplateProps) {
  const nameRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const favoriteRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // reset when modal opens: clear or apply provided initial values if explicitly passed
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      if (nameRef.current) {
        nameRef.current.value =
          typeof initialName !== "undefined" ? initialName : "";
      }
      if (contentRef.current) {
        contentRef.current.value =
          typeof initialContent !== "undefined"
            ? initialContent
            : "";
      }
      if (favoriteRef.current) {
        favoriteRef.current.checked = !!initialFavorite;
      }
    }
  }, [isOpen, initialName, initialContent, initialFavorite]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const name = nameRef.current?.value.trim() || "";
    const content = contentRef.current?.value || "";
    const favorite = favoriteRef.current?.checked || false;

    if (!name) {
      setError("שם התבנית דרוש.");
      return;
    }
    if (!content) {
      setError("תוכן התבנית דרוש.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content, favorite }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "שגיאה בשרת");
      }
      const data: Template = await resp.json();
      setSuccessMsg("תבנית נוצרה בהצלחה!");
      if (onCreated) onCreated(data);
    } catch (err: any) {
      setError(err.message || "שגיאה לא צפויה");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6 overflow-auto"
    >
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">יצירת תבנית חדשה</h2>
          <button
            aria-label="סגור"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 rounded-full p-1"
          >
            ×
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 p-6 overflow-auto flex-1"
        >
          {error && (
            <div className="text-sm text-red-800 bg-red-100 p-2 rounded">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-sm text-green-800 bg-green-100 p-2 rounded">
              {successMsg}
            </div>
          )}

          <div className="flex flex-col">
            <label htmlFor="template-name" className="mb-1 font-medium">
              שם התבנית
            </label>
            <input
              id="template-name"
              type="text"
              ref={nameRef}
              className="border rounded px-3 py-2"
              placeholder="לדוגמה: בקשה למסמכים"
              aria-label="שם התבנית"
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="template-content" className="mb-1 font-medium">
              תוכן התבנית
            </label>
            <textarea
              id="template-content"
              ref={contentRef}
              className="border rounded p-3 font-mono min-h-[160px] resize-none whitespace-pre-wrap"
              placeholder={`תוכן שישלח ללקוח`}
              aria-label="תוכן התבנית"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              אפשר להשתמש ב־placeholders: <code>{`{שם_לקוח}`}</code>, <code>{`{קישור_להעלאה}`}</code>, <code>{`{תאריך}`}</code>.
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                ref={favoriteRef}
                className="h-4 w-4"
                aria-label="מועדפת"
              />
              <span className="text-sm">מועדפת</span>
            </label>
            <div className="flex-grow" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg border"
                disabled={loading}
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:brightness-105 disabled:opacity-50"
              >
                {loading ? "שומר..." : "צור תבנית"}
              </button>
            </div>
          </div>
        </form>
        <div className="p-3 text-xs text-gray-400 text-center border-t">
          הטופס יתאים לגובה ויגיע עם פס גלילה אם צריך; שדה התוכן גמיש.
        </div>
      </div>
    </div>
  );
}

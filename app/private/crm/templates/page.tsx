"use client";

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  Fragment,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useTemplates, Template } from "@/app/data/hooks/useTemplates";
import NewTemplate from "./add/NewTemplate";
import { useUser } from "@/app/context/UserContext";
import SearchIcon from "@/public/assets/images/svg/general/SearchIcon";
import { banks } from "@/app/data/banks";

// פונקציה להחלפת placeholders
function interpolateTemplate(
  template: string,
  vars: Record<string, string | undefined>
) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

type TemplatesTableProps = {};

function TemplateRow({
  template,
  onEdit,
  clientName,
  bankName,
}: {
  template: Template;
  onEdit: (t: Template) => void;
  clientName: string;
  bankName: string;
}) {
  const { profile } = useUser();
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const modalRootRef = useRef<HTMLElement | null>(null);

  const renderedContent = useMemo(() => {
    return interpolateTemplate(template.content, {
      advisorName: profile?.full_name,
      advisorPhone: profile?.phone ?? undefined,
      advisorEmail: profile?.email ?? undefined,
      clientName: clientName || undefined,
      bankName: bankName || undefined,
    });
  }, [template.content, profile, clientName, bankName]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedContent.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("העתקה נכשלה", e);
    }
  }, [renderedContent]);

  const whatsappLink = useMemo(() => {
    return `https://wa.me/?text=${encodeURIComponent(renderedContent.trim())}`;
  }, [renderedContent]);

  const mailtoLink = useMemo(() => {
    return `mailto:?subject=${encodeURIComponent(
      template.name
    )}&body=${encodeURIComponent(renderedContent.trim())}`;
  }, [renderedContent, template.name]);

  // יצירת container ל-portal של ה-modal
  useEffect(() => {
    if (typeof document === "undefined") return;
    const div = document.createElement("div");
    div.setAttribute("data-template-modal", template.id);
    modalRootRef.current = div;
    document.body.appendChild(div);
    return () => {
      if (modalRootRef.current) {
        document.body.removeChild(modalRootRef.current);
      }
    };
  }, [template.id]);

  // סגירת modal ב-Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showFull) {
        setShowFull(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFull]);

  const modalContent = showFull ? (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      aria-modal="true"
      role="dialog"
      aria-label={`תוכן מלא של ${template.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowFull(false);
      }}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6 relative">
        <button
          onClick={() => setShowFull(false)}
          aria-label="סגור"
          className="absolute top-3 right-3 text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-4">{template.name}</h2>
        <div className="font-mono whitespace-pre-wrap text-sm">
          {renderedContent}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="text-xs h-9 px-4 flex items-center justify-center bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            {copied ? "הועתק!" : "העתק הכל"}
          </button>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs h-9 px-4 flex items-center justify-center bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            שלח וואצאפ
          </a>
          <a
            href={mailtoLink}
            className="text-xs h-9 px-4 flex items-center justify-center bg-orange-500 text-white rounded hover:bg-orange-600 transition"
          >
            שלח מייל
          </a>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <tr
        key={template.id}
        className="odd:bg-white even:bg-gray-50 align-top"
        data-testid={`template-row-${template.id}`}
      >
        <td className="px-4 py-3 border align-top font-medium">
          {template.name}
        </td>
        <td className="px-4 py-3 border align-top">
          <div className="relative group">
            <div
              className="font-mono text-sm bg-gray-50 p-2 rounded overflow-hidden cursor-pointer"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                whiteSpace: "normal",
              }}
              onClick={() => setShowFull(true)}
              aria-label="הצג תוכן מלא"
              role="button"
            >
              {renderedContent}
            </div>

            {/* tooltip קטן ב-hover / focus */}
            <div
              className="invisible group-hover:visible group-focus-within:visible absolute z-10 top-full left-0 mt-1 w-[360px] max-h-64 overflow-auto bg-white border rounded shadow-lg p-3 text-xs font-mono whitespace-pre-wrap break-words"
              role="tooltip"
            >
              {renderedContent}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 border align-top">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onEdit(template)}
              className="text-xs h-9 w-full flex items-center justify-center bg-blue-100 rounded hover:bg-blue-200 transition"
              aria-label={`ערוך תבנית ${template.name}`}
            >
              ערוך
            </button>
            <button
              onClick={handleCopy}
              className="text-xs h-9 w-full flex items-center justify-center bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              aria-label="העתק תבנית"
            >
              {copied ? "הועתק!" : "העתק"}
            </button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs h-9 w-full flex items-center justify-center bg-green-500 text-white rounded hover:bg-green-600 transition"
              aria-label="שלח בווצאפ"
            >
              וואצאפ
            </a>
            <a
              href={mailtoLink}
              className="text-xs h-9 w-full flex items-center justify-center bg-orange-500 text-white rounded hover:bg-orange-600 transition"
              aria-label="שלח במייל"
            >
              מייל
            </a>
          </div>
        </td>
      </tr>

      {/* portal של ה-modal כדי שלא יהיה בתוך <tbody> */}
      {modalRootRef.current &&
        createPortal(modalContent, modalRootRef.current)}
    </>
  );
}

export default function TemplatesTable({}: TemplatesTableProps) {
  const { templates = [], loading, error } = useTemplates();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedBank, setSelectedBank] = useState<number | "">("");

  // debounce input
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch, templates]);

  const handleEdit = useCallback((t: Template) => {
    console.log("ערוך תבנית:", t);
  }, []);

  const bankName = selectedBank
    ? banks.find((b) => b.id === selectedBank)?.name ?? ""
    : "";

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-col items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-center">תבניות לשליחה ללקוח</h1>

        <div
          dir="rtl"
          className="w-full max-w-5xl border border-gray-300 rounded-xl p-5 flex flex-col gap-4"
        >
          {/* שורה ראשונה: חיפוש + כפתור */}
          <div className="flex items-center gap-3 w-full">
            {/* שדה חיפוש */}
            <div className="relative flex-grow min-w-[160px] md:min-w-[220px]">
              <label htmlFor="template-search" className="sr-only">
                חיפוש תבניות לפי שם
              </label>
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                style={{ insetInlineStart: "0.5rem" }}
              >
                <SearchIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                id="template-search"
                aria-label="חיפוש תבניות לפי שם"
                placeholder="חפש לפי שם..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="search"
                className="w-full h-10 border rounded px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-orange-100"
                style={{ paddingInlineStart: "2rem" }}
              />
            </div>

            {/* כפתור בצד השמאלי ביותר */}
            <div className="flex-shrink-0 ml-auto">
              <button
                onClick={() => setShowModal(true)}
                className="h-10 px-4 bg-green-600 text-white rounded hover:bg-green-700 transition whitespace-nowrap"
              >
                + תבנית חדשה
              </button>
            </div>
          </div>

          {/* שורה שנייה: שם, טלפון, מייל, בנק — רוחב שווה */}
          <div className="flex flex-wrap gap-3 w-full">
            {/* שם לקוח */}
            <div className="flex-1 min-w-0">
              <label htmlFor="client-name" className="sr-only">
                שם לקוח
              </label>
              <input
                id="client-name"
                aria-label="שם לקוח"
                placeholder="שם לקוח"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full h-10 border rounded px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-orange-100"
              />
            </div>

            {/* טלפון */}
            <div className="flex-1 min-w-0">
              <label htmlFor="client-phone" className="sr-only">
                טלפון
              </label>
              <input
                id="client-phone"
                aria-label="טלפון"
                placeholder="טלפון"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 border rounded px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-orange-100"
              />
            </div>

            {/* מייל */}
            <div className="flex-1 min-w-0">
              <label htmlFor="client-email" className="sr-only">
                מייל
              </label>
              <input
                id="client-email"
                aria-label="מייל"
                placeholder="מייל"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 border rounded px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-orange-100"
              />
            </div>

            {/* בחירת בנק */}
            <div className="flex-1 min-w-0">
              <label htmlFor="bank-select" className="sr-only">
                בנק
              </label>
              <select
                id="bank-select"
                aria-label="בנק"
                value={selectedBank}
                onChange={(e) =>
                  setSelectedBank(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full h-10 border rounded px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-orange-100"
              >
                <option value="">בחר בנק</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div
          className="p-4 bg-yellow-50 rounded mb-4"
          role="status"
          aria-live="polite"
        >
          טוען תבניות...
        </div>
      )}
      {error && (
        <div
          className="p-4 bg-red-50 rounded mb-4 text-red-700"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className="w-full table-auto border-collapse"
          aria-label="טבלת תבניות"
        >
          <colgroup>
            <col />
            <col />
            <col style={{ width: "240px" }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2 border">שם</th>
              <th className="px-4 py-2 border">תוכן (עם החלפה)</th>
              <th className="px-4 py-2 border">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  {templates.length === 0
                    ? "אין עדיין תבניות. צור אחת חדשה כדי להתחיל."
                    : debouncedSearch
                    ? `לא נמצאו תבניות עבור "${debouncedSearch}".`
                    : "לא נמצאו תבניות."}
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                onEdit={handleEdit}
                clientName={clientName}
                bankName={bankName}
              />
            ))}
          </tbody>
        </table>
      </div>

      <NewTemplate
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={(template) => {
          console.log("תבנית נוצרה:", template);
          setShowModal(false);
        }}
      />
    </div>
  );
}

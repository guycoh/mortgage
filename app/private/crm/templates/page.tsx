"use client"

import { useEffect, useState, useCallback, useMemo } from "react";

import NewTemplate from "./add/NewTemplate";
import EditTemplate from "./add/EditTemplate";
import ModalDelete from "./add/ModalDelete";

import DocumentsDrawer from "../components/DocumentsDrawer";


import SearchIcon from "@/public/assets/images/svg/general/SearchIcon";
import TrashIcon from "@/public/assets/images/svg/general/TrashIcon";
import EditIcon from "@/public/assets/images/svg/general/EditIcon";
import EmailIcon from "@/public/assets/images/svg/contact/EmailIcon";
import WhatsappIcon from "@/public/assets/images/svg/contact/WhatsappIcon";
import CopyIcon from "@/public/assets/images/svg/general/CopyIcon";


import { banks } from "@/app/data/banks";
import { useUser } from "@/app/context/UserContext";

export type Template = {
  id: string;
  name: string;
  content: string;
  inactive: boolean;
  favorite: boolean;
  rank: number | null;
  created_at: string;
  updated_at: string;
};

export default function TemplatesPage() {
  const [data, setData] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedBank, setSelectedBank] = useState<number | "">("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

 // מחיקה
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
 
  //העתקת תוכן
   const [toastMessage, setToastMessage] = useState<string | null>(null);

  // פונקציה להעתקה + טוסט
  
const handleCopy = (t: Template) => {
  // ממיר את התוכן לפי היועץ
  const replaced = replacePlaceholders(t.content, advisorData);
  navigator.clipboard.writeText(replaced);
  setToastMessage("✅ התוכן הועתק בהצלחה!");
};


  // טוסט נעלם אוטומטית אחרי 3 שניות
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);




  const { profile } = useUser();

  const advisorData = {
  advisorName: profile?.full_name || "",
  advisorPhone: profile?.phone || "",
  advisorEmail: profile?.email || "",

};

// מאחדים את כל הערכים שאפשר להשתמש בהם במלל
const selectedBankName = useMemo(() => {
  const bank = banks.find((b) => b.id === selectedBank);
  return bank?.name ?? "";
}, [selectedBank]);

const placeholdersData = useMemo(() => ({
  advisorName: profile?.full_name || "",
  advisorPhone: profile?.phone || "",
  advisorEmail: profile?.email || "",
  clientName: clientName || "",
  selectedBank: selectedBankName,
}), [profile?.full_name, profile?.phone, profile?.email, clientName, selectedBankName]);

// פונקציה שמחליפה את ה־{{placeholders}}
function replacePlaceholders(text: string, data: Record<string, string>) {
  return (text ?? "").replace(/{{(.*?)}}/g, (_, key) => {
    const value = data[key.trim()];
    return value !== undefined ? value : "";
  });
}

const getTemplateContent = useCallback(
  (t: Template) => replacePlaceholders(t.content ?? "", placeholdersData),
  [placeholdersData]
);








  // debounce חיפוש
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // חיפוש בפועל
  const filteredData = useMemo(() => {
    const lowerSearch = debouncedTerm.toLowerCase();
    return data.filter((item) => item.name.toLowerCase().includes(lowerSearch));
  }, [debouncedTerm, data]);

  // קריאת נתונים
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates", { cache: "no-store" });
      if (!res.ok) throw new Error("Load error");
      const templates = (await res.json()) as Template[] | null;
      setData((templates ?? []).filter(Boolean));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // יצירה
  const handleCreated = (created: Template) => {
    if (!created?.id) {
      fetchTemplates();
      return;
    }
    setData((prev) => [created, ...prev]);
    fetchTemplates();
    setIsModalOpen(false);
  };

  // עדכון
  const handleUpdated = (updated: Template) => {
    setData((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    fetchTemplates();
  };

  // מחיקה
   // פתיחת המודל עם ה-ID הנבחר
  const openDeleteModal = (id: string) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  // מחיקה בפועל אחרי אישור
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/templates/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => prev.filter((t) => t?.id !== deleteId));
    }
    setIsDeleteModalOpen(false);
    setDeleteId(null);
  };
  
  //ממיר לווצאפ
  function formatPhoneForWhatsapp(input: string) {
  if (!input) return "";
  // מסירים כל תו שאינו מספר או '+' בהתחלה
  let cleaned = input.replace(/[^\d+]/g, "");

  // אם המספר מתחיל ב-0 מחליפים בקידומת ישראלית 972
  if (cleaned.startsWith("0")) {
    cleaned = "972" + cleaned.slice(1);
  }

  // אם מתחיל ב-+ מסירים את ה+
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}


  // עיצוב אחיד לשדות
  const inputClass =
    "w-full h-10 border rounded px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-orange-100";

 
 // כפתורי פעולות
const actionButtons = [
  {
    onClick: (t: Template) => {
      const text = getTemplateContent(t);
      navigator.clipboard.writeText(text);
      setToastMessage("✅ התוכן הועתק בהצלחה!");
    },
    color: "bg-purple-500 hover:bg-purple-900",
    icon: <CopyIcon className="w-10 h-10" />,
  },
  {
    onClick: (t: Template) => {
      setSelectedTemplate(t);
      setIsEditOpen(true);
    },
    color: "bg-blue-500 hover:bg-blue-600",
    icon: <EditIcon className="w-10 h-10" />,
  },
  {
    onClick: (t: Template) => {
      const subject = encodeURIComponent(t.name);
      const body = encodeURIComponent(getTemplateContent(t));
      if (!email) {
        setToastMessage("⚠️ לא הוזנה כתובת אימייל");
        return;
      }
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    },
    color: "bg-orange-500 hover:bg-orange-900",
    icon: <EmailIcon className="w-10 h-10" color="white" />,
  },

  {
  onClick: (t: Template) => {
      const text = encodeURIComponent(getTemplateContent(t));
      const formattedPhone = formatPhoneForWhatsapp(phone);
      if (!formattedPhone) {
        setToastMessage("⚠️ לא הוזן מספר טלפון תקני");
        return;
      }
      window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
    },
    color: "bg-green-600 hover:bg-green-700",
    icon: <WhatsappIcon className="w-10 h-10" color="white" />,
  },


  {
    onClick: (t: Template) => openDeleteModal(t.id),
    color: "bg-red-500 hover:bg-red-600",
    icon: <TrashIcon className="w-10 h-10" />,
  },
];

  return (
    <div className="p-4">
      {/* כותרת וטופס עליון */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-center">תבניות לשליחה ללקוח</h1>

        <div className="w-full max-w-5xl border border-gray-300 rounded-xl p-5 flex flex-col gap-4">
          
          {/* חיפוש + כפתורים */}
          <div className="flex items-center gap-3 w-full relative">
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
                placeholder="חפש לפי שם..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                type="search"
                className={inputClass}
                style={{ paddingInlineStart: "2rem" }}
              />
            </div>

            {/* כפתורים */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <button
                className="h-10 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 transition whitespace-nowrap"
                onClick={() => setIsOpen(true)}
              >
                מסמכים לשליחה
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="h-10 px-4 bg-green-600 text-white rounded hover:bg-green-700 transition whitespace-nowrap"
              >
                + תבנית חדשה
              </button>
            </div>
          </div>


         {/* שם, טלפון, מייל, בנק */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <input
              placeholder="שם לקוח"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="טלפון"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="מייל"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <select
              value={selectedBank}
              onChange={(e) =>
                setSelectedBank(e.target.value ? Number(e.target.value) : "")
              }
              className={inputClass}
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

      {loading && <p className="text-gray-500">טוען...</p>}

      {/* טבלה */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm text-right border-collapse">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-3 border-b font-bold">שם</th>
              <th className="p-3 border-b font-bold">תוכן</th>
              <th className="p-3 border-b font-bold">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((template, index) => (
              <tr
                key={template.id ?? `temp-${index}`}
                className="hover:bg-gray-50 transition align-top h-[120px]"
              >
                <td className="p-3 border-b font-medium max-w-[150px] truncate">
                  
                  
                  {template.name}
                </td>
                <td className="p-3 border-b max-w-[400px] text-gray-700 align-top">
                  <div className="max-h-[100px] overflow-y-auto whitespace-pre-line">
                    {getTemplateContent(template)}
                  </div>
                </td>

                <td className="p-3 border-b flex flex-wrap gap-2">
                  {actionButtons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => btn.onClick(template)}
                      className={`w-20 h-20 flex items-center justify-center rounded-md text-white transition ${btn.color}`}
                    >
                      {btn.icon}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* מודלים */}
      <NewTemplate
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
      <EditTemplate
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        template={selectedTemplate}
        onUpdated={handleUpdated}
      />

      {/* מודל המחיקה */}
      <ModalDelete
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
{/* הקומפוננטה של המודל */}
      <DocumentsDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />

    </div>
  );
}

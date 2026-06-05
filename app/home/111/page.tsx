
"use client";

import { useMemo, useState } from "react";

type BankKey =
  | "leumi"
  | "hapoalim"
  | "mizrahi"
  | "discount"
  | "international"
  | "jerusalem"
  | "mercantile"
  | "nonBank";

const banks = [
  { id: "leumi", label: "בנק לאומי" },
  { id: "hapoalim", label: "בנק הפועלים" },
  { id: "mizrahi", label: "בנק מזרחי טפחות" },
  { id: "discount", label: "בנק דיסקונט" },
  { id: "international", label: "הבנק הבינלאומי" },
  { id: "jerusalem", label: "בנק ירושלים" },
  { id: "mercantile", label: "בנק מרכנתיל" },
  { id: "nonBank", label: "חוץ בנקאי" },
];

const guides: Record<BankKey, string> = {
  leumi: "לאומי → אזור אישי → משכנתאות → יתרות לסילוק → הורדת PDF",
  hapoalim: "הפועלים → משכנתא שלי → מסמכים → יתרות לסילוק",
  mizrahi: "מזרחי → משכנתאות → מידע → הפקת דוח",
  discount: "דיסקונט → הלוואות → משכנתא → יתרות לסילוק",
  international: "הבינלאומי → משכנתא → מסמכים",
  jerusalem: "ירושלים → משכנתאות → אזור אישי → דוחות",
  mercantile: "מרכנתיל → משכנתא → אזור אישי → יתרות לסילוק",
  nonBank: "גוף חוץ בנקאי → בקש דוח יתרות לסילוק",
};

export default function MortgageSmartCheckPage() {
  const [bank, setBank] = useState<BankKey | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const selectedBank = banks.find((b) => b.id === bank);

  const canSubmit = useMemo(() => {
    return file && name.trim() && phone.trim().length >= 9 && bank;
  }, [file, name, phone, bank]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f6f9] to-[#e9eef5] flex justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6">

        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            בדיקת משכנתא חכמה
          </h1>
          <p className="text-gray-500 mt-2">
            תן למומחים שלנו לבדוק את טיב המשכנתא שלך
          </p>
        </div>

        {/* BANK CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {banks.map((b) => (
            <button
              key={b.id}
              onClick={() => setBank(b.id as BankKey)}
              className={`p-3 rounded-xl border text-sm font-medium transition shadow-sm
                ${
                  bank === b.id
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white hover:bg-gray-50 border-gray-200"
                }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* GUIDE BUTTON */}
        {bank && (
          <button
            onClick={() => setShowGuide(true)}
            className="w-full mb-4 text-orange-600 font-medium text-sm hover:underline"
          >
            📄 איך להוציא דוח יתרות לסילוק?
          </button>
        )}

        {/* FILE UPLOAD */}
        <div className="border-2 border-dashed rounded-xl p-6 text-center mb-6">
          <input
            type="file"
            accept="application/pdf"
            id="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />

          <label htmlFor="file" className="cursor-pointer block">
            <div className="font-semibold">העלה דוח יתרות לסילוק</div>
            <div className="text-sm text-gray-500 mt-1">
              PDF בלבד מכל בנק
            </div>
          </label>

          {file && (
            <div className="mt-3 text-green-600 text-sm">
              ✔ {file.name}
            </div>
          )}
        </div>

        {/* HELP LEAD */}
        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="text-sm font-medium text-gray-700">
            לא מוצא את הדוח?
          </div>
          <div className="text-xs text-gray-500 mt-1">
            המומחים שלנו יכולים להוציא אותו עבורך
          </div>
          <button className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg">
            עזרה בהפקת הדוח
          </button>
        </div>

        {/* FORM FIELDS */}
        {file && (
          <div className="space-y-4 mb-6">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              className="w-full p-3 border rounded-xl"
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="טלפון"
              className="w-full p-3 border rounded-xl"
            />
          </div>
        )}

        {/* SUBMIT */}
        <button
          disabled={!canSubmit}
          className={`w-full py-3 rounded-xl font-semibold transition
            ${
              canSubmit
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
        >
          שלח לבדיקה
        </button>
      </div>

      {/* MODAL GUIDE */}
      {showGuide && bank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-3">
              איך להוציא דוח בבנק {selectedBank?.label}
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              {guides[bank]}
            </p>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full bg-orange-500 text-white py-2 rounded-xl"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
















// "use client";

// import { useMemo, useState } from "react";

// type BankKey =
//   | "leumi"
//   | "hapoalim"
//   | "mizrahi"
//   | "discount"
//   | "international"
//   | "jerusalem"
//   | "mercantile"
//   | "nonBank";

// export default function MortgageSmartCheckPage() {
//   const [bank, setBank] = useState<BankKey | "">("");
//   const [file, setFile] = useState<File | null>(null);
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");

//  const banks = [
//   { id: "leumi", label: "בנק לאומי" },
//   { id: "hapoalim", label: "בנק הפועלים" },
//   { id: "mizrahi", label: "בנק מזרחי טפחות" },
//   { id: "discount", label: "בנק דיסקונט" },
//   { id: "international", label: "הבנק הבינלאומי" },
//   { id: "jerusalem", label: "בנק ירושלים" },
//   { id: "mercantile", label: "בנק מרכנתיל" },
//   { id: "nonBank", label: "חוץ בנקאי" },
// ];

//  const guides: Record<BankKey, string> = {
//   leumi: "היכנס לאזור האישי → משכנתאות → יתרות לסילוק → הורדת PDF",
//   hapoalim: "משכנתא שלי → מסמכים → יתרות לסילוק → הורדה",
//   mizrahi: "משכנתאות → מידע על הלוואות → הפקת דוח יתרות",
//   discount: "הלוואות → משכנתא → יתרות לסילוק להורדה",
//   international: "משכנתא → מסמכים → דוח יתרות לסילוק",
//   jerusalem: "בנק ירושלים → משכנתאות → אזור אישי → הפקת דוח יתרות לסילוק",

//   // חדש 👇
//   mercantile: "בנק מרכנתיל → משכנתאות → אזור אישי → דוחות → יתרות לסילוק",

//   nonBank: "פנה לגוף המממן שלך ובקש 'דוח יתרות לסילוק מלא'",
// };



//   const canSubmit = useMemo(() => {
//     return file && name.trim() && phone.trim().length >= 9 && bank;
//   }, [file, name, phone, bank]);

//   return (
//     <div className="font-open-sans font-normal min-h-screen bg-linear-to-b from-[#f4f6f9] to-[#e9eef5] flex items-center justify-center p-4 sm:p-6">
//       <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-8">

//         {/* Header */}
//         <div className="text-center mb-6 sm:mb-8">
//           <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
//             בדיקת משכנתא חכמה
//           </h1>
//           <p className="text-gray-500 mt-2 text-sm sm:text-base">
//             תן למומחים שלנו לבדוק את טיב המשכנתא שלך
//           </p>
//         </div>

//         {/* Bank Select */}
//         <div className="mb-5">
//           <label className="text-sm font-medium text-gray-700 mb-2 block">
//             בחר בנק / גוף מלווה
//           </label>

//           <select
//             value={bank}
//             onChange={(e) => setBank(e.target.value as BankKey)}
//             className="w-full p-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
//           >
//             <option value="">בחר בנק</option>
//             {banks.map((b) => (
//               <option key={b.id} value={b.id}>
//                 {b.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Guide */}
//         {bank && (
//           <div className="mb-5 bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-gray-700">
//             <div className="font-semibold mb-1">מדריך להפקת דוח יתרות:</div>
//             {guides[bank]}
//           </div>
//         )}

//         {/* Upload */}
//         <div className="border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center mb-6">
//           <input
//             type="file"
//             accept="application/pdf"
//             className="hidden"
//             id="upload"
//             onChange={(e) => {
//               const f = e.target.files?.[0];
//               if (f) setFile(f);
//             }}
//           />

//           <label htmlFor="upload" className="cursor-pointer block">
//             <div className="text-base sm:text-lg font-semibold text-gray-700">
//               גרור קובץ PDF או לחץ להעלאה
//             </div>
//             <div className="text-xs sm:text-sm text-gray-500 mt-2">
//               דוחות יתרות לסילוק מכל הבנקים בישראל
//             </div>
//           </label>

//           {file && (
//             <div className="mt-3 text-green-600 text-sm font-medium">
//               ✔ נטען: {file.name}
//             </div>
//           )}
//         </div>

//         {/* Fields appear after upload */}
//         {file && (
//           <div className="space-y-4 mb-6 animate-in fade-in duration-300">
//             <div>
//               <label className="text-sm font-medium text-gray-700 block mb-1">
//                 שם מלא *
//               </label>
//               <input
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 className="w-full p-3 border rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
//                 placeholder="הזן שם מלא"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 block mb-1">
//                 טלפון *
//               </label>
//               <input
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 className="w-full p-3 border rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
//                 placeholder="05X-XXXXXXX"
//               />
//             </div>
//           </div>
//         )}

//         {/* Submit */}
//         <button
//           disabled={!canSubmit}
//           className={`w-full py-3 rounded-xl font-semibold transition ${
//             canSubmit
//               ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
//               : "bg-gray-200 text-gray-400 cursor-not-allowed"
//           }`}
//         >
//           שלח לבדיקה
//         </button>
//       </div>
//     </div>
//   );
// }
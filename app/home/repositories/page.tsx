"use client";

import { useState } from "react";

// רשימת המאגרים עם אייקון וקטגוריה מוגדרים לכל אחד
const repositories = [
  { name: "דירה בהנחה", description: "מידע, זכאות ונתונים על הגרלות דירה בהנחה", href: "/home/repositories/aa", category: "נדל״ן והגרלות", icon: "home" },
  { name: "מאגר שמאים", description: "רשימת שמאים מוסמכים והשוואת עלויות", href: "/muhni/repositories/appraisers", category: "אנשי מקצוע", icon: "users" },
  { name: "מתחמים בהתחדשות עירונית", description: "בדיקת סטטוס פרויקטים של פינוי בינוי ותמ״א 38", href: "/home/repositories/urban_renewal", category: "נדל״ן והגרלות", icon: "building" },
  { name: "רשימת סניפי בנקים", description: "איתור סניפים, שעות פעילות ופרטי התקשרות", href: "/muhni/repositories/banks", category: "פיננסים", icon: "bank" },
  { name: "מאגר טפסים", description: "טפסים חשובים להורדה, הגשה וחתימה ישירה", href: "/repositories/forms", category: "כלים וטפסים", icon: "file" },
  { name: "מאגר מילון מונחים", description: "כל המושגים והמונחים מעולם המשכנתאות והנדל״ן", href: "/repositories/glossary", category: "פיננסים", icon: "book" },
];

// קטגוריות לסינון חכם
const categories = ["הכל", "נדל״ן והגרלות", "פיננסים", "אנשי מקצוע", "כלים וטפסים"];

// רכיב אייקונים פנימי קליל מבוסס SVG
function RepoIcon({ name }: { name: string }) {
  const baseClass = "w-6 h-6 stroke-current";
  switch (name) {
    case "home":
      return <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    case "users":
      return <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    case "building":
      return <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V11m0 0h4v10M14 11h-4m14 4h-2m0 0v-4m0 4h2m-2 0v4m-4-8h2m0 0v4m0-4h-2m0 4h2m-2 0v4M6 7h2v.01M6 11h2v.01M6 15h2v.01M16 7h2v.01M16 11h2v.01M16 15h2v.01" /></svg>;
    case "bank":
      return <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
    case "file":
      return <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    case "book":
      return <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
    default:
      return <svg className={baseClass} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
  }
}

export default function DataRepositoriesPage() {
  const [activeCategory, setActiveCategory] = useState("הכל");

  // סינון המאגרים לפי הקטגוריה שנבחרה בתפריט המתוחכם
  const filteredRepositories = activeCategory === "הכל"
    ? repositories
    : repositories.filter(repo => repo.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f9fc] to-[#e6eff3] py-16 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* כותרת עמוד אלגנטית */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-widest text-[#1d75a1] uppercase bg-[#1d75a1]/10 px-3 py-1 rounded-full">
            מרכז המידע והידע
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3 mb-4 tracking-tight">
            מאגרי מידע וכלים חכמים
          </h1>
          <div className="h-1 w-20 bg-[#1d75a1] mx-auto rounded-full mb-4" />
          <p className="text-gray-600 text-base sm:text-lg font-medium leading-relaxed">
            כאן ריכזנו עבורכם את כל המאגרים הרשמיים, הטפסים והמילונים שיעזרו לכם לקבל החלטות משכנתא מבוססות נתונים.
          </p>
        </div>

        {/* תפריט סינון מתוחכם (Tabs) - רספונסיבי וגליל במובייל */}
        <div className="flex justify-start md:justify-center items-center overflow-x-auto pb-4 mb-10 gap-2 no-scrollbar scroll-smooth snap-x">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                px-5 py-2.5 rounded-full text-sm font-bold tracking-wide whitespace-nowrap transition-all duration-300 snap-center outline-none
                ${activeCategory === category 
                  ? "bg-[#1d75a1] text-white shadow-md shadow-[#1d75a1]/30 transform -translate-y-0.5" 
                  : "bg-white text-gray-600 hover:text-[#1d75a1] border border-gray-200 shadow-sm hover:shadow"
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>

        {/* גריד רספונסיבי מרהיב של כרטיסי מאגרי המידע */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepositories.map((repo, index) => (
            <a
              key={index}
              href={repo.href}
              className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-xs hover:shadow-xl hover:border-[#1d75a1]/30 transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* אפקט רקע עדין בריחוף קל מהפינה */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-[#1d75a1]/10 to-transparent rounded-br-full transition-all duration-500 group-hover:scale-150" />

              <div>
                {/* שורת ראש כרטיס: אייקון ותגית */}
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-[#1d75a1]/10 text-[#1d75a1] flex items-center justify-center transition-all duration-300 group-hover:bg-[#1d75a1] group-hover:text-white group-hover:scale-110">
                    <RepoIcon name={repo.icon} />
                  </div>
                  <span className="text-[11px] font-bold text-[#1d75a1] bg-[#1d75a1]/5 px-2.5 py-1 rounded-md border border-[#1d75a1]/10">
                    {repo.category}
                  </span>
                </div>

                {/* תוכן הכרטיס */}
                <div className="text-right">
                  <h2 className="text-lg font-bold text-gray-800 mb-2 transition-colors duration-200 group-hover:text-[#1d75a1]">
                    {repo.name}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">
                    {repo.description}
                  </p>
                </div>
              </div>

              {/* תחתית כרטיס - לינק וכפתור פעולה מרומז */}
              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-[#1d75a1] opacity-90 group-hover:opacity-100">
                <span>כניסה למאגר</span>
                <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 transition-all duration-300 group-hover:bg-[#1d75a1] group-hover:text-white group-hover:translate-x-[-4px] rtl:group-hover:translate-x-[4px]">
                  <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

            </a>
          ))}
        </div>

        {/* הודעת אפס תוצאות במידה ומאגר מסונן ריק */}
        {filteredRepositories.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-semibold">לא נמצאו מאגרים בקטגוריה זו.</p>
          </div>
        )}

      </div>
    </div>
  );
}
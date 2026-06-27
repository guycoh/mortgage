"use client"

import { useState, useEffect, useRef } from "react";
//import LoanTable, { Loan } from "../components/LoanTable"; // שים לב: אם התיקייה זזה, ודא שהנתיב תואם למיקום החדש (למשל: "@/components/LoanTable" או התאמה לפי מבנה הפרויקט)
import LoanTable , { Loan }  from "./components/LoanTable";
import { useLoanPaths } from "@/app/data/hooks/useLoanPaths";
import { Percent, Copy, Calendar } from "lucide-react";

//import UnifiedScheduleModal from "../components/UnifiedScheduleModal";
import UnifiedScheduleModal from "./components/UnifiedScheduleModal";
//import MixComparisonTable from "../components/MixComparisonTable";
import MixComparisonTable from "./components/MixComparisonTable";
//import MixScheduleChartSVG from "../components/MixScheduleChartSVG";
import MixScheduleChartSVG from "./components/MixScheduleChartSVG";


type Mix = {
  id: string;
  mix_name: string;
  loans?: Loan[];
  is_base?: boolean;
};

export default function SimulatorPage() {
  const { paths: loanPaths, loading } = useLoanPaths();

  const [mixes, setMixes] = useState<Mix[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isUnifiedSchedule, setIsUnifiedSchedulelOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const [annualInflation, setAnnualInflation] = useState<number>(2.8);
  const [compareMixId, setCompareMixId] = useState<string | null>(null);

  const inputBaseStyle = 
    "text-sm font-semibold text-gray-900 border border-gray-300 rounded-none px-3 py-1.5 focus:ring-1 focus:ring-[#1d75a1] focus:border-[#1d75a1] outline-none bg-white";

  const defaultLoan = (mixId: string): Loan => ({
    id: crypto.randomUUID(),
    mix_id: mixId,
    path_id: 1,
    grace_type_id: 1,
    amortization_schedule_id: 1,
    amount: 0,
    rate: 0,
    months: 0,
  });

  // 🔹 אתחול מקומי של תמהיל ברירת מחדל ללא קריאת API
  useEffect(() => {
    const defaultMixId = crypto.randomUUID();
    const defaultLoans: Loan[] = Array.from({ length: 3 }, () => defaultLoan(defaultMixId));

    const defaultMix: Mix = {
      id: defaultMixId,
      mix_name: "משכנתא נוכחית",
      loans: defaultLoans,
      is_base: true,
    };

    setMixes([defaultMix]);
    setActiveMixId(defaultMixId);
  }, []);

  const activeMix = mixes.find((m) => m.id === activeMixId);

  useEffect(() => setCompareMixId(null), [activeMixId]);

  // 🔹 Add Mix
  const addMix = () => {
    const newMixId = crypto.randomUUID();
    const newMix: Mix = {
      id: newMixId,
      mix_name: `תמהיל ${mixes.length + 1}`,
      loans: Array.from({ length: 3 }, () => defaultLoan(newMixId)),
    };
    setMixes((prev) => [...prev, newMix]);
    setActiveMixId(newMix.id);
  };

  // 🔹 Delete Mix
  const deleteMix = (id: string) => {
    const mix = mixes.find(m => m.id === id);
    if (!mix || mix.is_base) return;

    const remaining = mixes.filter(m => m.id !== id);
    setMixes(remaining);
    setActiveMixId(remaining.length ? remaining[0].id : null);
  };

  // 🔹 Duplicate Mix
  const duplicateMix = () => {
    if (!activeMixId) return;
    const mixToCopy = mixes.find(m => m.id === activeMixId);
    if (!mixToCopy) return;

    const duplicatedLoans = mixToCopy.loans?.map(l => ({ ...l, id: crypto.randomUUID() })) || [];

    const duplicatedMix: Mix = {
      ...mixToCopy,
      id: crypto.randomUUID(),
      mix_name: `${mixToCopy.mix_name} (העתק)`,
      loans: duplicatedLoans,
      is_base: false,
    };

    setMixes(prev => [...prev, duplicatedMix]);
    setActiveMixId(duplicatedMix.id);
  };

  // 🔹 Menu positioning
  const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX - 120,
    });
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl" ref={containerRef}>
      <div className="max-w-7xl mx-auto">
        
        {/* כותרת הדף ממורכזת לחלוטין */}
        <div className="mb-6 flex items-center justify-center border-b border-gray-200 pb-4">
          <h1 className="font-open-sans font-normal text-4xl text-gray-800 text-center leading-tight">
            מחשבון משכנתא
          </h1>
        </div>

        {/* קוביית בקרה ותפעול מרכזית ומאוחדת */}
        <div className="bg-white p-4 rounded-none border border-gray-200 shadow-sm mb-6 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            
            {/* 1. מדד מחירים צפוי */}
            <div className="w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Percent size={14} className="text-[#1d75a1]" />
                מדד מחירים צפוי שנתי:
              </label>
              <div className="relative shadow-sm">
                <input
                  type="number"
                  step="0.1"
                  value={annualInflation}
                  onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
                  className={`${inputBaseStyle} w-full`}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-bold">
                  %
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">
                חודשי: {(annualInflation / 12).toFixed(3)}%
              </div>
            </div>

            {/* 2. תמהיל להשוואה */}
            <div className="w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                תמהיל להשוואה:
              </label>
              <select
                value={compareMixId ?? ""}
                onChange={(e) => setCompareMixId(e.target.value || null)}
                disabled={!activeMix}
                className={`${inputBaseStyle} w-full disabled:bg-gray-50 disabled:text-gray-400`}
              >
                <option value="">ללא השוואה</option>
                {mixes
                  .filter((m) => m.id !== activeMixId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.mix_name}
                    </option>
                  ))}
              </select>
              <div className="text-[10px] text-transparent mt-0.5 font-semibold select-none">מרווח</div>
            </div>

            {/* 3. כפתור שכפול תמהיל */}
            <div className="w-full">
              <button
                onClick={duplicateMix}
                disabled={!activeMixId}
                className="h-9 w-full bg-[#1d75a1] text-white font-bold text-sm hover:bg-[#155b7e] transition shadow-sm flex items-center justify-center gap-1.5 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy size={15} />
                שכפל תמהיל פעיל
              </button>
              <div className="text-[10px] text-transparent mt-0.5 font-semibold select-none">מרווח</div>
            </div>

            {/* 4. כפתור לוח סילוקין לתמהיל */}
            <div className="w-full">
              <button
                onClick={() => setIsUnifiedSchedulelOpen(true)}
                className="h-9 w-full bg-gray-800 text-white font-bold text-sm hover:bg-gray-900 transition shadow-sm flex items-center justify-center gap-1.5 rounded-none"
              >
                <Calendar size={15} />
                לוח סילוקין משולב
              </button>
              <div className="text-[10px] text-transparent mt-0.5 font-semibold select-none">מרווח</div>
            </div>

          </div>
        </div>

        {/* בר לשוניות (Tabs) */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none mb-0 gap-1 items-end">
          {mixes.map((m) => {
            const isActive = m.id === activeMixId;
            return (
              <div
                key={m.id}
                onClick={() => setActiveMixId(m.id)}
                className={`group relative py-2 px-5 text-sm font-bold transition-all duration-150 whitespace-nowrap border-t border-x -mb-px text-center cursor-pointer flex items-center gap-2 rounded-none ${
                  isActive
                    ? "bg-[#1d75a1] border-[#1d75a1] text-white"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 border-transparent"
                }`}
                style={{ width: "auto" }}
              >
                {editingId === m.id ? (
                  <input
                    type="text"
                    value={m.mix_name}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setMixes((prev) =>
                        prev.map((x) => (x.id === m.id ? { ...x, mix_name: e.target.value } : x))
                      )
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                    className="px-1.5 py-0.5 text-xs text-black border focus:outline-none focus:ring-1 focus:ring-[#1d75a1] rounded-none font-medium"
                  />
                ) : (
                  <span>{m.mix_name}</span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openMenu(m.id, e);
                  }}
                  className={`px-1 rounded hover:bg-black/10 text-xs transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}
                >
                  ⋮
                </button>
              </div>
            );
          })}

          <button
            onClick={addMix}
            className="py-2 px-4 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition border border-transparent -mb-px text-center rounded-none"
            title="הוסף תמהיל חדש"
          >
            +
          </button>
        </div>

        {/* תפריט הדרופדאון הצף ללשונית */}
        {openMenuId && (
          <div
            className="fixed w-32 bg-white border border-gray-200 shadow-md z-[9999] rounded-none text-xs font-bold"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="flex justify-between items-center px-2 py-1 border-b bg-gray-50">
              <span className="text-[10px] text-gray-400">אפשרויות</span>
              <button onClick={() => setOpenMenuId(null)} className="text-gray-400 hover:text-red-600">
                ✕
              </button>
            </div>
            <button
              onClick={() => {
                setEditingId(openMenuId);
                setOpenMenuId(null);
              }}
              className="block w-full text-right px-3 py-2 hover:bg-gray-50 text-gray-700"
            >
              ✏ ערוך שם
            </button>
            <button
              onClick={() => {
                deleteMix(openMenuId);
                setOpenMenuId(null);
              }}
              disabled={mixes.find(m => m.id === openMenuId)?.is_base}
              className="block w-full text-right px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              🗑 מחק תמהיל
            </button>
          </div>
        )}

        {/* תוכן הטבלה הפעילה */}
        {activeMix && (
          <div className="bg-white border-x border-b border-gray-200 shadow-sm rounded-none mb-6">
            <div className="p-4 sm:p-6">
              {!loading && (
                <LoanTable
                  loans={activeMix.loans || []}
                  paths={loanPaths}
                  annualInflation={annualInflation}
                  setAnnualInflation={setAnnualInflation}
                  onChange={(newLoans) =>
                    setMixes((prev) =>
                      prev.map((m) => (m.id === activeMix.id ? { ...m, loans: newLoans } : m))
                    )
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* גרפים וטבלאות השוואה */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-none">
            <MixComparisonTable
              activeMixId={activeMixId}
              mixes={mixes}
              annualInflation={annualInflation}
              compareMixId={compareMixId}
            />
          </div>
          <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-none">
            <MixScheduleChartSVG
              activeMixId={activeMixId}
              mixes={mixes}
              annualInflation={annualInflation}
            />
          </div>
        </div>

      </div>

      {/* מודאל לוח סילוקין משולב */}
      {isUnifiedSchedule && (
        <UnifiedScheduleModal
          activeMixId={activeMixId}
          mixes={mixes}
          annualInflation={annualInflation}
          onClose={() => setIsUnifiedSchedulelOpen(false)}
        />
      )}
    </div>
  );
}
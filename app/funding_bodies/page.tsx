"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type FundingBody = { id: string; name: string };
type FundingTrack = {
  id: string;
  funding_body_id: string;
  amortization_schedule: string | null;
  min_interest_all_purpose_percent: number | null;
  track_type: string | null;
  max_spread_years: number | null;
  max_age: number | null;
  file_opening_fee_nis: number | null;
  file_opening_fee_percent: number | null;
  max_financing_percent: number | null;
  notes: string | null;
  mortgage_type: string | null;
  registration_method: string | null;
  additions: string | null;
  reverse_or_pension: string | null;
  restricted_customers: boolean;
  complex_customers: boolean;
};

type TableRow = Partial<FundingTrack> & {
  ui_id: string; 
  funding_body_id: string;
  body_name: string;
};

type SortConfig = {
  key: keyof TableRow | null;
  direction: 'asc' | 'desc';
};

const AMORTIZATION_OPTIONS = ["שפיצר", "בלון חלקי", "בלון מלא", "קרן שווה", "כפי יכולתך"];
const TRACK_OPTIONS = ["ק\"צ", "קל\"צ", "פריים", "מ\"צ", "מל\"צ"];
const MORTGAGE_TYPE_OPTIONS = ["דרגה ראשונה", "דרגה שניה", "הלוואת סולו"];
const REVERSE_PENSION_OPTIONS = ["הפוכה", "פנסיונית"];

const viewInputStyle = "w-full min-w-0 h-5 py-0 px-1 border border-transparent rounded text-xs font-medium text-center bg-transparent text-gray-800 outline-none cursor-default transition-colors leading-tight";
const filterInputStyle = "w-full min-w-0 p-1 border border-gray-300 rounded text-xs font-medium bg-white outline-none text-gray-800 focus:bg-orange-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors";

const getMortgageTypeViewStyle = (val: string | null | undefined) => 
  val === "דרגה שניה" 
    ? "w-full min-w-0 h-5 py-0 px-1 border border-blue-600 rounded text-xs text-center bg-blue-600 text-white font-bold outline-none cursor-default transition-colors leading-tight" 
    : viewInputStyle;

const getReversePensionViewStyle = (val: string | null | undefined) => {
  if (val === "הפוכה") return "w-full min-w-0 h-5 py-0 px-1 border border-teal-600 rounded text-xs text-center bg-teal-600 text-white font-bold outline-none cursor-default transition-colors leading-tight";
  if (val === "פנסיונית") return "w-full min-w-0 h-5 py-0 px-1 border border-purple-600 rounded text-xs text-center bg-purple-600 text-white font-bold outline-none cursor-default transition-colors leading-tight";
  return viewInputStyle;
};

export default function SpreadsheetPage() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [bodies, setBodies] = useState<FundingBody[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    funding_body_id: "",
    amortization_schedule: "",
    track_type: "",
    mortgage_type: "",
    reverse_or_pension: "",
    min_financing_percent: "",
    min_age_required: "",
    min_spread_required: "",
    restricted: "all",
    complex: "all",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "body_name", direction: "asc" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: bodiesData } = await supabase.from("hacamm_funding_bodies").select("*").order("name");
    const { data: tracksData } = await supabase.from("hacamm_funding_tracks").select("*");

    const fetchedBodies = (bodiesData as FundingBody[]) || [];
    const tracks = (tracksData as FundingTrack[]) || [];

    setBodies(fetchedBodies);

    const tableData: TableRow[] = [];

    fetchedBodies.forEach((body) => {
      const bodyTracks = tracks.filter((t) => t.funding_body_id === body.id);
      if (bodyTracks.length === 0) {
        tableData.push({ ui_id: `empty-${body.id}`, funding_body_id: body.id, body_name: body.name });
      } else {
        bodyTracks.forEach((track) => {
          tableData.push({ ...track, ui_id: track.id, body_name: body.name });
        });
      }
    });
    setRows(tableData);
    setLoading(false);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ 
      funding_body_id: "", 
      amortization_schedule: "", 
      track_type: "", 
      mortgage_type: "", 
      reverse_or_pension: "", 
      min_financing_percent: "",
      min_age_required: "", 
      min_spread_required: "", 
      restricted: "all", 
      complex: "all" 
    });
  };

  const filteredRows = rows.filter(row => {
    const isFilterActive = Object.values(filters).some(val => val !== "" && val !== "all");
    if (isFilterActive && row.ui_id.startsWith("empty-")) return false;

    if (filters.funding_body_id && row.funding_body_id !== filters.funding_body_id) return false;
    if (filters.amortization_schedule && row.amortization_schedule !== filters.amortization_schedule) return false;
    if (filters.track_type && row.track_type !== filters.track_type) return false;
    if (filters.mortgage_type && row.mortgage_type !== filters.mortgage_type) return false;
    
    if (filters.reverse_or_pension) {
      if (filters.reverse_or_pension === "both") {
        if (row.reverse_or_pension !== "הפוכה" && row.reverse_or_pension !== "פנסיונית") return false;
      } else if (row.reverse_or_pension !== filters.reverse_or_pension) {
        return false;
      }
    }
    
    if (filters.min_financing_percent && (row.max_financing_percent === null || row.max_financing_percent === undefined || row.max_financing_percent < Number(filters.min_financing_percent))) return false;
    if (filters.min_age_required && (row.max_age === null || row.max_age === undefined || row.max_age < Number(filters.min_age_required))) return false;
    if (filters.min_spread_required && (row.max_spread_years === null || row.max_spread_years === undefined || row.max_spread_years < Number(filters.min_spread_required))) return false;

    if (filters.restricted !== "all") {
      const wantsRestricted = filters.restricted === "yes";
      if (!!row.restricted_customers !== wantsRestricted) return false;
    }
    if (filters.complex !== "all") {
      const wantsComplex = filters.complex === "yes";
      if (!!row.complex_customers !== wantsComplex) return false;
    }

    return true;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (aValue === bValue) return 0;
    
    if (aValue === null || aValue === undefined || aValue === "") return sortConfig.direction === "asc" ? 1 : -1;
    if (bValue === null || bValue === undefined || bValue === "") return sortConfig.direction === "asc" ? -1 : 1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortConfig.direction === "asc" 
        ? aValue.localeCompare(bValue, "he") 
        : bValue.localeCompare(aValue, "he");
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof TableRow) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey }: { label: React.ReactNode, sortKey: keyof TableRow }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px] cursor-pointer hover:bg-gray-200 transition-colors select-none group"
        onClick={() => handleSort(sortKey)}
        title="לחץ למיון"
      >
        <div className="flex items-center justify-center gap-1">
          <span>{label}</span>
          <div className="flex flex-col text-[8px] leading-[8px] text-gray-300 group-hover:text-gray-400">
            <span className={isActive && sortConfig.direction === 'asc' ? '!text-blue-600' : ''}>▲</span>
            <span className={isActive && sortConfig.direction === 'desc' ? '!text-blue-600' : ''}>▼</span>
          </div>
        </div>
      </th>
    );
  };

  const ExpandableTextarea = ({ value }: { value: string | null | undefined }) => {
    return (
      <div className="relative w-full h-5 group/textarea hover:z-[100] focus-within:z-[100]">
        <textarea
          value={value || ""} 
          readOnly 
          className="absolute bottom-0 left-0 w-full min-w-0 h-5 py-0 px-1 text-xs font-medium text-right border rounded outline-none transition-all duration-200 resize-none overflow-hidden whitespace-pre-wrap leading-tight
            group-hover/textarea:w-[220px] group-hover/textarea:h-[120px] group-hover/textarea:z-[100] group-hover/textarea:shadow-2xl group-hover/textarea:overflow-y-auto
            border-transparent bg-transparent text-gray-800 cursor-text group-hover/textarea:bg-white group-hover/textarea:border-gray-300"
        />
      </div>
    );
  }

  const CustomCheckbox = ({ checked }: { checked: boolean }) => (
    <div className="flex justify-center items-center w-full min-w-0 h-5">
      <label className="relative flex items-center justify-center cursor-default">
        <input 
          type="checkbox" checked={checked} disabled={true} readOnly
          className={`peer appearance-none w-3.5 h-3.5 border-[1.5px] rounded-sm transition-colors ${checked ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}
        />
        <svg className={`absolute w-3 h-3 text-red-500 pointer-events-none transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </label>
    </div>
  );

  const selectedRowData = rows.find(r => r.ui_id === selectedRowId);

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4 font-sans text-gray-800 flex flex-col" dir="rtl">
      <div className="w-full mx-auto bg-white rounded-xl shadow-sm border border-gray-300 flex flex-col h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] overflow-hidden">
        
        <div className="p-3 bg-gray-100 border-b border-gray-300 flex flex-wrap justify-between items-center shrink-0 gap-2">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 ml-2 md:ml-4">גופי מימון</h2>
            
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`px-2 md:px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 md:gap-2 border ${showFilters ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              {showFilters ? 'כיבוי סינון' : 'הפעל סינון'}
            </button>

            {showFilters && (
              <button 
                onClick={clearFilters} 
                className="px-2 md:px-3 py-1.5 bg-gray-200 hover:bg-gray-300 focus:bg-gray-300 focus:ring-2 focus:ring-orange-400 text-gray-800 font-bold rounded-lg text-sm transition-colors outline-none shadow-sm"
              >
                נקה סינון
              </button>
            )}
          </div>
          {loading && <span className="text-sm font-medium text-gray-500">טוען...</span>}
        </div>

        <div className="overflow-auto flex-1 relative bg-white">
          <table className="w-full table-fixed text-center border-collapse">
            
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[4%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[6%]" />
              <col className="w-[5%]" />
              <col className="w-[19%]" />
            </colgroup>

            <thead className="text-gray-800 sticky top-0 z-20 shadow-sm bg-gray-100">
              
              {showFilters && (
                <tr className="bg-blue-50/50">
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="funding_body_id" value={filters.funding_body_id} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{bodies.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="amortization_schedule" value={filters.amortization_schedule} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{AMORTIZATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="track_type" value={filters.track_type} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{TRACK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><input type="number" name="min_financing_percent" value={filters.min_financing_percent} onChange={handleFilterChange} placeholder="לפחות..." className={filterInputStyle} /></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="mortgage_type" value={filters.mortgage_type} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{MORTGAGE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="reverse_or_pension" value={filters.reverse_or_pension} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option><option value="both">שתיהן</option>{REVERSE_PENSION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><input type="number" name="min_age_required" value={filters.min_age_required} onChange={handleFilterChange} placeholder="לפחות..." className={filterInputStyle} /></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><input type="number" name="min_spread_required" value={filters.min_spread_required} onChange={handleFilterChange} placeholder="לפחות..." className={filterInputStyle} /></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="restricted" value={filters.restricted} onChange={handleFilterChange} className={filterInputStyle}><option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option></select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="complex" value={filters.complex} onChange={handleFilterChange} className={filterInputStyle}><option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option></select></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300"></th>
                </tr>
              )}

              <tr>
                <SortableHeader label="גוף מימון" sortKey="body_name" />
                <SortableHeader label="לוח סילוקין" sortKey="amortization_schedule" />
                <SortableHeader label={<span>ריביות<br/>מינימום</span>} sortKey="min_interest_all_purpose_percent" />
                <SortableHeader label="מסלול" sortKey="track_type" />
                <SortableHeader label={<span>אחוז<br/>מימון</span>} sortKey="max_financing_percent" />
                <SortableHeader label="סוג משכנתא" sortKey="mortgage_type" />
                <SortableHeader label={<span>פנסיונית /<br/>הפוכה</span>} sortKey="reverse_or_pension" />
                <SortableHeader label="גיל מקס'" sortKey="max_age" />
                <SortableHeader label={<span>פריסה<br/>בשנים</span>} sortKey="max_spread_years" />
                <SortableHeader label={<span>לקוחות<br/>מוגבלים</span>} sortKey="restricted_customers" />
                <SortableHeader label={<span>לקוחות<br/>מורכבים</span>} sortKey="complex_customers" />
                <SortableHeader label="פתיחת תיק ₪" sortKey="file_opening_fee_nis" />
                <SortableHeader label="פתיחת תיק %" sortKey="file_opening_fee_percent" />
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">תוספות</th>
              </tr>
            </thead>
            
            <tbody>
              {sortedRows.map((row, idx) => {
                const isSelected = selectedRowId === row.ui_id;
                const isDiffFromPrev = idx > 0 && sortedRows[idx - 1].body_name !== row.body_name;

                const baseBorderClasses = isSelected ? 'border-orange-500 bg-orange-100/60' : 'border-gray-200 hover:bg-orange-50/30';
                const tdClasses = `p-0.5 align-middle cursor-pointer transition-all duration-150 border-solid border ${baseBorderClasses} ${isSelected ? 'border-y-[3px]' : ''}`;
                const firstTdClasses = `${tdClasses} ${isSelected ? 'border-r-[3px]' : ''}`;
                const lastTdClasses = `${tdClasses} ${isSelected ? 'border-l-[3px]' : ''}`;

                return (
                  <tr 
                    key={row.ui_id}
                    onClick={() => setSelectedRowId(row.ui_id)} 
                    className={`relative transition-colors ${isSelected ? 'z-10' : ''} ${isDiffFromPrev && !isSelected ? 'border-t-[3px] border-t-gray-300' : ''}`}
                  >
                    <td className={`font-extrabold text-blue-900 text-right ${firstTdClasses}`}>
                      <div className="flex items-center justify-between gap-1 w-full overflow-hidden px-1 h-5">
                        <span className="text-xs truncate w-full" title={row.body_name}>{row.body_name}</span>
                      </div>
                    </td>

                    <td className={`${tdClasses}`}><input readOnly value={row.amortization_schedule || ""} className={viewInputStyle} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.min_interest_all_purpose_percent ? `${row.min_interest_all_purpose_percent}%` : ""} className={viewInputStyle} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.track_type || ""} className={viewInputStyle} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.max_financing_percent ? `${row.max_financing_percent}%` : ""} className={viewInputStyle} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.mortgage_type || ""} className={getMortgageTypeViewStyle(row.mortgage_type)} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.reverse_or_pension || ""} className={getReversePensionViewStyle(row.reverse_or_pension)} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.max_age || ""} className={viewInputStyle} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.max_spread_years || ""} className={viewInputStyle} /></td>
                    <td className={`${tdClasses}`}><CustomCheckbox checked={!!row.restricted_customers} /></td>
                    <td className={`${tdClasses}`}><CustomCheckbox checked={!!row.complex_customers} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.file_opening_fee_nis ? `₪${row.file_opening_fee_nis}` : ""} className={viewInputStyle} /></td>
                    <td className={`${tdClasses}`}><input readOnly value={row.file_opening_fee_percent ? `${row.file_opening_fee_percent}%` : ""} className={viewInputStyle} /></td>
                    <td className={`${lastTdClasses}`}><ExpandableTextarea value={row.additions} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {sortedRows.length === 0 && !loading && (
            <div className="text-center p-8 text-gray-500 font-medium bg-white">לא נמצאו מסלולים התואמים לסינון</div>
          )}
        </div>

        <div className="h-[12vh] min-h-[90px] bg-gray-50 border-t border-gray-300 p-2 md:p-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 relative flex flex-col">
          {selectedRowData ? (
            <div className="flex gap-4 h-full overflow-hidden">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs md:text-sm font-bold text-gray-800">שיטת רישום</label>
                <div className="text-xs md:text-sm font-medium p-2 bg-white border border-gray-200 rounded h-full overflow-y-auto whitespace-pre-wrap text-gray-800">
                  {selectedRowData.registration_method || <span className="text-gray-400 italic">אין נתונים</span>}
                </div>
              </div>
              
              <div className="flex-[3] flex flex-col gap-1">
                <label className="text-xs md:text-sm font-bold text-gray-800">הערות</label>
                <div className="text-xs md:text-sm font-medium p-2 bg-white border border-gray-200 rounded h-full overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-800">
                  {selectedRowData.notes || <span className="text-gray-400 italic">אין הערות</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 font-medium text-sm">
              לחץ על שורה בטבלה כדי לראות את פרטי שיטת הרישום וההערות שלה
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

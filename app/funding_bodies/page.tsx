"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx"; 

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
  is_new?: boolean; 
};

const AMORTIZATION_OPTIONS = ["שפיצר", "בלון חלקי", "בלון מלא", "קרן שווה", "כפי יכולתך"];
const TRACK_OPTIONS = ["ק\"צ", "קל\"צ", "פריים", "מ\"צ", "מל\"צ"];
const MORTGAGE_TYPE_OPTIONS = ["דרגה ראשונה", "דרגה שניה", "הלוואת סולו"];
const REVERSE_PENSION_OPTIONS = ["הפוכה", "פנסיונית"];

const viewInputStyle = "w-full min-w-0 p-1 border border-transparent rounded text-sm font-medium text-center bg-transparent text-gray-800 outline-none cursor-default transition-colors";
const editInputStyle = "w-full min-w-0 p-1 border border-blue-400 rounded text-sm font-medium text-center outline-none bg-white shadow-inner focus:bg-orange-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400 transition-colors";
const filterInputStyle = "w-full min-w-0 p-1 border border-gray-300 rounded text-xs font-medium bg-white outline-none text-gray-800 focus:bg-orange-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors";

const getMortgageTypeViewStyle = (val: string | null | undefined) => 
  val === "דרגה שניה" 
    ? "w-full min-w-0 p-1 border border-blue-600 rounded text-sm text-center bg-blue-600 text-white font-bold outline-none cursor-default transition-colors" 
    : viewInputStyle;

const getMortgageTypeEditStyle = (val: string | null | undefined) => 
  val === "דרגה שניה" 
    ? "w-full min-w-0 p-1 border border-blue-600 rounded text-sm text-center bg-blue-600 text-white font-bold outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-colors" 
    : editInputStyle;

export default function SpreadsheetPage() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [bodies, setBodies] = useState<FundingBody[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<TableRow>>({});
  
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    funding_body_id: "",
    amortization_schedule: "",
    track_type: "",
    mortgage_type: "",
    reverse_or_pension: "",
    min_age_required: "",
    min_spread_required: "",
    restricted: "all",
    complex: "all",
  });

  const [isAddingBody, setIsAddingBody] = useState(false);
  const [newBodyName, setNewBodyName] = useState("");

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
        tableData.push({ ui_id: `empty-${body.id}`, funding_body_id: body.id, body_name: body.name, is_new: true });
      } else {
        bodyTracks.forEach((track) => {
          tableData.push({ ...track, ui_id: track.id, body_name: body.name, is_new: false });
        });
      }
    });
    setRows(tableData);
    setLoading(false);
  };

  const handleAddBody = async () => {
    if (!newBodyName.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("hacamm_funding_bodies")
      .insert([{ name: newBodyName.trim() }]);
    
    if (error) {
      alert("שגיאה בהוספת גוף מימון: " + error.message);
      setLoading(false);
    } else {
      setNewBodyName("");
      setIsAddingBody(false);
      fetchData();
    }
  };

  const handleEdit = (row: TableRow) => {
    setEditingRowId(row.ui_id);
    setSelectedRowId(row.ui_id); 
    setEditFormData({ ...row });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    if (type === "checkbox") {
      setEditFormData((prev) => ({ ...prev, [name]: target.checked }));
    } else {
      setEditFormData((prev) => ({ ...prev, [name]: value === "" ? null : value }));
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ funding_body_id: "", amortization_schedule: "", track_type: "", mortgage_type: "", reverse_or_pension: "", min_age_required: "", min_spread_required: "", restricted: "all", complex: "all" });
  };

  const handleAddNewTrackToBody = (body_id: string, body_name: string) => {
    const newUiId = `new-${Date.now()}`;
    const newRow: TableRow = { ui_id: newUiId, funding_body_id: body_id, body_name: body_name, is_new: true };
    setRows((prev) => {
      const lastIndex = prev.map(r => r.funding_body_id).lastIndexOf(body_id);
      const newRows = [...prev];
      newRows.splice(lastIndex + 1, 0, newRow);
      return newRows;
    });
    setEditingRowId(newUiId);
    setSelectedRowId(newUiId);
    setEditFormData(newRow);
    clearFilters(); 
  };

  const handleCancel = (ui_id: string, is_new?: boolean) => {
    setEditingRowId(null);
    setEditFormData({});
    if (is_new && ui_id.startsWith("new-")) {
      setRows((prev) => prev.filter((r) => r.ui_id !== ui_id));
      if (selectedRowId === ui_id) setSelectedRowId(null);
    }
  };

  const handleSave = async () => {
    const { ui_id, is_new, body_name, id, ...dataToSave } = editFormData;
    const payload = {
      ...dataToSave,
      min_interest_all_purpose_percent: dataToSave.min_interest_all_purpose_percent ? Number(dataToSave.min_interest_all_purpose_percent) : null,
      max_spread_years: dataToSave.max_spread_years ? Number(dataToSave.max_spread_years) : null,
      max_age: dataToSave.max_age ? Number(dataToSave.max_age) : null,
      file_opening_fee_nis: dataToSave.file_opening_fee_nis ? Number(dataToSave.file_opening_fee_nis) : null,
      file_opening_fee_percent: dataToSave.file_opening_fee_percent ? Number(dataToSave.file_opening_fee_percent) : null,
      max_financing_percent: dataToSave.max_financing_percent ? Number(dataToSave.max_financing_percent) : null,
      reverse_or_pension: dataToSave.reverse_or_pension || null, 
      restricted_customers: !!dataToSave.restricted_customers,
      complex_customers: !!dataToSave.complex_customers,
    };

    if (is_new) {
      const { error } = await supabase.from("hacamm_funding_tracks").insert([payload]);
      if (error) alert("שגיאה ביצירת המסלול: " + error.message);
    } else {
      const { error } = await supabase.from("hacamm_funding_tracks").update(payload).eq("id", id!);
      if (error) alert("שגיאה בעדכון המסלול: " + error.message);
    }

    setEditingRowId(null);
    setEditFormData({});
    fetchData();
  };

  const handleDelete = async (row: TableRow) => {
    if (row.is_new) return; 
    if (!confirm("האם אתה בטוח שברצונך למחוק מסלול זה?")) return;
    const { error } = await supabase.from("hacamm_funding_tracks").delete().eq("id", row.id!);
    if (error) alert("שגיאה במחיקה: " + error.message);
    else {
      if (selectedRowId === row.ui_id) setSelectedRowId(null);
      fetchData();
    }
  };

  const filteredRows = rows.filter(row => {
    if (row.is_new && row.ui_id.startsWith("new-")) return true;
    const isFilterActive = Object.values(filters).some(val => val !== "" && val !== "all");
    if (isFilterActive && row.ui_id.startsWith("empty-")) return false;

    if (filters.funding_body_id && row.funding_body_id !== filters.funding_body_id) return false;
    if (filters.amortization_schedule && row.amortization_schedule !== filters.amortization_schedule) return false;
    if (filters.track_type && row.track_type !== filters.track_type) return false;
    if (filters.mortgage_type && row.mortgage_type !== filters.mortgage_type) return false;
    if (filters.reverse_or_pension && row.reverse_or_pension !== filters.reverse_or_pension) return false;
    
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

  const exportToExcel = () => {
    const dataToExport = filteredRows
      .filter((row) => !row.is_new)
      .map((row) => {
        const isEmptyPlaceholder = row.ui_id.startsWith("empty-");
        return {
          "גוף מימון": row.body_name || "",
          "לוח סילוקין": row.amortization_schedule || "",
          "ריביות לכל מטרה מינימום (%)": row.min_interest_all_purpose_percent || "",
          "מסלול": row.track_type || "",
          "אחוז מימון מקסימלי (%)": row.max_financing_percent || "",
          "סוג משכנתא": row.mortgage_type || "",
          "פנסיונית/הפוכה": row.reverse_or_pension || "",
          "גיל מקס'": row.max_age || "",
          "פריסה מקסימלית בשנים": row.max_spread_years || "",
          "לקוחות מוגבלים": isEmptyPlaceholder ? "" : (row.restricted_customers ? "כן" : "לא"),
          "לקוחות מורכבים": isEmptyPlaceholder ? "" : (row.complex_customers ? "כן" : "לא"),
          "פתיחת תיק (₪)": row.file_opening_fee_nis || "",
          "פתיחת תיק (%)": row.file_opening_fee_percent || "",
          "שיטת רישום": row.registration_method || "",
          "תוספות": row.additions || "",
          "הערות": row.notes || "",
        };
      });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "מסלולי מימון");

    if (!worksheet["!views"]) worksheet["!views"] = [];
    worksheet["!views"].push({ rightToLeft: true });

    XLSX.writeFile(workbook, "מסלולי_מימון.xlsx");
  };

  const ExpandableTextarea = ({ name, value, isEditing, onChange }: any) => (
    <div className="relative w-full h-[26px] group/textarea hover:z-[100] focus-within:z-[100]">
      <textarea
        name={name} value={value || ""} onChange={isEditing ? onChange : undefined} readOnly={!isEditing} placeholder={isEditing ? "הקלד..." : ""}
        className={`absolute top-0 right-0 w-full min-w-0 h-[26px] p-1 text-sm font-medium text-right border rounded outline-none transition-all duration-200 resize-none overflow-hidden whitespace-pre-wrap leading-relaxed
          group-hover/textarea:w-[220px] group-hover/textarea:h-[120px] group-hover/textarea:z-[100] group-hover/textarea:shadow-2xl group-hover/textarea:overflow-y-auto
          focus:w-[220px] focus:h-[120px] focus:z-[100] focus:shadow-2xl focus:overflow-y-auto focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400
          ${isEditing 
            ? "border-blue-400 bg-white shadow-inner" 
            : "border-transparent bg-transparent text-gray-800 cursor-text group-hover/textarea:bg-white group-hover/textarea:border-gray-300"
          }`}
      />
    </div>
  );

  const CustomCheckbox = ({ checked, onChange, readOnly = false, name = "" }: { checked: boolean, onChange?: any, readOnly?: boolean, name?: string }) => (
    <div className="flex justify-center items-center w-full min-w-0">
      <label className={`relative flex items-center justify-center ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
        <input 
          type="checkbox" name={name} checked={checked} onChange={readOnly ? undefined : onChange} disabled={readOnly}
          className={`peer appearance-none w-4 h-4 md:w-5 md:h-5 border-2 rounded-sm transition-colors focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:bg-orange-50 ${checked ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} ${!readOnly && 'hover:border-red-400 focus:outline-none'}`}
        />
        <svg className={`absolute w-3 h-3 md:w-3.5 md:h-3.5 text-red-500 pointer-events-none transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </label>
    </div>
  );

  const tdBaseClasses = "border transition-colors duration-150 align-middle cursor-pointer";

  const selectedRowData = rows.find(r => r.ui_id === selectedRowId);
  const isEditingSelected = editingRowId === selectedRowId;
  const bottomPaneData = isEditingSelected ? editFormData : selectedRowData;

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
              סינון מתקדם
            </button>

            {showFilters && (
              <button 
                onClick={clearFilters} 
                className="px-2 md:px-3 py-1.5 bg-gray-200 hover:bg-gray-300 focus:bg-gray-300 focus:ring-2 focus:ring-orange-400 text-gray-800 font-bold rounded-lg text-sm transition-colors outline-none shadow-sm"
              >
                נקה סינון
              </button>
            )}

            <button 
              onClick={exportToExcel}
              className="px-2 md:px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 md:gap-2 border bg-white text-green-700 border-green-200 hover:bg-green-50 focus:ring-2 focus:ring-green-400 outline-none shadow-sm"
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.85858 2.87756L15.4293 1.08175C15.7027 1.04269 15.9559 1.23265 15.995 1.50601C15.9983 1.52943 16 1.55306 16 1.57672V22.4237C16 22.6998 15.7761 22.9237 15.5 22.9237C15.4763 22.9237 15.4527 22.922 15.4293 22.9187L2.85858 21.1229C2.36593 21.0525 2 20.6306 2 20.1329V3.86754C2 3.36986 2.36593 2.94794 2.85858 2.87756ZM17 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H17V3ZM11.7604 15.5135L8.91883 11.5L11.7346 7.64332L9.84507 7.64332L8.03158 10.3807L6.21639 7.64332L4.36981 7.64332L7.14327 11.5L4.25816 15.5135L6.15579 15.5135L8.03531 12.6397L9.90799 15.5135L11.7604 15.5135Z"></path>
              </svg>
              ייצוא לאקסל
            </button>

            <div className="border-r border-gray-300 pr-2 md:pr-3 flex items-center gap-1 md:gap-2">
              {isAddingBody ? (
                <div className="flex items-center gap-1 md:gap-2 animate-fade-in">
                  <input 
                    type="text" 
                    value={newBodyName} 
                    onChange={(e) => setNewBodyName(e.target.value)} 
                    placeholder="הזן שם גוף מימון..." 
                    className="border border-blue-400 rounded px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 w-32 md:w-48 shadow-inner"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBody()}
                  />
                  <button onClick={handleAddBody} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-sm font-bold transition-colors outline-none focus:ring-2 focus:ring-blue-400">שמור</button>
                  <button onClick={() => { setIsAddingBody(false); setNewBodyName(""); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1.5 rounded text-sm font-bold transition-colors outline-none focus:ring-2 focus:ring-gray-400">ביטול</button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingBody(true)}
                  className="px-2 md:px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 md:gap-2 border bg-white text-blue-700 border-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  הוסף גוף מימון
                </button>
              )}
            </div>
            
          </div>
          {loading && <span className="text-sm font-medium text-gray-500">טוען...</span>}
        </div>

        <div className="overflow-auto flex-1 relative bg-white">
          <table className="w-full table-fixed text-center border-collapse">
            
            <colgroup>
              <col className="w-[9%]" />
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
              <col className="w-[13%]" />
              <col className="w-[7%]" />
            </colgroup>

            <thead className="text-gray-800 sticky top-0 z-20 shadow-sm bg-gray-100">
              
              {showFilters && (
                <tr className="bg-blue-50/50">
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="funding_body_id" value={filters.funding_body_id} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{bodies.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="amortization_schedule" value={filters.amortization_schedule} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{AMORTIZATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="track_type" value={filters.track_type} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{TRACK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="mortgage_type" value={filters.mortgage_type} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{MORTGAGE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="reverse_or_pension" value={filters.reverse_or_pension} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{REVERSE_PENSION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><input type="number" name="min_age_required" value={filters.min_age_required} onChange={handleFilterChange} placeholder="לפחות..." className={filterInputStyle} /></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><input type="number" name="min_spread_required" value={filters.min_spread_required} onChange={handleFilterChange} placeholder="לפחות..." className={filterInputStyle} /></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="restricted" value={filters.restricted} onChange={handleFilterChange} className={filterInputStyle}><option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option></select></th>
                  <th className="p-0.5 border border-gray-300 align-middle"><select name="complex" value={filters.complex} onChange={handleFilterChange} className={filterInputStyle}><option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option></select></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300"></th>
                  <th className="p-0.5 border border-gray-300 sticky left-0 bg-blue-50 z-30 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] align-middle"></th>
                </tr>
              )}

              <tr>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">גוף מימון</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">לוח סילוקין</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">ריביות מינימום</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">מסלול</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">אחוז מימון</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">סוג משכנתא</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">פנסיונית / הפוכה</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">גיל מקס'</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">פריסה בשנים</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">לקוחות מוגבלים</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">לקוחות מורכבים</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">פתיחת תיק ₪</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">פתיחת תיק %</th>
                <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px]">תוספות</th>
                <th className="p-1 border border-gray-300 bg-gray-200 font-bold leading-tight align-middle sticky left-0 z-30 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] text-[11px]">פעולות</th>
              </tr>
            </thead>
            
            <tbody>
              {filteredRows.map((row, idx) => {
                const isEditing = editingRowId === row.ui_id;
                const isSelected = selectedRowId === row.ui_id;
                const isDiffFromPrev = idx > 0 && filteredRows[idx - 1].funding_body_id !== row.funding_body_id;

                const tdClasses = `${tdBaseClasses} ${isSelected ? 'border-orange-400 bg-orange-50/60' : 'border-gray-200 hover:bg-orange-50/30'}`;
                const firstTdBg = isSelected ? 'bg-orange-100/60' : 'bg-gray-50/50 hover:bg-orange-50/30';
                const actionsBg = isSelected ? 'bg-orange-50' : 'bg-white hover:bg-orange-50/30';

                return (
                  <tr 
                    key={row.ui_id} 
                    onClick={() => setSelectedRowId(row.ui_id)} 
                    className={`relative transition-colors ${isSelected ? 'z-10' : ''} ${isDiffFromPrev ? 'border-t-[3px] border-t-gray-300' : 'border-t border-t-gray-200'}`}
                  >
                    <td className={`p-0.5 md:p-1 font-extrabold text-blue-900 text-right ${firstTdBg} ${tdClasses}`}>
                      <div className="flex flex-col items-start gap-1 pr-1 w-full overflow-hidden">
                        <span className="text-xs truncate w-full" title={row.body_name}>{row.body_name}</span>
                        {!isEditing && (
                          <button onClick={(e) => { e.stopPropagation(); handleAddNewTrackToBody(row.funding_body_id, row.body_name); }} className="text-xs text-blue-600 hover:text-blue-800 focus:ring-1 focus:ring-orange-400 font-bold bg-white border border-blue-100 rounded px-1 py-0.5 whitespace-nowrap outline-none">
                            + מסלול
                          </button>
                        )}
                      </div>
                    </td>

                    {isEditing ? (
                      <>
                        <td className={`p-0.5 ${tdClasses}`}><select name="amortization_schedule" value={editFormData.amortization_schedule || ""} onChange={handleChange} className={editInputStyle}><option value=""></option>{AMORTIZATION_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
                        <td className={`p-0.5 ${tdClasses}`}><input type="number" step="0.01" name="min_interest_all_purpose_percent" value={editFormData.min_interest_all_purpose_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
                        <td className={`p-0.5 ${tdClasses}`}><select name="track_type" value={editFormData.track_type || ""} onChange={handleChange} className={editInputStyle}><option value=""></option>{TRACK_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
                        <td className={`p-0.5 ${tdClasses}`}><input type="number" step="0.01" name="max_financing_percent" value={editFormData.max_financing_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
                        <td className={`p-0.5 ${tdClasses}`}><select name="mortgage_type" value={editFormData.mortgage_type || ""} onChange={handleChange} className={getMortgageTypeEditStyle(editFormData.mortgage_type)}><option value=""></option>{MORTGAGE_TYPE_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
                        <td className={`p-0.5 ${tdClasses}`}><select name="reverse_or_pension" value={editFormData.reverse_or_pension || ""} onChange={handleChange} className={editInputStyle}><option value=""></option>{REVERSE_PENSION_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
                        <td className={`p-0.5 ${tdClasses}`}><input type="number" name="max_age" value={editFormData.max_age || ""} onChange={handleChange} className={editInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input type="number" name="max_spread_years" value={editFormData.max_spread_years || ""} onChange={handleChange} className={editInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox name="restricted_customers" checked={!!editFormData.restricted_customers} onChange={handleChange} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox name="complex_customers" checked={!!editFormData.complex_customers} onChange={handleChange} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input type="number" name="file_opening_fee_nis" value={editFormData.file_opening_fee_nis || ""} onChange={handleChange} className={editInputStyle} placeholder="₪" /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input type="number" step="0.01" name="file_opening_fee_percent" value={editFormData.file_opening_fee_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
                        <td className={`p-0.5 ${tdClasses}`}><ExpandableTextarea name="additions" value={editFormData.additions} isEditing={true} onChange={handleChange} /></td>
                        
                        <td className={`p-1 text-center sticky left-0 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] z-10 ${actionsBg} ${tdClasses}`}>
                          <div className="flex flex-col gap-1 justify-center items-center h-full">
                            <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-orange-400 text-white px-1.5 py-1 rounded transition text-xs font-bold w-full outline-none">שמור</button>
                            <button onClick={(e) => { e.stopPropagation(); handleCancel(row.ui_id, row.is_new); }} className="bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-orange-400 text-gray-800 px-1.5 py-1 rounded transition text-xs font-bold w-full outline-none">בטל</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.amortization_schedule || ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.min_interest_all_purpose_percent ? `${row.min_interest_all_purpose_percent}%` : ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.track_type || ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.max_financing_percent ? `${row.max_financing_percent}%` : ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.mortgage_type || ""} className={getMortgageTypeViewStyle(row.mortgage_type)} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.reverse_or_pension || ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.max_age || ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.max_spread_years || ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox checked={!!row.restricted_customers} readOnly={true} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox checked={!!row.complex_customers} readOnly={true} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.file_opening_fee_nis ? `₪${row.file_opening_fee_nis}` : ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.file_opening_fee_percent ? `${row.file_opening_fee_percent}%` : ""} className={viewInputStyle} /></td>
                        <td className={`p-0.5 ${tdClasses}`}><ExpandableTextarea name="additions" value={row.additions} isEditing={false} /></td>
                        
                        <td className={`p-1 text-center sticky left-0 backdrop-blur-sm shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] z-10 flex justify-center items-center h-full gap-1 ${actionsBg} ${tdClasses}`}>
                          <div className="flex flex-col gap-1 justify-center items-center h-full w-full">
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="text-blue-600 hover:text-blue-800 bg-blue-50 focus:bg-orange-100 focus:ring-1 focus:ring-orange-400 px-1.5 py-1 rounded transition text-xs font-bold border border-blue-100 w-full outline-none">
                              {row.is_new ? "הוסף" : "ערוך"}
                            </button>
                            {!row.is_new && (
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="text-red-600 hover:text-red-800 bg-red-50 focus:bg-orange-100 focus:ring-1 focus:ring-orange-400 px-1.5 py-1 rounded transition text-xs font-bold border border-red-100 w-full outline-none">מחק</button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredRows.length === 0 && !loading && (
            <div className="text-center p-8 text-gray-500 font-medium bg-white">לא נמצאו מסלולים התואמים לסינון</div>
          )}
        </div>

        <div className="h-[25vh] min-h-[150px] bg-gray-50 border-t border-gray-300 p-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 relative flex flex-col">
          {selectedRowData || (editingRowId && editFormData.ui_id === selectedRowId) ? (
            <div className="flex flex-col h-full gap-2">
              <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
                <h3 className="font-extrabold text-gray-800 text-base">
                  פרטים נוספים - {bottomPaneData?.body_name} 
                  {bottomPaneData?.track_type && ` (${bottomPaneData.track_type})`}
                  {isEditingSelected && <span className="text-blue-600 font-medium mr-2">- מצב עריכה פתוח</span>}
                </h3>
              </div>
              
              <div className="flex gap-4 h-full pb-1 overflow-hidden">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-800">שיטת רישום</label>
                  {isEditingSelected ? (
                    <textarea 
                      name="registration_method" 
                      value={bottomPaneData?.registration_method || ''} 
                      onChange={handleChange} 
                      className={`${editInputStyle} h-full resize-none text-right text-sm`} 
                      placeholder="הזן שיטת רישום..."
                    />
                  ) : (
                    <div className="text-sm font-medium p-2 bg-white border border-gray-200 rounded h-full overflow-y-auto whitespace-pre-wrap text-gray-800">
                      {bottomPaneData?.registration_method || <span className="text-gray-400 italic">אין נתונים</span>}
                    </div>
                  )}
                </div>
                
                <div className="flex-[2] flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-800">הערות</label>
                  {isEditingSelected ? (
                    <textarea 
                      name="notes" 
                      value={bottomPaneData?.notes || ''} 
                      onChange={handleChange} 
                      className={`${editInputStyle} h-full resize-none text-right leading-relaxed text-sm`} 
                      placeholder="הזן הערות (ניתן לרדת שורות)..."
                    />
                  ) : (
                    <div className="text-sm font-medium p-2 bg-white border border-gray-200 rounded h-full overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-800">
                      {bottomPaneData?.notes || <span className="text-gray-400 italic">אין הערות</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 font-medium text-sm">
              לחץ על שורה בטבלה כדי לראות ולערוך את פרטי שיטת הרישום וההערות שלה
            </div>
          )}
        </div>

      </div>
    </div>
  );
}



// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@supabase/supabase-js";
// import * as XLSX from "xlsx"; 

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

// type FundingBody = { id: string; name: string };
// type FundingTrack = {
//   id: string;
//   funding_body_id: string;
//   amortization_schedule: string | null;
//   min_interest_all_purpose_percent: number | null;
//   track_type: string | null;
//   max_spread_years: number | null;
//   max_age: number | null;
//   file_opening_fee_nis: number | null;
//   file_opening_fee_percent: number | null;
//   max_financing_percent: number | null;
//   notes: string | null;
//   mortgage_type: string | null;
//   registration_method: string | null;
//   additions: string | null;
//   restricted_customers: boolean;
//   complex_customers: boolean;
// };

// type TableRow = Partial<FundingTrack> & {
//   ui_id: string; 
//   funding_body_id: string;
//   body_name: string;
//   is_new?: boolean; 
// };

// const AMORTIZATION_OPTIONS = ["שפיצר", "בלון חלקי", "בלון מלא", "קרן שווה", "כפי יכולתך"];
// const TRACK_OPTIONS = ["ק\"צ", "קל\"צ", "פריים", "מ\"צ", "מל\"צ"];
// const MORTGAGE_TYPE_OPTIONS = ["דרגה ראשונה", "דרגה שניה", "הלוואת סולו"];

// const viewInputStyle = "w-full min-w-0 p-1 border border-transparent rounded text-[11px] text-center bg-transparent text-gray-800 outline-none cursor-default focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors";
// const editInputStyle = "w-full min-w-0 p-1 border border-blue-400 rounded text-[11px] text-center outline-none bg-white shadow-inner focus:bg-orange-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400 transition-colors";
// const filterInputStyle = "w-full min-w-0 p-1 border border-gray-300 rounded text-[10px] bg-white outline-none text-gray-700 focus:bg-orange-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors";

// const getMortgageTypeViewStyle = (val: string | null | undefined) => 
//   val === "דרגה שניה" 
//     ? "w-full min-w-0 p-1 border border-blue-600 rounded text-[11px] text-center bg-blue-600 text-white font-medium outline-none cursor-default transition-colors" 
//     : viewInputStyle;

// const getMortgageTypeEditStyle = (val: string | null | undefined) => 
//   val === "דרגה שניה" 
//     ? "w-full min-w-0 p-1 border border-blue-600 rounded text-[11px] text-center bg-blue-600 text-white font-medium outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-colors" 
//     : editInputStyle;

// export default function SpreadsheetPage() {
//   const [rows, setRows] = useState<TableRow[]>([]);
//   const [bodies, setBodies] = useState<FundingBody[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [editingRowId, setEditingRowId] = useState<string | null>(null);
//   const [editFormData, setEditFormData] = useState<Partial<TableRow>>({});
  
//   const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

//   const [showFilters, setShowFilters] = useState(false);
//   const [filters, setFilters] = useState({
//     funding_body_id: "",
//     amortization_schedule: "",
//     track_type: "",
//     mortgage_type: "",
//     min_age_required: "",
//     min_spread_required: "",
//     restricted: "all",
//     complex: "all",
//   });

//   const [isAddingBody, setIsAddingBody] = useState(false);
//   const [newBodyName, setNewBodyName] = useState("");

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     setLoading(true);
//     const { data: bodiesData } = await supabase.from("hacamm_funding_bodies").select("*").order("name");
//     const { data: tracksData } = await supabase.from("hacamm_funding_tracks").select("*");

//     const fetchedBodies = (bodiesData as FundingBody[]) || [];
//     const tracks = (tracksData as FundingTrack[]) || [];

//     setBodies(fetchedBodies);

//     const tableData: TableRow[] = [];

//     fetchedBodies.forEach((body) => {
//       const bodyTracks = tracks.filter((t) => t.funding_body_id === body.id);
//       if (bodyTracks.length === 0) {
//         tableData.push({ ui_id: `empty-${body.id}`, funding_body_id: body.id, body_name: body.name, is_new: true });
//       } else {
//         bodyTracks.forEach((track) => {
//           tableData.push({ ...track, ui_id: track.id, body_name: body.name, is_new: false });
//         });
//       }
//     });
//     setRows(tableData);
//     setLoading(false);
//   };

//   const handleAddBody = async () => {
//     if (!newBodyName.trim()) return;
//     setLoading(true);
//     const { error } = await supabase
//       .from("hacamm_funding_bodies")
//       .insert([{ name: newBodyName.trim() }]);
    
//     if (error) {
//       alert("שגיאה בהוספת גוף מימון: " + error.message);
//       setLoading(false);
//     } else {
//       setNewBodyName("");
//       setIsAddingBody(false);
//       fetchData();
//     }
//   };

//   const handleEdit = (row: TableRow) => {
//     setEditingRowId(row.ui_id);
//     setEditFormData({ ...row });
//   };

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
//     const target = e.target as HTMLInputElement;
//     const { name, value, type } = target;
//     if (type === "checkbox") {
//       setEditFormData((prev) => ({ ...prev, [name]: target.checked }));
//     } else {
//       setEditFormData((prev) => ({ ...prev, [name]: value === "" ? null : value }));
//     }
//   };

//   const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFilters(prev => ({ ...prev, [name]: value }));
//   };

//   const clearFilters = () => {
//     setFilters({ funding_body_id: "", amortization_schedule: "", track_type: "", mortgage_type: "", min_age_required: "", min_spread_required: "", restricted: "all", complex: "all" });
//   };

//   const handleAddNewTrackToBody = (body_id: string, body_name: string) => {
//     const newUiId = `new-${Date.now()}`;
//     const newRow: TableRow = { ui_id: newUiId, funding_body_id: body_id, body_name: body_name, is_new: true };
//     setRows((prev) => {
//       const lastIndex = prev.map(r => r.funding_body_id).lastIndexOf(body_id);
//       const newRows = [...prev];
//       newRows.splice(lastIndex + 1, 0, newRow);
//       return newRows;
//     });
//     setEditingRowId(newUiId);
//     setEditFormData(newRow);
//     clearFilters(); 
//   };

//   const handleCancel = (ui_id: string, is_new?: boolean) => {
//     setEditingRowId(null);
//     setEditFormData({});
//     if (is_new && ui_id.startsWith("new-")) {
//       setRows((prev) => prev.filter((r) => r.ui_id !== ui_id));
//     }
//   };

//   const handleSave = async () => {
//     const { ui_id, is_new, body_name, id, ...dataToSave } = editFormData;
//     const payload = {
//       ...dataToSave,
//       min_interest_all_purpose_percent: dataToSave.min_interest_all_purpose_percent ? Number(dataToSave.min_interest_all_purpose_percent) : null,
//       max_spread_years: dataToSave.max_spread_years ? Number(dataToSave.max_spread_years) : null,
//       max_age: dataToSave.max_age ? Number(dataToSave.max_age) : null,
//       file_opening_fee_nis: dataToSave.file_opening_fee_nis ? Number(dataToSave.file_opening_fee_nis) : null,
//       file_opening_fee_percent: dataToSave.file_opening_fee_percent ? Number(dataToSave.file_opening_fee_percent) : null,
//       max_financing_percent: dataToSave.max_financing_percent ? Number(dataToSave.max_financing_percent) : null,
//       restricted_customers: !!dataToSave.restricted_customers,
//       complex_customers: !!dataToSave.complex_customers,
//     };

//     if (is_new) {
//       const { error } = await supabase.from("hacamm_funding_tracks").insert([payload]);
//       if (error) alert("שגיאה ביצירת המסלול: " + error.message);
//     } else {
//       const { error } = await supabase.from("hacamm_funding_tracks").update(payload).eq("id", id!);
//       if (error) alert("שגיאה בעדכון המסלול: " + error.message);
//     }

//     setEditingRowId(null);
//     setEditFormData({});
//     fetchData();
//   };

//   const handleDelete = async (row: TableRow) => {
//     if (row.is_new) return; 
//     if (!confirm("האם אתה בטוח שברצונך למחוק מסלול זה?")) return;
//     const { error } = await supabase.from("hacamm_funding_tracks").delete().eq("id", row.id!);
//     if (error) alert("שגיאה במחיקה: " + error.message);
//     else fetchData();
//   };

//   const filteredRows = rows.filter(row => {
//     if (row.is_new && row.ui_id.startsWith("new-")) return true;
//     const isFilterActive = Object.values(filters).some(val => val !== "" && val !== "all");
//     if (isFilterActive && row.ui_id.startsWith("empty-")) return false;

//     if (filters.funding_body_id && row.funding_body_id !== filters.funding_body_id) return false;
//     if (filters.amortization_schedule && row.amortization_schedule !== filters.amortization_schedule) return false;
//     if (filters.track_type && row.track_type !== filters.track_type) return false;
//     if (filters.mortgage_type && row.mortgage_type !== filters.mortgage_type) return false;
    
//     if (filters.min_age_required && (row.max_age === null || row.max_age === undefined || row.max_age < Number(filters.min_age_required))) return false;
//     if (filters.min_spread_required && (row.max_spread_years === null || row.max_spread_years === undefined || row.max_spread_years < Number(filters.min_spread_required))) return false;

//     if (filters.restricted !== "all") {
//       const wantsRestricted = filters.restricted === "yes";
//       if (!!row.restricted_customers !== wantsRestricted) return false;
//     }
//     if (filters.complex !== "all") {
//       const wantsComplex = filters.complex === "yes";
//       if (!!row.complex_customers !== wantsComplex) return false;
//     }

//     return true;
//   });

//   const exportToExcel = () => {
//     const dataToExport = filteredRows
//       .filter((row) => !row.is_new)
//       .map((row) => {
//         const isEmptyPlaceholder = row.ui_id.startsWith("empty-");
//         return {
//           "גוף מימון": row.body_name || "",
//           "לוח סילוקין": row.amortization_schedule || "",
//           "ריביות לכל מטרה מינימום (%)": row.min_interest_all_purpose_percent || "",
//           "מסלול": row.track_type || "",
//           "אחוז מימון מקסימלי (%)": row.max_financing_percent || "",
//           "סוג משכנתא": row.mortgage_type || "",
//           "גיל מקס'": row.max_age || "",
//           "פריסה מקסימלית בשנים": row.max_spread_years || "",
//           "לקוחות מוגבלים": isEmptyPlaceholder ? "" : (row.restricted_customers ? "כן" : "לא"),
//           "לקוחות מורכבים": isEmptyPlaceholder ? "" : (row.complex_customers ? "כן" : "לא"),
//           "פתיחת תיק (₪)": row.file_opening_fee_nis || "",
//           "פתיחת תיק (%)": row.file_opening_fee_percent || "",
//           "שיטת רישום": row.registration_method || "",
//           "תוספות": row.additions || "",
//           "הערות": row.notes || "",
//         };
//       });

//     const worksheet = XLSX.utils.json_to_sheet(dataToExport);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "מסלולי מימון");

//     if (!worksheet["!views"]) worksheet["!views"] = [];
//     worksheet["!views"].push({ rightToLeft: true });

//     XLSX.writeFile(workbook, "מסלולי_מימון.xlsx");
//   };

//   const ExpandableTextarea = ({ name, value, isEditing, onChange }: any) => (
//     <div className="relative w-full h-[26px] group/textarea hover:z-[100] focus-within:z-[100]">
//       <textarea
//         name={name} value={value || ""} onChange={isEditing ? onChange : undefined} readOnly={!isEditing} placeholder={isEditing ? "הקלד..." : ""}
//         className={`absolute top-0 right-0 w-full min-w-0 h-[26px] p-1 text-[11px] text-right border rounded outline-none transition-all duration-200 resize-none overflow-hidden whitespace-pre-wrap leading-relaxed
//           group-hover/textarea:w-[200px] group-hover/textarea:h-[120px] group-hover/textarea:z-[100] group-hover/textarea:shadow-2xl group-hover/textarea:overflow-y-auto
//           focus:w-[200px] focus:h-[120px] focus:z-[100] focus:shadow-2xl focus:overflow-y-auto focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400
//           ${isEditing 
//             ? "border-blue-400 bg-white shadow-inner" 
//             : "border-transparent bg-transparent text-gray-800 cursor-text group-hover/textarea:bg-white group-hover/textarea:border-gray-300"
//           }`}
//       />
//     </div>
//   );

//   const CustomCheckbox = ({ checked, onChange, readOnly = false, name = "" }: { checked: boolean, onChange?: any, readOnly?: boolean, name?: string }) => (
//     <div className="flex justify-center items-center w-full min-w-0">
//       <label className={`relative flex items-center justify-center ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
//         <input 
//           type="checkbox" name={name} checked={checked} onChange={readOnly ? undefined : onChange} disabled={readOnly}
//           className={`peer appearance-none w-4 h-4 md:w-5 md:h-5 border-2 rounded-sm transition-colors focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:bg-orange-50 ${checked ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} ${!readOnly && 'hover:border-red-400 focus:outline-none'}`}
//         />
//         <svg className={`absolute w-3 h-3 md:w-3.5 md:h-3.5 text-red-500 pointer-events-none transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
//           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
//         </svg>
//       </label>
//     </div>
//   );

//   const tdBaseClasses = "border transition-colors duration-150 align-middle";

//   return (
//     <div className="min-h-screen bg-gray-50 p-2 md:p-4 font-sans text-gray-800" dir="rtl">
//       <div className="w-full mx-auto bg-white rounded-xl shadow-sm border border-gray-300 flex flex-col h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] overflow-hidden">
        
//         <div className="p-3 bg-gray-100 border-b border-gray-300 flex flex-wrap justify-between items-center shrink-0 gap-2">
//           <div className="flex flex-wrap items-center gap-2 md:gap-3">
//             <h2 className="text-xl md:text-2xl font-bold text-gray-800 ml-2 md:ml-4">גופי מימון</h2>
            
//             <button 
//               onClick={() => setShowFilters(!showFilters)} 
//               className={`px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-1 md:gap-2 border ${showFilters ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
//             >
//               <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
//               סינון מתקדם
//             </button>

//             {showFilters && (
//               <button 
//                 onClick={clearFilters} 
//                 className="px-2 md:px-3 py-1.5 bg-gray-200 hover:bg-gray-300 focus:bg-gray-300 focus:ring-2 focus:ring-orange-400 text-gray-700 font-medium rounded-lg text-xs md:text-sm transition-colors outline-none shadow-sm"
//               >
//                 נקה סינון
//               </button>
//             )}

//             <button 
//               onClick={exportToExcel}
//               className="px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-1 md:gap-2 border bg-white text-green-700 border-green-200 hover:bg-green-50 focus:ring-2 focus:ring-green-400 outline-none shadow-sm"
//             >
//               <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M2.85858 2.87756L15.4293 1.08175C15.7027 1.04269 15.9559 1.23265 15.995 1.50601C15.9983 1.52943 16 1.55306 16 1.57672V22.4237C16 22.6998 15.7761 22.9237 15.5 22.9237C15.4763 22.9237 15.4527 22.922 15.4293 22.9187L2.85858 21.1229C2.36593 21.0525 2 20.6306 2 20.1329V3.86754C2 3.36986 2.36593 2.94794 2.85858 2.87756ZM17 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H17V3ZM11.7604 15.5135L8.91883 11.5L11.7346 7.64332L9.84507 7.64332L8.03158 10.3807L6.21639 7.64332L4.36981 7.64332L7.14327 11.5L4.25816 15.5135L6.15579 15.5135L8.03531 12.6397L9.90799 15.5135L11.7604 15.5135Z"></path>
//               </svg>
//               ייצוא לאקסל
//             </button>

//             <div className="border-r border-gray-300 pr-2 md:pr-3 flex items-center gap-1 md:gap-2">
//               {isAddingBody ? (
//                 <div className="flex items-center gap-1 md:gap-2 animate-fade-in">
//                   <input 
//                     type="text" 
//                     value={newBodyName} 
//                     onChange={(e) => setNewBodyName(e.target.value)} 
//                     placeholder="הזן שם גוף מימון..." 
//                     className="border border-blue-400 rounded px-2 py-1.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500 w-32 md:w-48 shadow-inner"
//                     autoFocus
//                     onKeyDown={(e) => e.key === 'Enter' && handleAddBody()}
//                   />
//                   <button onClick={handleAddBody} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs md:text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-blue-400">שמור</button>
//                   <button onClick={() => { setIsAddingBody(false); setNewBodyName(""); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs md:text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-gray-400">ביטול</button>
//                 </div>
//               ) : (
//                 <button 
//                   onClick={() => setIsAddingBody(true)}
//                   className="px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-1 md:gap-2 border bg-white text-blue-700 border-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
//                 >
//                   <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
//                   הוסף גוף מימון
//                 </button>
//               )}
//             </div>
            
//           </div>
//           {loading && <span className="text-xs md:text-sm text-gray-500">טוען...</span>}
//         </div>

//         <div className="overflow-auto flex-1 relative">
//           <table className="w-full table-fixed text-center border-collapse">
            
//             <colgroup>
//               <col className="w-[8%]" />  
//               <col className="w-[8%]" />  
//               <col className="w-[5%]" />  
//               <col className="w-[6%]" />  
//               <col className="w-[5%]" />  
//               <col className="w-[7%]" />  
//               <col className="w-[4%]" />  
//               <col className="w-[4%]" />  
//               <col className="w-[4%]" />  
//               <col className="w-[4%]" />  
//               <col className="w-[5%]" />  
//               <col className="w-[4%]" />  
//               <col className="w-[6%]" />  
//               <col className="w-[12%]" /> 
//               <col className="w-[12%]" /> 
//               <col className="w-[6%]" />  
//             </colgroup>

//             <thead className="text-gray-700 sticky top-0 z-20 shadow-sm bg-gray-100">
              
//               {showFilters && (
//                 <tr className="bg-blue-50/50">
//                   <th className="p-0.5 border border-gray-300 align-middle"><select name="funding_body_id" value={filters.funding_body_id} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{bodies.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></th>
//                   <th className="p-0.5 border border-gray-300 align-middle"><select name="amortization_schedule" value={filters.amortization_schedule} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{AMORTIZATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
//                   <th className="p-0.5 border border-gray-300"></th>
//                   <th className="p-0.5 border border-gray-300 align-middle"><select name="track_type" value={filters.track_type} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{TRACK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
//                   <th className="p-0.5 border border-gray-300"></th>
//                   <th className="p-0.5 border border-gray-300 align-middle"><select name="mortgage_type" value={filters.mortgage_type} onChange={handleFilterChange} className={filterInputStyle}><option value="">הכל</option>{MORTGAGE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></th>
//                   <th className="p-0.5 border border-gray-300 align-middle"><input type="number" name="min_age_required" value={filters.min_age_required} onChange={handleFilterChange} placeholder="לפחות..." className={filterInputStyle} /></th>
//                   <th className="p-0.5 border border-gray-300 align-middle"><input type="number" name="min_spread_required" value={filters.min_spread_required} onChange={handleFilterChange} placeholder="לפחות..." className={filterInputStyle} /></th>
//                   <th className="p-0.5 border border-gray-300 align-middle"><select name="restricted" value={filters.restricted} onChange={handleFilterChange} className={filterInputStyle}><option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option></select></th>
//                   <th className="p-0.5 border border-gray-300 align-middle"><select name="complex" value={filters.complex} onChange={handleFilterChange} className={filterInputStyle}><option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option></select></th>
//                   <th className="p-0.5 border border-gray-300"></th>
//                   <th className="p-0.5 border border-gray-300"></th>
//                   <th className="p-0.5 border border-gray-300"></th>
//                   <th className="p-0.5 border border-gray-300"></th>
//                   <th className="p-0.5 border border-gray-300"></th>
//                   <th className="p-0.5 border border-gray-300 sticky left-0 bg-blue-50 z-30 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] align-middle"></th>
//                 </tr>
//               )}

//               <tr>
//                 <th className="p-1 border border-gray-300 font-bold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-800">גוף מימון</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">לוח סילוקין</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">ריביות מינימום</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">מסלול</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">אחוז מימון</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">סוג משכנתא</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">גיל מקס'</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">פריסה בשנים</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[10px] text-gray-700">לקוחות מוגבלים</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[10px] text-gray-700">לקוחות מורכבים</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">תיק ₪</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">תיק %</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">שיטת רישום</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">תוספות</th>
//                 <th className="p-1 border border-gray-300 font-semibold leading-tight align-middle break-words whitespace-normal text-[11px] text-gray-700">הערות</th>
//                 <th className="p-1 border border-gray-300 bg-gray-200 font-semibold leading-tight align-middle sticky left-0 z-30 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] text-[11px] text-gray-800">פעולות</th>
//               </tr>
//             </thead>
            
//             <tbody>
//               {filteredRows.map((row, idx) => {
//                 const isEditing = editingRowId === row.ui_id;
//                 const isFocused = focusedRowId === row.ui_id;
//                 const isActiveRow = isFocused || isEditing;
//                 const isHoverEnabled = focusedRowId === null;
//                 const rowNeedsGroup = isActiveRow || isHoverEnabled;
                
//                 const isDiffFromPrev = idx > 0 && filteredRows[idx - 1].funding_body_id !== row.funding_body_id;

//                 const tdClasses = `${tdBaseClasses} ${
//                   isActiveRow ? 'border-orange-400' : isHoverEnabled ? 'border-gray-200 group-hover:border-orange-400' : 'border-gray-200'
//                 }`;

//                 const firstTdBg = isActiveRow ? 'bg-orange-50' : isHoverEnabled ? 'bg-gray-50/50 group-hover:bg-orange-50' : 'bg-gray-50/50';
//                 const actionsBg = isActiveRow ? 'bg-orange-50' : isHoverEnabled ? 'bg-white group-hover:bg-orange-50' : 'bg-white';

//                 return (
//                   <tr 
//                     key={row.ui_id} 
//                     onFocusCapture={() => setFocusedRowId(row.ui_id)}
//                     onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusedRowId(null); }}
//                     className={`relative transition-colors ${rowNeedsGroup ? 'group' : ''} ${isActiveRow ? 'bg-orange-50/50 z-10' : ''} ${isHoverEnabled ? 'hover:bg-orange-50/50 hover:z-10' : ''} ${isDiffFromPrev ? 'border-t-[3px] border-t-gray-300' : 'border-t border-t-gray-200'}`}
//                   >
//                     <td className={`p-0.5 md:p-1 font-bold text-blue-900 text-right ${firstTdBg} ${tdClasses}`}>
//                       <div className="flex flex-col items-start gap-1 pr-1 w-full overflow-hidden">
//                         <span className="text-[11px] md:text-sm truncate w-full" title={row.body_name}>{row.body_name}</span>
//                         {!isEditing && (
//                           <button onClick={() => handleAddNewTrackToBody(row.funding_body_id, row.body_name)} className="text-[9px] md:text-[10px] text-blue-600 hover:text-blue-800 focus:ring-1 focus:ring-orange-400 font-medium bg-white border border-blue-100 rounded px-1 py-0.5 whitespace-nowrap outline-none">
//                             + מסלול
//                           </button>
//                         )}
//                       </div>
//                     </td>

//                     {isEditing ? (
//                       <>
//                         <td className={`p-0.5 ${tdClasses}`}><select name="amortization_schedule" value={editFormData.amortization_schedule || ""} onChange={handleChange} className={editInputStyle}><option value=""></option>{AMORTIZATION_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input type="number" step="0.01" name="min_interest_all_purpose_percent" value={editFormData.min_interest_all_purpose_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><select name="track_type" value={editFormData.track_type || ""} onChange={handleChange} className={editInputStyle}><option value=""></option>{TRACK_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input type="number" step="0.01" name="max_financing_percent" value={editFormData.max_financing_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><select name="mortgage_type" value={editFormData.mortgage_type || ""} onChange={handleChange} className={getMortgageTypeEditStyle(editFormData.mortgage_type)}><option value=""></option>{MORTGAGE_TYPE_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input type="number" name="max_age" value={editFormData.max_age || ""} onChange={handleChange} className={editInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input type="number" name="max_spread_years" value={editFormData.max_spread_years || ""} onChange={handleChange} className={editInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox name="restricted_customers" checked={!!editFormData.restricted_customers} onChange={handleChange} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox name="complex_customers" checked={!!editFormData.complex_customers} onChange={handleChange} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input type="number" name="file_opening_fee_nis" value={editFormData.file_opening_fee_nis || ""} onChange={handleChange} className={editInputStyle} placeholder="₪" /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input type="number" step="0.01" name="file_opening_fee_percent" value={editFormData.file_opening_fee_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input type="text" name="registration_method" value={editFormData.registration_method || ""} onChange={handleChange} className={editInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><ExpandableTextarea name="additions" value={editFormData.additions} isEditing={true} onChange={handleChange} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><ExpandableTextarea name="notes" value={editFormData.notes} isEditing={true} onChange={handleChange} /></td>
                        
//                         <td className={`p-1 text-center sticky left-0 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] z-10 ${actionsBg} ${tdClasses}`}>
//                           <div className="flex flex-col gap-1 justify-center items-center h-full">
//                             <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-orange-400 text-white px-1.5 py-1 rounded transition text-[10px] md:text-[11px] font-medium w-full outline-none">שמור</button>
//                             <button onClick={() => handleCancel(row.ui_id, row.is_new)} className="bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-orange-400 text-gray-700 px-1.5 py-1 rounded transition text-[10px] md:text-[11px] font-medium w-full outline-none">בטל</button>
//                           </div>
//                         </td>
//                       </>
//                     ) : (
//                       <>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.amortization_schedule || ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.min_interest_all_purpose_percent ? `${row.min_interest_all_purpose_percent}%` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.track_type || ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.max_financing_percent ? `${row.max_financing_percent}%` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.mortgage_type || ""} className={getMortgageTypeViewStyle(row.mortgage_type)} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.max_age || ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.max_spread_years || ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox checked={!!row.restricted_customers} readOnly={true} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><CustomCheckbox checked={!!row.complex_customers} readOnly={true} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.file_opening_fee_nis ? `₪${row.file_opening_fee_nis}` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.file_opening_fee_percent ? `${row.file_opening_fee_percent}%` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><input readOnly value={row.registration_method || ""} className={viewInputStyle} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><ExpandableTextarea name="additions" value={row.additions} isEditing={false} /></td>
//                         <td className={`p-0.5 ${tdClasses}`}><ExpandableTextarea name="notes" value={row.notes} isEditing={false} /></td>
                        
//                         <td className={`p-1 text-center sticky left-0 backdrop-blur-sm shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] z-10 ${actionsBg} ${tdClasses}`}>
//                           <div className="flex flex-col gap-1 justify-center items-center h-full">
//                             <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 bg-blue-50 focus:bg-orange-100 focus:ring-1 focus:ring-orange-400 px-1.5 py-1 rounded transition text-[10px] md:text-[11px] font-medium border border-blue-100 w-full outline-none">
//                               {row.is_new ? "הוסף" : "ערוך"}
//                             </button>
//                             {!row.is_new && (
//                               <button onClick={() => handleDelete(row)} className="text-red-600 hover:text-red-800 bg-red-50 focus:bg-orange-100 focus:ring-1 focus:ring-orange-400 px-1.5 py-1 rounded transition text-[10px] md:text-[11px] font-medium border border-red-100 w-full outline-none">מחק</button>
//                             )}
//                           </div>
//                         </td>
//                       </>
//                     )}
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
          
//           {filteredRows.length === 0 && !loading && (
//             <div className="text-center p-8 text-gray-500 bg-white">לא נמצאו מסלולים התואמים לסינון</div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
























// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@supabase/supabase-js";
// import * as XLSX from "xlsx"; 

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

// type FundingBody = { id: string; name: string };
// type FundingTrack = {
//   id: string;
//   funding_body_id: string;
//   amortization_schedule: string | null;
//   min_interest_all_purpose_percent: number | null;
//   track_type: string | null;
//   max_spread_years: number | null;
//   max_age: number | null;
//   file_opening_fee_nis: number | null;
//   file_opening_fee_percent: number | null;
//   max_financing_percent: number | null;
//   notes: string | null;
//   mortgage_type: string | null;
//   registration_method: string | null;
//   additions: string | null;
//   restricted_customers: boolean;
//   complex_customers: boolean;
// };

// type TableRow = Partial<FundingTrack> & {
//   ui_id: string; 
//   funding_body_id: string;
//   body_name: string;
//   is_new?: boolean; 
// };

// const AMORTIZATION_OPTIONS = ["שפיצר", "בלון חלקי", "בלון מלא", "קרן שווה", "כפי יכולתך"];
// const TRACK_OPTIONS = ["ק\"צ", "קל\"צ", "פריים", "מ\"צ", "מל\"צ"];
// const MORTGAGE_TYPE_OPTIONS = ["דרגה ראשונה", "דרגה שניה", "הלוואת סולו"];

// const viewInputStyle = "w-full p-1 border border-transparent rounded text-xs text-center bg-transparent text-gray-800 outline-none cursor-default focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors";
// const editInputStyle = "w-full p-1 border border-blue-400 rounded text-xs text-center outline-none bg-white shadow-inner focus:bg-orange-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400 transition-colors";
// const filterInputStyle = "w-full p-1 border border-gray-300 rounded text-[11px] bg-white outline-none text-gray-700 focus:bg-orange-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors";

// // התיקון כאן: הוספת undefined ל-val
// const getMortgageTypeViewStyle = (val: string | null | undefined) => 
//   val === "דרגה שניה" 
//     ? "w-full p-1 border border-blue-600 rounded text-xs text-center bg-blue-600 text-white font-medium outline-none cursor-default transition-colors" 
//     : viewInputStyle;

// const getMortgageTypeEditStyle = (val: string | null | undefined) => 
//   val === "דרגה שניה" 
//     ? "w-full p-1 border border-blue-600 rounded text-xs text-center bg-blue-600 text-white font-medium outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-colors" 
//     : editInputStyle;

// export default function SpreadsheetPage() {
//   const [rows, setRows] = useState<TableRow[]>([]);
//   const [bodies, setBodies] = useState<FundingBody[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [editingRowId, setEditingRowId] = useState<string | null>(null);
//   const [editFormData, setEditFormData] = useState<Partial<TableRow>>({});
  
//   const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

//   const [showFilters, setShowFilters] = useState(false);
//   const [filters, setFilters] = useState({
//     funding_body_id: "",
//     amortization_schedule: "",
//     track_type: "",
//     mortgage_type: "",
//     min_age_required: "",
//     min_spread_required: "",
//     restricted: "all",
//     complex: "all",
//   });

//   const [isAddingBody, setIsAddingBody] = useState(false);
//   const [newBodyName, setNewBodyName] = useState("");

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     setLoading(true);
//     const { data: bodiesData } = await supabase.from("hacamm_funding_bodies").select("*").order("name");
//     const { data: tracksData } = await supabase.from("hacamm_funding_tracks").select("*");

//     const fetchedBodies = (bodiesData as FundingBody[]) || [];
//     const tracks = (tracksData as FundingTrack[]) || [];

//     setBodies(fetchedBodies);

//     const tableData: TableRow[] = [];

//     fetchedBodies.forEach((body) => {
//       const bodyTracks = tracks.filter((t) => t.funding_body_id === body.id);
//       if (bodyTracks.length === 0) {
//         tableData.push({ ui_id: `empty-${body.id}`, funding_body_id: body.id, body_name: body.name, is_new: true });
//       } else {
//         bodyTracks.forEach((track) => {
//           tableData.push({ ...track, ui_id: track.id, body_name: body.name, is_new: false });
//         });
//       }
//     });
//     setRows(tableData);
//     setLoading(false);
//   };

//   const handleAddBody = async () => {
//     if (!newBodyName.trim()) return;
//     setLoading(true);
//     const { error } = await supabase
//       .from("hacamm_funding_bodies")
//       .insert([{ name: newBodyName.trim() }]);
    
//     if (error) {
//       alert("שגיאה בהוספת גוף מימון: " + error.message);
//       setLoading(false);
//     } else {
//       setNewBodyName("");
//       setIsAddingBody(false);
//       fetchData();
//     }
//   };

//   const handleEdit = (row: TableRow) => {
//     setEditingRowId(row.ui_id);
//     setEditFormData({ ...row });
//   };

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
//     const target = e.target as HTMLInputElement;
//     const { name, value, type } = target;
//     if (type === "checkbox") {
//       setEditFormData((prev) => ({ ...prev, [name]: target.checked }));
//     } else {
//       setEditFormData((prev) => ({ ...prev, [name]: value === "" ? null : value }));
//     }
//   };

//   const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFilters(prev => ({ ...prev, [name]: value }));
//   };

//   const clearFilters = () => {
//     setFilters({ funding_body_id: "", amortization_schedule: "", track_type: "", mortgage_type: "", min_age_required: "", min_spread_required: "", restricted: "all", complex: "all" });
//   };

//   const handleAddNewTrackToBody = (body_id: string, body_name: string) => {
//     const newUiId = `new-${Date.now()}`;
//     const newRow: TableRow = { ui_id: newUiId, funding_body_id: body_id, body_name: body_name, is_new: true };
//     setRows((prev) => {
//       const lastIndex = prev.map(r => r.funding_body_id).lastIndexOf(body_id);
//       const newRows = [...prev];
//       newRows.splice(lastIndex + 1, 0, newRow);
//       return newRows;
//     });
//     setEditingRowId(newUiId);
//     setEditFormData(newRow);
//     clearFilters(); 
//   };

//   const handleCancel = (ui_id: string, is_new?: boolean) => {
//     setEditingRowId(null);
//     setEditFormData({});
//     if (is_new && ui_id.startsWith("new-")) {
//       setRows((prev) => prev.filter((r) => r.ui_id !== ui_id));
//     }
//   };

//   const handleSave = async () => {
//     const { ui_id, is_new, body_name, id, ...dataToSave } = editFormData;
//     const payload = {
//       ...dataToSave,
//       min_interest_all_purpose_percent: dataToSave.min_interest_all_purpose_percent ? Number(dataToSave.min_interest_all_purpose_percent) : null,
//       max_spread_years: dataToSave.max_spread_years ? Number(dataToSave.max_spread_years) : null,
//       max_age: dataToSave.max_age ? Number(dataToSave.max_age) : null,
//       file_opening_fee_nis: dataToSave.file_opening_fee_nis ? Number(dataToSave.file_opening_fee_nis) : null,
//       file_opening_fee_percent: dataToSave.file_opening_fee_percent ? Number(dataToSave.file_opening_fee_percent) : null,
//       max_financing_percent: dataToSave.max_financing_percent ? Number(dataToSave.max_financing_percent) : null,
//       restricted_customers: !!dataToSave.restricted_customers,
//       complex_customers: !!dataToSave.complex_customers,
//     };

//     if (is_new) {
//       const { error } = await supabase.from("hacamm_funding_tracks").insert([payload]);
//       if (error) alert("שגיאה ביצירת המסלול: " + error.message);
//     } else {
//       const { error } = await supabase.from("hacamm_funding_tracks").update(payload).eq("id", id!);
//       if (error) alert("שגיאה בעדכון המסלול: " + error.message);
//     }

//     setEditingRowId(null);
//     setEditFormData({});
//     fetchData();
//   };

//   const handleDelete = async (row: TableRow) => {
//     if (row.is_new) return; 
//     if (!confirm("האם אתה בטוח שברצונך למחוק מסלול זה?")) return;
//     const { error } = await supabase.from("hacamm_funding_tracks").delete().eq("id", row.id!);
//     if (error) alert("שגיאה במחיקה: " + error.message);
//     else fetchData();
//   };

//   const filteredRows = rows.filter(row => {
//     if (row.is_new && row.ui_id.startsWith("new-")) return true;
//     const isFilterActive = Object.values(filters).some(val => val !== "" && val !== "all");
//     if (isFilterActive && row.ui_id.startsWith("empty-")) return false;

//     if (filters.funding_body_id && row.funding_body_id !== filters.funding_body_id) return false;
//     if (filters.amortization_schedule && row.amortization_schedule !== filters.amortization_schedule) return false;
//     if (filters.track_type && row.track_type !== filters.track_type) return false;
//     if (filters.mortgage_type && row.mortgage_type !== filters.mortgage_type) return false;
    
//     if (filters.min_age_required && (row.max_age === null || row.max_age === undefined || row.max_age < Number(filters.min_age_required))) return false;
//     if (filters.min_spread_required && (row.max_spread_years === null || row.max_spread_years === undefined || row.max_spread_years < Number(filters.min_spread_required))) return false;

//     if (filters.restricted !== "all") {
//       const wantsRestricted = filters.restricted === "yes";
//       if (!!row.restricted_customers !== wantsRestricted) return false;
//     }
//     if (filters.complex !== "all") {
//       const wantsComplex = filters.complex === "yes";
//       if (!!row.complex_customers !== wantsComplex) return false;
//     }

//     return true;
//   });

//   const exportToExcel = () => {
//     const dataToExport = filteredRows
//       .filter((row) => !row.is_new)
//       .map((row) => {
//         const isEmptyPlaceholder = row.ui_id.startsWith("empty-");
//         return {
//           "גוף מימון": row.body_name || "",
//           "לוח סילוקין": row.amortization_schedule || "",
//           "ריביות לכל מטרה מינימום (%)": row.min_interest_all_purpose_percent || "",
//           "מסלול": row.track_type || "",
//           "אחוז מימון מקסימלי (%)": row.max_financing_percent || "",
//           "סוג משכנתא": row.mortgage_type || "",
//           "גיל מקס'": row.max_age || "",
//           "פריסה מקסימלית בשנים": row.max_spread_years || "",
//           "לקוחות מוגבלים": isEmptyPlaceholder ? "" : (row.restricted_customers ? "כן" : "לא"),
//           "לקוחות מורכבים": isEmptyPlaceholder ? "" : (row.complex_customers ? "כן" : "לא"),
//           "פתיחת תיק (₪)": row.file_opening_fee_nis || "",
//           "פתיחת תיק (%)": row.file_opening_fee_percent || "",
//           "שיטת רישום": row.registration_method || "",
//           "תוספות": row.additions || "",
//           "הערות": row.notes || "",
//         };
//       });

//     const worksheet = XLSX.utils.json_to_sheet(dataToExport);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "מסלולי מימון");

//     if (!worksheet["!views"]) worksheet["!views"] = [];
//     worksheet["!views"].push({ rightToLeft: true });

//     XLSX.writeFile(workbook, "מסלולי_מימון.xlsx");
//   };

//   const ExpandableTextarea = ({ name, value, isEditing, onChange }: any) => (
//     <div className="relative w-full h-[26px] group/textarea hover:z-[100] focus-within:z-[100]">
//       <textarea
//         name={name} value={value || ""} onChange={isEditing ? onChange : undefined} readOnly={!isEditing} placeholder={isEditing ? "הקלד..." : ""}
//         className={`absolute top-0 left-0 w-full h-[26px] p-1 text-xs text-right border rounded outline-none transition-all duration-200 resize-none overflow-hidden whitespace-pre-wrap leading-relaxed
//           group-hover/textarea:w-[250px] group-hover/textarea:h-[120px] group-hover/textarea:z-[100] group-hover/textarea:shadow-2xl group-hover/textarea:overflow-y-auto
//           focus:w-[250px] focus:h-[120px] focus:z-[100] focus:shadow-2xl focus:overflow-y-auto focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-400
//           ${isEditing 
//             ? "border-blue-400 bg-white shadow-inner" 
//             : "border-transparent bg-transparent text-gray-800 cursor-text group-hover/textarea:bg-white group-hover/textarea:border-gray-300"
//           }`}
//       />
//     </div>
//   );

//   const CustomCheckbox = ({ checked, onChange, readOnly = false, name = "" }: { checked: boolean, onChange?: any, readOnly?: boolean, name?: string }) => (
//     <div className="flex justify-center items-center w-full">
//       <label className={`relative flex items-center justify-center ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
//         <input 
//           type="checkbox" name={name} checked={checked} onChange={readOnly ? undefined : onChange} disabled={readOnly}
//           className={`peer appearance-none w-5 h-5 border-2 rounded-sm transition-colors focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:bg-orange-50 ${checked ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} ${!readOnly && 'hover:border-red-400 focus:outline-none'}`}
//         />
//         <svg className={`absolute w-3.5 h-3.5 text-red-500 pointer-events-none transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
//           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
//         </svg>
//       </label>
//     </div>
//   );

//   const tdBaseClasses = "border transition-colors duration-150";

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-800" dir="rtl">
//       <div className="w-full mx-auto bg-white rounded-xl shadow-sm border border-gray-300 flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
        
//         <div className="p-3 bg-gray-100 border-b border-gray-300 flex justify-between items-center shrink-0">
//           <div className="flex items-center gap-3">
//             <h2 className="text-2xl font-bold text-gray-800 ml-4">גופי מימון</h2>
            
//             <button 
//               onClick={() => setShowFilters(!showFilters)} 
//               className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${showFilters ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
//             >
//               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
//               סינון מתקדם
//             </button>

//             {showFilters && (
//               <button 
//                 onClick={clearFilters} 
//                 className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 focus:bg-gray-300 focus:ring-2 focus:ring-orange-400 text-gray-700 font-medium rounded-lg text-sm transition-colors outline-none shadow-sm"
//               >
//                 נקה סינון
//               </button>
//             )}

//             <button 
//               onClick={exportToExcel}
//               className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border bg-white text-green-700 border-green-200 hover:bg-green-50 focus:ring-2 focus:ring-green-400 outline-none shadow-sm"
//             >
//               <svg className="w-4 h-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M2.85858 2.87756L15.4293 1.08175C15.7027 1.04269 15.9559 1.23265 15.995 1.50601C15.9983 1.52943 16 1.55306 16 1.57672V22.4237C16 22.6998 15.7761 22.9237 15.5 22.9237C15.4763 22.9237 15.4527 22.922 15.4293 22.9187L2.85858 21.1229C2.36593 21.0525 2 20.6306 2 20.1329V3.86754C2 3.36986 2.36593 2.94794 2.85858 2.87756ZM17 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H17V3ZM11.7604 15.5135L8.91883 11.5L11.7346 7.64332L9.84507 7.64332L8.03158 10.3807L6.21639 7.64332L4.36981 7.64332L7.14327 11.5L4.25816 15.5135L6.15579 15.5135L8.03531 12.6397L9.90799 15.5135L11.7604 15.5135Z"></path>
//               </svg>
//               ייצוא לאקסל
//             </button>

//             <div className="border-r border-gray-300 pr-3 flex items-center gap-2">
//               {isAddingBody ? (
//                 <div className="flex items-center gap-2 animate-fade-in">
//                   <input 
//                     type="text" 
//                     value={newBodyName} 
//                     onChange={(e) => setNewBodyName(e.target.value)} 
//                     placeholder="הזן שם גוף מימון..." 
//                     className="border border-blue-400 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48 shadow-inner"
//                     autoFocus
//                     onKeyDown={(e) => e.key === 'Enter' && handleAddBody()}
//                   />
//                   <button onClick={handleAddBody} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-blue-400">שמור</button>
//                   <button onClick={() => { setIsAddingBody(false); setNewBodyName(""); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-gray-400">ביטול</button>
//                 </div>
//               ) : (
//                 <button 
//                   onClick={() => setIsAddingBody(true)}
//                   className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border bg-white text-blue-700 border-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
//                 >
//                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
//                   הוסף גוף מימון
//                 </button>
//               )}
//             </div>
            
//           </div>
//           {loading && <span className="text-sm text-gray-500">טוען נתונים...</span>}
//         </div>

//         <div className="overflow-auto flex-1 relative">
//           <table className="w-max min-w-full text-center text-xs table-fixed border-collapse">
//             <thead className="text-gray-700 sticky top-0 z-20 shadow-sm bg-gray-100">
              
//               {showFilters && (
//                 <tr className="bg-blue-50/50">
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <select name="funding_body_id" value={filters.funding_body_id} onChange={handleFilterChange} className={filterInputStyle}>
//                       <option value="">הכל</option>
//                       {bodies.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
//                     </select>
//                   </th>
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <select name="amortization_schedule" value={filters.amortization_schedule} onChange={handleFilterChange} className={filterInputStyle}>
//                       <option value="">הכל</option>
//                       {AMORTIZATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
//                     </select>
//                   </th>
//                   <th className="p-1 border border-gray-300"></th>
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <select name="track_type" value={filters.track_type} onChange={handleFilterChange} className={filterInputStyle}>
//                       <option value="">הכל</option>
//                       {TRACK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
//                     </select>
//                   </th>
//                   <th className="p-1 border border-gray-300"></th>
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <select name="mortgage_type" value={filters.mortgage_type} onChange={handleFilterChange} className={filterInputStyle}>
//                       <option value="">הכל</option>
//                       {MORTGAGE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
//                     </select>
//                   </th>
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <input type="number" name="min_age_required" value={filters.min_age_required} onChange={handleFilterChange} placeholder="גיל מינימום..." className={filterInputStyle} />
//                   </th>
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <input type="number" name="min_spread_required" value={filters.min_spread_required} onChange={handleFilterChange} placeholder="פריסה מינימום..." className={filterInputStyle} />
//                   </th>
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <select name="restricted" value={filters.restricted} onChange={handleFilterChange} className={filterInputStyle}>
//                       <option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option>
//                     </select>
//                   </th>
//                   <th className="p-1 border border-gray-300 align-bottom">
//                     <select name="complex" value={filters.complex} onChange={handleFilterChange} className={filterInputStyle}>
//                       <option value="all">הכל</option><option value="yes">כן</option><option value="no">לא</option>
//                     </select>
//                   </th>
//                   <th className="p-1 border border-gray-300"></th>
//                   <th className="p-1 border border-gray-300"></th>
//                   <th className="p-1 border border-gray-300"></th>
//                   <th className="p-1 border border-gray-300"></th>
//                   <th className="p-1 border border-gray-300"></th>
//                   <th className="p-1 border border-gray-300 sticky left-0 bg-blue-50 z-30 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] align-middle">
                    
//                   </th>
//                 </tr>
//               )}

//               <tr>
//                 <th className="p-2 border border-gray-300 font-bold w-[120px] leading-tight align-bottom">גוף מימון</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[90px] leading-tight align-bottom">לוח סילוקין</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[75px] leading-tight align-bottom">ריביות<br/>לכל מטרה<br/>מינימום</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[80px] leading-tight align-bottom">מסלול</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[70px] leading-tight align-bottom">אחוז<br/>מימון<br/>מקסימלי</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[90px] leading-tight align-bottom">סוג<br/>משכנתא</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[60px] leading-tight align-bottom">גיל<br/>מקס'</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[70px] leading-tight align-bottom">פריסה<br/>מקסימלית<br/>בשנים</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[70px] leading-tight align-bottom">לקוחות<br/>מוגבלים</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[70px] leading-tight align-bottom">לקוחות<br/>מורכבים</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[65px] leading-tight align-bottom">פתיחת<br/>תיק ₪</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[65px] leading-tight align-bottom">פתיחת<br/>תיק<br/>אחוזים</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[100px] leading-tight align-bottom">שיטת רישום</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[120px] leading-tight align-bottom">תוספות</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[140px] leading-tight align-bottom">הערות</th>
//                 <th className="p-2 border border-gray-300 font-semibold w-[100px] leading-tight align-bottom sticky left-0 bg-gray-200 z-30 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">פעולות</th>
//               </tr>
//             </thead>
            
//             <tbody>
//               {filteredRows.map((row, idx) => {
//                 const isEditing = editingRowId === row.ui_id;
//                 const isFocused = focusedRowId === row.ui_id;
//                 const isActiveRow = isFocused || isEditing;
//                 const isHoverEnabled = focusedRowId === null;
//                 const rowNeedsGroup = isActiveRow || isHoverEnabled;
                
//                 const isDiffFromPrev = idx > 0 && filteredRows[idx - 1].funding_body_id !== row.funding_body_id;

//                 const tdClasses = `${tdBaseClasses} ${
//                   isActiveRow ? 'border-orange-400' : isHoverEnabled ? 'border-gray-200 group-hover:border-orange-400' : 'border-gray-200'
//                 }`;

//                 const firstTdBg = isActiveRow ? 'bg-orange-50' : isHoverEnabled ? 'bg-gray-50/50 group-hover:bg-orange-50' : 'bg-gray-50/50';
//                 const actionsBg = isActiveRow ? 'bg-orange-50' : isHoverEnabled ? 'bg-white group-hover:bg-orange-50' : 'bg-white';

//                 return (
//                   <tr 
//                     key={row.ui_id} 
//                     onFocusCapture={() => setFocusedRowId(row.ui_id)}
//                     onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusedRowId(null); }}
//                     className={`relative transition-colors ${rowNeedsGroup ? 'group' : ''} ${isActiveRow ? 'bg-orange-50/50 z-10' : ''} ${isHoverEnabled ? 'hover:bg-orange-50/50 hover:z-10' : ''} ${isDiffFromPrev ? 'border-t-[3px] border-t-gray-300' : 'border-t border-t-gray-200'}`}
//                   >
//                     <td className={`p-1 font-bold text-blue-900 text-right ${firstTdBg} ${tdClasses}`}>
//                       <div className="flex flex-col items-start gap-1 pr-1">
//                         <span className="text-sm">{row.body_name}</span>
//                         {!isEditing && (
//                           <button onClick={() => handleAddNewTrackToBody(row.funding_body_id, row.body_name)} className="text-[10px] text-blue-600 hover:text-blue-800 focus:ring-1 focus:ring-orange-400 font-medium bg-white border border-blue-100 rounded px-1.5 py-0.5 whitespace-nowrap outline-none">
//                             + מסלול
//                           </button>
//                         )}
//                       </div>
//                     </td>

//                     {isEditing ? (
//                       <>
//                         <td className={`p-1 ${tdClasses}`}><select name="amortization_schedule" value={editFormData.amortization_schedule || ""} onChange={handleChange} className={editInputStyle}><option value=""></option>{AMORTIZATION_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
//                         <td className={`p-1 ${tdClasses}`}><input type="number" step="0.01" name="min_interest_all_purpose_percent" value={editFormData.min_interest_all_purpose_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
//                         <td className={`p-1 ${tdClasses}`}><select name="track_type" value={editFormData.track_type || ""} onChange={handleChange} className={editInputStyle}><option value=""></option>{TRACK_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
//                         <td className={`p-1 ${tdClasses}`}><input type="number" step="0.01" name="max_financing_percent" value={editFormData.max_financing_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
//                         <td className={`p-1 ${tdClasses}`}><select name="mortgage_type" value={editFormData.mortgage_type || ""} onChange={handleChange} className={getMortgageTypeEditStyle(editFormData.mortgage_type)}><option value=""></option>{MORTGAGE_TYPE_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></td>
//                         <td className={`p-1 ${tdClasses}`}><input type="number" name="max_age" value={editFormData.max_age || ""} onChange={handleChange} className={editInputStyle} /></td>
//                         <td className={`p-1 ${tdClasses}`}><input type="number" name="max_spread_years" value={editFormData.max_spread_years || ""} onChange={handleChange} className={editInputStyle} /></td>
//                         <td className={`p-1 ${tdClasses}`}><CustomCheckbox name="restricted_customers" checked={!!editFormData.restricted_customers} onChange={handleChange} /></td>
//                         <td className={`p-1 ${tdClasses}`}><CustomCheckbox name="complex_customers" checked={!!editFormData.complex_customers} onChange={handleChange} /></td>
//                         <td className={`p-1 ${tdClasses}`}><input type="number" name="file_opening_fee_nis" value={editFormData.file_opening_fee_nis || ""} onChange={handleChange} className={editInputStyle} placeholder="₪" /></td>
//                         <td className={`p-1 ${tdClasses}`}><input type="number" step="0.01" name="file_opening_fee_percent" value={editFormData.file_opening_fee_percent || ""} onChange={handleChange} className={editInputStyle} placeholder="%" /></td>
//                         <td className={`p-1 ${tdClasses}`}><input type="text" name="registration_method" value={editFormData.registration_method || ""} onChange={handleChange} className={editInputStyle} /></td>
//                         <td className={`p-1 ${tdClasses}`}><ExpandableTextarea name="additions" value={editFormData.additions} isEditing={true} onChange={handleChange} /></td>
//                         <td className={`p-1 ${tdClasses}`}><ExpandableTextarea name="notes" value={editFormData.notes} isEditing={true} onChange={handleChange} /></td>
                        
//                         <td className={`p-1 text-center space-x-1 space-x-reverse sticky left-0 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] z-10 ${actionsBg} ${tdClasses}`}>
//                           <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-orange-400 text-white px-2 py-1.5 rounded transition text-[11px] font-medium w-full mb-1 outline-none">שמור</button>
//                           <button onClick={() => handleCancel(row.ui_id, row.is_new)} className="bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-orange-400 text-gray-700 px-2 py-1.5 rounded transition text-[11px] font-medium w-full outline-none">בטל</button>
//                         </td>
//                       </>
//                     ) : (
//                       <>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.amortization_schedule || ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.min_interest_all_purpose_percent ? `${row.min_interest_all_purpose_percent}%` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.track_type || ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.max_financing_percent ? `${row.max_financing_percent}%` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.mortgage_type || ""} className={getMortgageTypeViewStyle(row.mortgage_type)} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.max_age || ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.max_spread_years || ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><CustomCheckbox checked={!!row.restricted_customers} readOnly={true} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><CustomCheckbox checked={!!row.complex_customers} readOnly={true} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.file_opening_fee_nis ? `₪${row.file_opening_fee_nis}` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.file_opening_fee_percent ? `${row.file_opening_fee_percent}%` : ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><input readOnly value={row.registration_method || ""} className={viewInputStyle} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><ExpandableTextarea name="additions" value={row.additions} isEditing={false} /></td>
//                         <td className={`p-1.5 ${tdClasses}`}><ExpandableTextarea name="notes" value={row.notes} isEditing={false} /></td>
                        
//                         <td className={`p-1.5 text-center space-x-1 space-x-reverse sticky left-0 backdrop-blur-sm shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] z-10 flex justify-center items-center h-full gap-1 ${actionsBg} ${tdClasses}`}>
//                           <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 bg-blue-50 focus:bg-orange-100 focus:ring-1 focus:ring-orange-400 px-2 py-1.5 rounded transition text-[11px] font-medium border border-blue-100 flex-1 outline-none">
//                             {row.is_new ? "הוסף" : "ערוך"}
//                           </button>
//                           {!row.is_new && (
//                             <button onClick={() => handleDelete(row)} className="text-red-600 hover:text-red-800 bg-red-50 focus:bg-orange-100 focus:ring-1 focus:ring-orange-400 px-2 py-1.5 rounded transition text-[11px] font-medium border border-red-100 flex-1 outline-none">מחק</button>
//                           )}
//                         </td>
//                       </>
//                     )}
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
          
//           {filteredRows.length === 0 && !loading && (
//             <div className="text-center p-8 text-gray-500 bg-white">לא נמצאו מסלולים התואמים לסינון</div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// hooks/useLeads.ts
"use client";

import { useState, useEffect } from "react";

export type Lead = {
  id: number;
  name: string;
  email: string;
  cell: string;
  address?: string | null;
  created_at?: string;
  last_call?: string | null;
  status_call_id?: number | null;
  reason_not_intrested_id?: number | null;
  follow_up_date?: string | null;
  follow_up_hour?: string | null;
  spouse_name?: string | null;
  spouse_phone?: string | null;
  lead_first_status?: string | null;
  comment?: string | null;
  zoom?: string | null;
  hour_zoom?: string | null;
  black_list?: boolean | null;
  realtor?: boolean | null;
  mailing_list?: boolean | null;
  investors_list?: boolean | null;
  balance_statement?: string | null;
  bank_id?: number | null;
  profile_id?: number | null;
  data_source?: number | null;
};

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת לידים מהשרת
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/leads");
        if (!res.ok) throw new Error("Failed to fetch leads");
        const data = await res.json();
        setLeads(data);
      } catch (err: any) {
        setError(err.message);
        console.error("Fetch leads error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [leads]);

  // הוספת ליד חדש
const addLead = async (lead: Partial<Lead> | null) => {
  if (!lead) {
    console.error("addLead received null or undefined");
    return null;
  }

  try {
    // נקיון השדות עם ערכי ברירת מחדל
    const sanitizedLead: Partial<Lead> = {
      name: lead.name || "",
      email: lead.email || "",
      cell: lead.cell || "",
      address: lead.address ?? null,
      data_source: lead.data_source ?? null,     
      spouse_name: lead.spouse_name ?? null,
      spouse_phone: lead.spouse_phone ?? null,
      lead_first_status: lead.lead_first_status ?? null,
      comment: lead.comment ?? null,
      zoom: lead.zoom ?? null,
      hour_zoom: lead.hour_zoom ?? null,
      last_call: lead.last_call ?? null,
      status_call_id: lead.status_call_id ?? null,
      reason_not_intrested_id: lead.reason_not_intrested_id ?? null,
      follow_up_date: lead.follow_up_date ?? null,
      follow_up_hour: lead.follow_up_hour ?? null,
      black_list: lead.black_list ?? false,
      realtor: lead.realtor ?? false,
      mailing_list: lead.mailing_list ?? false,
      investors_list: lead.investors_list ?? false,
      balance_statement: lead.balance_statement ?? null,
      bank_id: lead.bank_id ?? null,
      profile_id: lead.profile_id ?? null,
    };

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizedLead),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to add lead: ${res.status} ${text}`);
    }

    const newLead: Lead = await res.json();
    if (!newLead?.id) return null;

    setLeads((prev) => [...prev, newLead]);
    console.log("Added lead with id:", newLead.id);
    return newLead;
  } catch (err) {
    console.error("Add lead error:", err);
    return null;
  }
};



  // עדכון ליד קיים
  const updateLead = async (id: number, lead: Partial<Lead>) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update lead: ${res.status} ${text}`);
      }

      const updated: Lead = await res.json();

      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      console.log("Updated lead with id:", updated.id);
      return updated;
    } catch (err) {
      console.error("Update lead error:", err);
      return null;
    }
  };

  // מחיקת ליד
  const deleteLead = async (id: number) => {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to delete lead: ${res.status} ${text}`);
      }

      setLeads((prev) => prev.filter((l) => l.id !== id));
      console.log("Deleted lead with id:", id);
    } catch (err) {
      console.error("Delete lead error:", err);
    }
  };

  return { leads, setLeads, loading, error, addLead, updateLead, deleteLead };
}



















// "use client";

// import { useState, useEffect } from "react";

// export type Lead = {
//   id: number;
//   name: string;
//   email: string;
//   cell: string;
//   address?: string | null;
//   created_at?: string;
//   last_call?: string | null;
//   status_call_id?: number | null;
//   reason_not_intrested_id?: number | null;
//   follow_up_date?: string | null;
//   follow_up_hour?: string | null;
//   spouse_name?: string | null;
//   spouse_phone?: string | null;
//   lead_first_status?: string | null;
//   comment?: string | null;
//   zoom?: string | null;
//   hour_zoom?: string | null;
//   black_list?: boolean | null;
//   realtor?: boolean | null;
//   mailing_list?: boolean | null;
//   investors_list?: boolean | null;
//   balance_statement?: string | null;
//   bank_id?: number | null;
//   profile_id?: number | null;
//   data_source?: number | null;
// };

// export function useLeads() {
//   const [leads, setLeads] = useState<Lead[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // טעינת לידים מהשרת
//   useEffect(() => {
//     const fetchLeads = async () => {
//       try {
//         const res = await fetch("/api/leads");
//         if (!res.ok) throw new Error("Failed to fetch leads");
//         const data = await res.json();
//         setLeads(data);
//       } catch (err: any) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchLeads();
//   }, []);

//   // הוספת ליד חדש
//   const addLead = async (lead: Partial<Lead>) => {
//     try {
//       const res = await fetch("/api/leads", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(lead),
//       });
//       if (!res.ok) throw new Error("Failed to add lead");

//       const newLead: Lead = await res.json();

//       if (!newLead?.id) return null;

//       setLeads((prev) => [...prev, newLead]);
//       return newLead;
//     } catch (err) {
//       console.error(err);
//       return null;
//     }
//   };

//   // עדכון ליד קיים
//   const updateLead = async (id: number, lead: Partial<Lead>) => {
//     try {
//       const res = await fetch(`/api/leads/${id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(lead),
//       });
//       if (!res.ok) throw new Error("Failed to update lead");

//       const updated: Lead = await res.json();

//       setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
//       return updated;
//     } catch (err) {
//       console.error(err);
//       return null;
//     }
//   };

//   // מחיקת ליד
//   const deleteLead = async (id: number) => {
//     try {
//       const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
//       if (!res.ok) throw new Error("Failed to delete lead");

//       setLeads((prev) => prev.filter((l) => l.id !== id));
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return { leads,setLeads, loading, error, addLead, updateLead, deleteLead };
// }

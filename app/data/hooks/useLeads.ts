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
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  // הוספת ליד חדש
  const addLead = async (lead: Partial<Lead>) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error("Failed to add lead");

      const newLead: Lead = await res.json();

      if (!newLead?.id) return null;

      setLeads((prev) => [...prev, newLead]);
      return newLead;
    } catch (err) {
      console.error(err);
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
      if (!res.ok) throw new Error("Failed to update lead");

      const updated: Lead = await res.json();

      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // מחיקת ליד
  const deleteLead = async (id: number) => {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");

      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return { leads,setLeads, loading, error, addLead, updateLead, deleteLead };
}

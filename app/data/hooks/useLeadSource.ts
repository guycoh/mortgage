// hooks/useLeadSource.ts
"use client";

import { useState, useEffect } from "react";

export type Source = {
  id: number;
  source: string;
  created_at: string;
};

export function useLeadSource() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch('/api/lead_source');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setSources(data);
      } catch (err) {
        console.error(err);
        setError('שגיאה בעת טעינת העובדים');
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);







  // יצירה
  const addSource = async (source: string) => {
    try {
      const res = await fetch("/api/lead-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }), // חשוב שזה יהיה source
      });
      if (!res.ok) throw new Error(await res.text());
      const [newSource] = await res.json(); // Supabase מחזיר מערך
      setSources((prev) => [...prev, newSource]);
      return newSource;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // עדכון
  const updateSource = async (id: number, source: string) => {
    try {
      const res = await fetch(`/api/lead-source/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, source: updated.source } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // מחיקה
  const deleteSource = async (id: number) => {
    try {
      const res = await fetch(`/api/lead-source/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return { sources, loading, error, addSource, updateSource, deleteSource };
}



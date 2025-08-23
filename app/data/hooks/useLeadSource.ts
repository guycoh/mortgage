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

  // טעינת מקורות מהשרת
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch("/api/lead_source");
        if (!res.ok) throw new Error("Failed to fetch lead_sources");
        const data = await res.json();
        setSources(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, [sources]);

  // הוספת מקור חדש
  const addSource = async (name: string) => {
  try {
    const res = await fetch("/api/lead_source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: name }),
    });
    if (!res.ok) throw new Error("Failed to add source");

    const newSource: Source = await res.json();

    // אם אין לו id → אל תכניס ל־state
    if (!newSource?.id) return null;

    setSources((prev) => [...prev, newSource]);
    return newSource;
  } catch (err) {
    console.error(err);
    return null;
  }
};

  // עדכון מקור
 const updateSource = async (id: number, name: string) => {
  try {
    const res = await fetch(`/api/lead_source/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: name }),
    });
    if (!res.ok) throw new Error("Failed to update source");

    const updated: Source = await res.json();

    setSources((prev) =>
      prev.map((s) => (s.id === id ? updated : s))
    ); // 👈 מחליף ברשומה המלאה
    return updated;
  } catch (err) {
    console.error(err);
    return null;
  }
};

  // מחיקה
  const deleteSource = async (id: number) => {
    try {
      const res = await fetch(`/api/lead_source/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete source");

      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return { sources, loading, error, addSource, updateSource, deleteSource };
}

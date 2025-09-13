"use client"

import { useState, useEffect } from "react";

export type LoanPath = {
  id: number;
  name: string;
  is_indexed: boolean;
  created_at: string;
};

export function useLoanPaths() {
  const [paths, setPaths] = useState<LoanPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת הנתונים מהשרת
  useEffect(() => {
    const fetchPaths = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/loan_paths");
        if (!res.ok) throw new Error("Failed to fetch loan paths");
        const data: LoanPath[] = await res.json();
        setPaths(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaths();
  }, []);

  // הוספת מסלול חדש
  const addPath = async (name: string, is_indexed = false) => {
    try {
      const res = await fetch("/api/loan_paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, is_indexed }),
      });
      if (!res.ok) throw new Error("Failed to add loan path");

      const newPath: LoanPath = await res.json();
      if (!newPath?.id) return null;

      setPaths((prev) => [...prev, newPath]);
      return newPath;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // עדכון מסלול קיים
  const updatePath = async (id: number, name: string, is_indexed: boolean) => {
    try {
      const res = await fetch(`/api/loan_paths/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, is_indexed }),
      });
      if (!res.ok) throw new Error("Failed to update loan path");

      const updated: LoanPath = await res.json();
      setPaths((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // מחיקת מסלול
  const deletePath = async (id: number) => {
    try {
      const res = await fetch(`/api/loan_paths/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete loan path");

      setPaths((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return { paths, loading, error, addPath, updatePath, deletePath };
}

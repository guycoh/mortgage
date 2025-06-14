// hooks/useEmployees.ts
import { useEffect, useState } from 'react';

export type Employee = {
  id: string;
  full_name: string;
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/profiles');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error(err);
        setError('שגיאה בעת טעינת העובדים');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return { employees, loading, error };
}

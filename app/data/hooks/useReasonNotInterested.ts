// hooks/ReasonNotInterested.ts
import { useEffect, useState } from 'react';

export type Employee = {
  id: string;
  status: string;
};

export function useReasonNotInterested() {
  const [reasons, setReasons] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const res = await fetch('/api/reason_not_interested');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setReasons(data);
      } catch (err) {
        console.error(err);
        setError('שגיאה בעת טעינת העובדים');
      } finally {
        setLoading(false);
      }
    };

    fetchReasons();
  }, []);

  return { reasons, loading, error };
}

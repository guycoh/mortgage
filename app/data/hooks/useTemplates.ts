//  /data/hooks/useTemplates.ts
import { useEffect, useState } from 'react';


export type Template = {
  id: string;  
  name: string;
  content: string;
  inactive: boolean;
  favorite: boolean;
 
};

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTemplates(data);
      } catch (err) {
        console.error(err);
        setError('שגיאה בעת טעינת העובדים');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return { templates, loading, error };
}

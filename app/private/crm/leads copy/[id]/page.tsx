'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { banks } from '@/app/data/banks'
import { statusCall } from '@/app/data/status_call'
import { useEmployees } from '@/app/data/hooks/useEmployees'
import { useReasonNotInterested } from '@/app/data/hooks/useReasonNotInterested'



export type Lead = {
  id: number;
  created_at: string; // ניתן לשנות ל Date אם אתה ממיר אותו
  name: string | null;
  email: string | null;
  cell: string | null;
  address: string | null;
  data_source: string | null;
  intrested_in: string | null;
  spouse_name: string | null;
  spouse_phone: string | null;
  lead_first_status: string | null;
  comment: string | null;
  zoom: string | null;
  hour_zoom: string | null;
  last_call: string | null;
  status_call_id: number | null;
  reason_not_intrested_id: number | null;
  follow_up_date: string | null; // תאריך בפורמט ISO
  follow_up_hour: string | null;
  realtor: string | null;
  black_list: number | null;
  mailing_list: number | null;
  investors_list: number | null;
  balance_statement: number | null;
  bank_id: number | null;
  profile_id: number | null;
};



export default function EditLeadPage() {
  const router = useRouter();
  const { id } = useParams(); // קבלת מזהה הליד מה-URL
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 const { employees } = useEmployees();



  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leads/${id}`);
        if (!res.ok) throw new Error('בעיה בטעינת הנתונים');
        const data = await res.json();
        setLead(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLead();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!lead) return;
    setLead({ ...lead, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });

      if (!res.ok) throw new Error('שגיאה בעדכון הליד');
      //router.push('/private/crm/leads');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (error) return <div className="p-4 text-red-600">שגיאה: {error}</div>;
  if (!lead) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-7xl mx-auto p-6 lg:p-8 bg-white rounded-xl shadow space-y-6"
    >
    <h2 className="text-2xl font-bold">כרטיס ליד </h2>

  {/* רשת המסגרות */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

    {/* מסגרת 1 – פרטי לידים בסיסיים */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">פרטי ליד</legend>

      <div className="space-y-2">
        
        <label className="block text-sm font-medium">שם מלא
          <input
           value={lead.name ?? ''}
           onChange={handleChange}
           id="name" name="name" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50" />
        </label>

        <label className="block text-sm font-medium">טלפון נייד
          <input
            value={lead.cell ?? ''}
            onChange={handleChange}
            id="cell" name="cell" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50" />
        </label>

        <label className="block text-sm font-medium">אימייל
          <input value={lead.email ?? ''} onChange={handleChange} id="email" name="email" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>

        <label className="block text-sm font-medium">כתובת
          <input  value={lead.address ?? ''} onChange={handleChange}  id="address" name="address" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>

        
      </div>
    </fieldset>
    {/* מסגרת 2 – פרטי בן/בת זוג */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">פרטי בן/בת זוג</legend>

      <div className="space-y-2">
        <label className="block text-sm font-medium">שם בן/בת זוג
          <input value={lead.spouse_name ?? ''} onChange={handleChange}  id="spouse_name" name="spouse_name" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>

        <label className="block text-sm font-medium">טלפון בן/בת זוג
          <input value={lead.spouse_phone ?? ''} onChange={handleChange} id="spouse_phone" name="spouse_phone" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>
      </div>
    </fieldset>

    {/* מסגרת 3 – סיווגים ורשימות */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">סיווגים</legend>
      {/* black List */}
      <label className="flex items-center gap-2 text-sm">
        <input checked={lead?.black_list === 1}
        type="checkbox"
         name="black_list" 
            onChange={(e) =>
            setLead((prev) =>
              prev ? { ...prev, black_list: e.target.checked ? 1 : 0 } : prev
            )
          }
      className="accent-orange-500" />
        רשימה שחורה
      </label>
     
      {/* Mailing List */}
      <label className="flex items-center gap-2 text-sm">
        <input checked={lead?.mailing_list === 1}
                type="checkbox" 
                name="mailing_list" 
                onChange={(e) =>
                    setLead((prev) =>
                      prev ? { ...prev, mailing_list: e.target.checked ? 1 : 0 } : prev
                    )
                  }
                className="accent-orange-500" />
        רשימת דיוור
      </label>

      {/* Investors List */}
      <label className="flex items-center gap-2 text-sm">
        <input checked={lead?.investors_list === 1}
               type="checkbox" 
               name="investors_list"
               onChange={(e) =>
                    setLead((prev) =>
                      prev ? { ...prev, investors_list: e.target.checked ? 1 : 0 } : prev
                    )
                  }
               className="accent-orange-500" />
          רשימת משקיעים
      </label>

      {/* balance_statement */}
        <label className="block text-sm font-medium"> 
          <input 
                 checked={lead?.balance_statement === 1}
                 type="checkbox" 
                 name="balance_statement" 
                 onChange={(e) =>
                    setLead((prev) =>
                      prev ? { ...prev, balance_statement: e.target.checked ? 1 : 0 } : prev
                    )
                  }
                 className="input-base" />
                 דוח יתרות     
        </label>

      {/* בנק */}
        <label className="block text-sm font-medium">
          בחר בנק
            <select
                   value={lead.bank_id ?? ''}
                    id="bank"
                    name="bank"
                    className="w-full bg-transparent text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
                    onChange={handleChange}
                  >
                    <option value="" disabled hidden>
                      -- בחר בנק --
                    </option>

                    {banks.map(({ id, name }) => (
                      <option key={id} value={id} className="text-slate-700">
                        {name}
                      </option>
                    ))}
            </select>

        </label>

 <select
    name="employee_id"
    defaultValue=""
    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-right"
  >
    <option value="">--- בחר עובד ---</option>
    {employees.map((emp) => (
      <option key={emp.id} value={emp.id}>
        {emp.full_name}
      </option>
    ))}
  </select>



    

    
    </fieldset>


{/* מסגרת 4 – הערות */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">הערות</legend>
       <label className="block text-sm font-medium">מקור ליד
          <input value={lead.data_source ?? '' } onChange={handleChange} id="data_source" name="data_source" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>
{/*       
        <label className="block text-sm font-medium" htmlFor="comment">הערות
          <textarea
            value=""
         
            id="comment"
            name="comment"
            className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50" 
          />
        </label> */}
    </fieldset>


 </div>
 
 
 
 
 
 
 
 
 <div className="flex flex-col md:flex-row gap-4">
  {/* חלק ימין – שיחות ומעקב */}
  <div className="w-full md:w-1/3">
    {/* כאן שים את הקוד שהעברת לי קודם: מסגרת שיחות ומעקב */}
    <fieldset className="w-full p-4 border rounded-2xl shadow-sm bg-white">
      <legend className="text-sm font-semibold px-2 text-gray-700">שיחות ומעקב</legend>

      <div className="flex flex-col gap-4 mt-4">
        {/* כל הלייבלים והאינפוטים שלך */}
        {/* לדוגמה: */}
        <label className="flex flex-col text-sm font-medium text-gray-800">
          שיחה אחרונה
          <input
           
            type="date"
            name="last_call"
            className="bg-transparent text-sm border border-slate-500 rounded-md px-3 py-2 focus:bg-orange-50 shadow-sm"
          />
        </label>












        {/* המשך שדות... */}
     
      {/* סטטוס שיחה */}
             <label className="flex flex-col text-sm font-medium text-gray-800 w-full md:w-auto">
               סטטוס שיחה
               <select
                 onChange={handleChange}
                 id="status_call_id"
                 name="status_call_id"
                 value={lead.status_call_id ?? ''}
                 className="w-full md:w-44 bg-transparent text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
               >
                 <option value="" disabled hidden>-- סטטוס שיחה --</option>
                 {statusCall.map(({ id, name }) => (
                   <option key={id} value={id} className="text-slate-700">
                     {name}
                   </option>
                 ))}
               </select>
             </label>
     
     
   
     
      </div>
    </fieldset>
  </div>

  {/* חלק שמאל – שאר הקומפוננט שלך */}
  <div className="w-full md:w-2/3">
    {/* כאן תכניס את הקומפוננטה הקיימת שלך, לדוגמה: */}
   
  </div>
</div>

  

{/* כפתור שמירה */}
<button
  type="submit"
  className="w-full lg:w-auto bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-xl mt-6"
>
  שמור שינויים
</button>

      
    </form>
    
  );
}

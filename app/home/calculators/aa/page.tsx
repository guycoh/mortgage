"use client";

import { useState } from 'react';
import { Percent } from 'lucide-react';
//import MortgageTracksTable, { Track } from './MortgageTracksTable'; // ודא נתיב קובץ תקין
import MortgageTracksTable , { Track }  from './components/MortgageTracksTable';


interface Mix {
  id: number;
  title: string;
  tracks: Track[];
}

export default function MortgageResponsiveSimulator() {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [expectedIndex, setExpectedIndex] = useState<string>('2.5');

  const [mixes, setMixes] = useState<Mix[]>([
    {
      id: 1,
      title: 'תמהיל 1',
      tracks: [
        { amount: '400000', type: 'שפיצר', trackName: 'פריים', changeFrequency: 'כל חודש', anchor: 'בנק ישראל', grace: 'ללא', graceMonths: '0', endDate: '2056-06', months: '360', interest: '6.0', monthlyPayment: '2398' },
        { amount: '300000', type: 'שפיצר', trackName: 'קבועה לא צמודה', changeFrequency: 'קבועה', anchor: 'אין', grace: 'ללא', graceMonths: '0', endDate: '2046-06', months: '240', interest: '4.8', monthlyPayment: '1947' },
        { amount: '300000', type: 'שפיצר', trackName: 'משתנה כל 5 שנים', changeFrequency: '5 שנים', anchor: 'אג"ח ממשלתי', grace: 'ללא', graceMonths: '0', endDate: '2051-06', months: '300', interest: '3.9', monthlyPayment: '1568' },
      ]
    },
    {
      id: 2,
      title: 'תמהיל 2',
      tracks: [
        { amount: '300000', type: 'שפיצר', trackName: 'פריים', changeFrequency: 'כל חודש', anchor: 'בנק ישראל', grace: 'ללא', graceMonths: '0', endDate: '2056-06', months: '360', interest: '6.0', monthlyPayment: '1799' },
        { amount: '400000', type: 'שפיצר', trackName: 'קבועה לא צמודה', changeFrequency: 'קבועה', anchor: 'אין', grace: 'ללא', graceMonths: '0', endDate: '2041-06', months: '180', interest: '4.5', monthlyPayment: '3059' },
        { amount: '300000', type: 'שפיצר', trackName: 'משתנה כל 5 לא צמודה', changeFrequency: '5 שנים', anchor: 'עלות גיוס', grace: 'ללא', graceMonths: '0', endDate: '2051-06', months: '300', interest: '4.2', monthlyPayment: '1613' },
      ]
    },
    {
      id: 3,
      title: 'תמהיל 3',
      tracks: [
        { amount: '350000', type: 'שפיצר', trackName: 'פריים', changeFrequency: 'כל חודש', anchor: 'בנק ישראל', grace: 'ללא', graceMonths: '0', endDate: '2056-06', months: '360', interest: '6.0', monthlyPayment: '2098' },
        { amount: '350000', type: 'שפיצר', trackName: 'קבועה צמודה', changeFrequency: 'קבועה', anchor: 'אין', grace: 'ללא', graceMonths: '0', endDate: '2046-06', months: '240', interest: '3.2', monthlyPayment: '1385' },
        { amount: '300000', type: 'שפיצר', trackName: 'מל"צ', changeFrequency: '5 שנים', anchor: 'עלות גיוס', grace: 'ללא', graceMonths: '0', endDate: '2051-06', months: '300', interest: '4.2', monthlyPayment: '1613' },
      ]
    }
  ]);

  // עדכון השדות ישירות מהטבלה הבת
  const handleTrackInputChange = (trackIndex: number, field: keyof Track, value: string) => {
    setMixes(prevMixes => prevMixes.map(mix => {
      if (mix.id !== activeTab) return mix;
      const updatedTracks = [...mix.tracks];
      updatedTracks[trackIndex] = { ...updatedTracks[trackIndex], [field]: value };
      return { ...mix, tracks: updatedTracks };
    }));
  };

  const currentMix = mixes.find(m => m.id === activeTab) || mixes[0];

  return (
    <div className="w-full min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* מדד מחירים צפוי */}
        <div className="bg-white p-4 rounded-none border border-gray-200 shadow-sm mb-6 max-w-xs">
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <Percent size={14} className="text-[#1d75a1]" />
            מדד מחירים צפוי שנתי:
          </label>
          <div className="relative rounded-none shadow-sm">
            <input
              type="text"
              value={expectedIndex}
              onChange={(e) => setExpectedIndex(e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 border border-gray-300 rounded-none px-3 py-1.5 focus:ring-1 focus:ring-[#1d75a1] focus:border-[#1d75a1] outline-none"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-bold">
              %
            </div>
          </div>
        </div>

        {/* בר לשוניות מצומצם */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none mb-0 gap-1">
          {mixes.map((mix) => {
            const isActive = mix.id === activeTab;
            return (
              <button
                key={mix.id}
                onClick={() => setActiveTab(mix.id)}
                className={`py-2 px-6 text-sm font-bold transition-all duration-150 whitespace-nowrap border-t border-x -mb-px text-center min-w-[120px] rounded-none
                  ${isActive 
                    ? 'bg-[#1d75a1] border-[#1d75a1] text-white font-bold' 
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 border-transparent'
                  }`}
              >
                {mix.title}
              </button>
            );
          })}
        </div>

        {/* תוכן התמהיל - הזרקת הקומפוננטה המופרדת */}
        <div className="bg-white border-x border-b border-gray-200 shadow-sm rounded-none">
          <div className="p-4 sm:p-6">
            <MortgageTracksTable 
              tracks={currentMix.tracks} 
              onTrackChange={handleTrackInputChange}
              onOpenSchedule={(idx) => alert(`לוח סילוקין לתמהיל ${activeTab}, שורה ${idx + 1}`)}
              onDeleteTrack={(idx) => alert(`מחיקת שורה ${idx + 1} מתמהיל ${activeTab}`)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
































// "use client"
// import  { useState } from 'react';
// import { Trash2, Calendar, Percent } from 'lucide-react';

// interface Track {
//   amount: string;
//   type: string;
//   trackName: string;
//   changeFrequency: string;
//   anchor: string;
//   grace: string;
//   graceMonths: string;
//   endDate: string;
//   months: string;
//   interest: string;
//   monthlyPayment: string;
// }

// interface Mix {
//   id: number;
//   title: string;
//   tracks: Track[];
// }

// export default function MortgageResponsiveSimulator() {
//   const [activeTab, setActiveTab] = useState<number>(1);
//   const [expectedIndex, setExpectedIndex] = useState<string>('2.5');

 
//   const [mixes, setMixes] = useState<Mix[]>([
//     {
//       id: 1,
//       title: 'תמהיל 1',
//       tracks: [
//         { amount: '400000', type: 'שפיצר', trackName: 'פריים', changeFrequency: 'כל חודש', anchor: 'בנק ישראל', grace: 'ללא', graceMonths: '0', endDate: '2056-06', months: '360', interest: '6.0', monthlyPayment: '2398' },
//         { amount: '300000', type: 'שפיצר', trackName: 'קבועה לא צמודה', changeFrequency: 'קבועה', anchor: 'אין', grace: 'ללא', graceMonths: '0', endDate: '2046-06', months: '240', interest: '4.8', monthlyPayment: '1947' },
//         { amount: '300000', type: 'שפיצר', trackName: 'משתנה כל 5 שנים', changeFrequency: '5 שנים', anchor: 'אג"ח ממשלתי', grace: 'ללא', graceMonths: '0', endDate: '2051-06', months: '300', interest: '3.9', monthlyPayment: '1568' },
//       ]
//     },
//     {
//       id: 2,
//       title: 'תמהיל 2',
//       tracks: [
//         { amount: '300000', type: 'שפיצר', trackName: 'פריים', changeFrequency: 'כל חודש', anchor: 'בנק ישראל', grace: 'ללא', graceMonths: '0', endDate: '2056-06', months: '360', interest: '6.0', monthlyPayment: '1799' },
//         { amount: '400000', type: 'שפיצר', trackName: 'קבועה לא צמודה', changeFrequency: 'קבועה', anchor: 'אין', grace: 'ללא', graceMonths: '0', endDate: '2041-06', months: '180', interest: '4.5', monthlyPayment: '3059' },
//         { amount: '300000', type: 'שפיצר', trackName: 'משתנה כל 5 לא צמודה', changeFrequency: '5 שנים', anchor: 'עלות גיוס', grace: 'ללא', graceMonths: '0', endDate: '2051-06', months: '300', interest: '4.2', monthlyPayment: '1613' },
//       ]
//     },
//     {
//       id: 3,
//       title: 'תמהיל 3',
//       tracks: [
//         { amount: '350000', type: 'שפיצר', trackName: 'פריים', changeFrequency: 'כל חודש', anchor: 'בנק ישראל', grace: 'ללא', graceMonths: '0', endDate: '2056-06', months: '360', interest: '6.0', monthlyPayment: '2098' },
//         { amount: '350000', type: 'שפיצר', trackName: 'קבועה צמודה', changeFrequency: 'קבועה', anchor: 'אין', grace: 'ללא', graceMonths: '0', endDate: '2046-06', months: '240', interest: '3.2', monthlyPayment: '1385' },
//         { amount: '300000', type: 'שפיצר', trackName: 'מל"צ', changeFrequency: '5 שנים', anchor: 'עלות גיוס', grace: 'ללא', graceMonths: '0', endDate: '2051-06', months: '300', interest: '4.2', monthlyPayment: '1613' },
//       ]
//     }
//   ]);

//   const handleInputChange = (mixId: number, trackIndex: number, field: keyof Track, value: string) => {
//     setMixes(prevMixes => prevMixes.map(mix => {
//       if (mix.id !== mixId) return mix;
//       const updatedTracks = [...mix.tracks];
//       updatedTracks[trackIndex] = { ...updatedTracks[trackIndex], [field]: value };
//       return { ...mix, tracks: updatedTracks };
//     }));
//   };

//   const currentMix = mixes.find(m => m.id === activeTab) || mixes[0];

//   return (
//     <div className="w-full min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
//       <div className="max-w-7xl mx-auto">
        
//         {/* מדד מחירים צפוי */}
//         <div className="bg-white p-4 rounded-none border border-gray-200 shadow-sm mb-6 max-w-xs">
//           <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
//             <Percent size={14} className="text-[#1d75a1]" />
//             מדד מחירים צפוי שנתי:
//           </label>
//           <div className="relative rounded-none shadow-sm">
//             <input
//               type="text"
//               value={expectedIndex}
//               onChange={(e) => setExpectedIndex(e.target.value)}
//               className="w-full text-sm font-semibold text-gray-900 border border-gray-300 rounded-none px-3 py-1.5 focus:ring-1 focus:ring-[#1d75a1] focus:border-[#1d75a1] outline-none"
//             />
//             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-bold">
//               %
//             </div>
//           </div>
//         </div>

//         {/* בר לשוניות מצומצם (גובה נמוך, פינות ישרות בלשונית הפעילה) */}
//         <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none mb-0 gap-1">
//           {mixes.map((mix) => {
//             const isActive = mix.id === activeTab;
//             return (
//               <button
//                 key={mix.id}
//                 onClick={() => setActiveTab(mix.id)}
//                 className={`py-2 px-6 text-sm font-bold transition-all duration-150 whitespace-nowrap border-t border-x -mb-px text-center min-w-[120px] rounded-none
//                   ${isActive 
//                     ? 'bg-[#1d75a1] border-[#1d75a1] text-white font-bold' 
//                     : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 border-transparent'
//                   }`}
//               >
//                 {mix.title}
//               </button>
//             );
//           })}
//         </div>

//         {/* תוכן התמהיל - ללא פינות מעוגלות */}
//         <div className="bg-white border-x border-b border-gray-200 shadow-sm rounded-none">
//           <div className="p-4 sm:p-6">
            
//             {/* תצוגת דסקטופ: טבלה קלאסית רחבה (מוסתרת בנייד) */}
//             <div className="hidden lg:block border border-gray-200 rounded-none">
//               <table className="w-full text-right border-collapse text-sm rounded-none">
//                 <thead>
//                   <tr className="bg-[#1d75a1] text-white font-bold whitespace-nowrap divide-x divide-x-reverse divide-white/10 rounded-none">
//                     <th className="p-3 text-center">סכום הלוואה</th>
//                     <th className="p-3 text-center">לוח סילוקין</th>
//                     <th className="p-3 text-center">מסלול</th>
//                     <th className="p-3 text-center">תדירות שינוי</th>
//                     <th className="p-3 text-center">עוגן</th>
//                     <th className="p-3 text-center">גרייס</th>
//                     <th className="p-3 text-center">חודשי גרייס</th>
//                     <th className="p-3 text-center">תאריך סיום</th>
//                     <th className="p-3 text-center">חודשים</th>
//                     <th className="p-3 text-center">ריבית (%)</th>
//                     <th className="p-3 text-center">סכום חודשי</th>
//                     <th className="p-3 text-center bg-[#155b7e]">פעולות</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-200 text-gray-700">
//                   {currentMix.tracks.map((track, idx) => (
//                     <tr key={idx} className="hover:bg-[#1d75a1]/5 transition-colors duration-150 divide-x divide-x-reverse divide-gray-100">
//                       <td className="p-1.5"><input type="text" value={track.amount} onChange={(e) => handleInputChange(currentMix.id, idx, 'amount', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 font-bold text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="text" value={track.type} onChange={(e) => handleInputChange(currentMix.id, idx, 'type', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="text" value={track.trackName} onChange={(e) => handleInputChange(currentMix.id, idx, 'trackName', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-[#1d75a1] font-semibold text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="text" value={track.changeFrequency} onChange={(e) => handleInputChange(currentMix.id, idx, 'changeFrequency', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="text" value={track.anchor} onChange={(e) => handleInputChange(currentMix.id, idx, 'anchor', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-gray-500 text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="text" value={track.grace} onChange={(e) => handleInputChange(currentMix.id, idx, 'grace', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="text" value={track.graceMonths} onChange={(e) => handleInputChange(currentMix.id, idx, 'graceMonths', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="month" value={track.endDate} onChange={(e) => handleInputChange(currentMix.id, idx, 'endDate', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-center outline-none text-xs" /></td>
//                       <td className="p-1.5"><input type="number" value={track.months} onChange={(e) => handleInputChange(currentMix.id, idx, 'months', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 text-center outline-none" /></td>
//                       <td className="p-1.5"><input type="text" value={track.interest} onChange={(e) => handleInputChange(currentMix.id, idx, 'interest', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 font-semibold text-emerald-600 text-center outline-none" /></td>
//                       <td className="p-1.5 bg-gray-50/50"><input type="text" value={track.monthlyPayment} onChange={(e) => handleInputChange(currentMix.id, idx, 'monthlyPayment', e.target.value)} className="w-full bg-transparent border border-transparent focus:bg-white focus:border-[#1d75a1] p-1.5 font-bold text-center outline-none" /></td>
//                       <td className="p-1.5 text-center bg-gray-50/30">
//                         <div className="flex items-center justify-center gap-1">
//                           <button className="bg-[#1d75a1] hover:bg-[#155b7e] text-white text-xs px-2 py-1 transition-colors" onClick={() => alert('לוח סילוקין')}><Calendar size={12} /></button>
//                           <button className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs px-2 py-1 transition-colors" onClick={() => alert('מחיקה')}><Trash2 size={12} /></button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* תצוגת מובייל וטאבלט: גלילה אנכית של שדות (שבירת מבנה לכרטיסים ללא גלילה אופקית) */}
//             <div className="block lg:hidden space-y-6">
//               {currentMix.tracks.map((track, idx) => (
//                 <div key={idx} className="border border-gray-200 rounded-none bg-white shadow-sm overflow-hidden">
//                   {/* כותרת קטנה למסלול בתוך הכרטיס */}
//                   <div className="bg-[#1d75a1] text-white text-xs font-bold px-3 py-2 flex justify-between items-center">
//                     <span>שורה {idx + 1}: {track.trackName || 'מסלול חדש'}</span>
//                     <div className="flex gap-1">
//                       <button className="bg-white/20 hover:bg-white/30 text-white p-1" onClick={() => alert('לוח סילוקין')}><Calendar size={14} /></button>
//                       <button className="bg-white/20 hover:bg-red-600 text-white p-1" onClick={() => alert('מחיקה')}><Trash2 size={14} /></button>
//                     </div>
//                   </div>
                  
//                   {/* גריד רספונסיבי של שדות - נשברים מטה בהתאם לרוחב המסך */}
//                   <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50/30">
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">סכום הלוואה</label>
//                       <input type="text" value={track.amount} onChange={(e) => handleInputChange(currentMix.id, idx, 'amount', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm font-bold rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">לוח סילוקין</label>
//                       <input type="text" value={track.type} onChange={(e) => handleInputChange(currentMix.id, idx, 'type', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">מסלול</label>
//                       <input type="text" value={track.trackName} onChange={(e) => handleInputChange(currentMix.id, idx, 'trackName', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm text-[#1d75a1] font-semibold rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">תדירות שינוי</label>
//                       <input type="text" value={track.changeFrequency} onChange={(e) => handleInputChange(currentMix.id, idx, 'changeFrequency', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">עוגן</label>
//                       <input type="text" value={track.anchor} onChange={(e) => handleInputChange(currentMix.id, idx, 'anchor', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">גרייס</label>
//                       <input type="text" value={track.grace} onChange={(e) => handleInputChange(currentMix.id, idx, 'grace', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">חודשי גרייס</label>
//                       <input type="text" value={track.graceMonths} onChange={(e) => handleInputChange(currentMix.id, idx, 'graceMonths', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">תאריך סיום</label>
//                       <input type="month" value={track.endDate} onChange={(e) => handleInputChange(currentMix.id, idx, 'endDate', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-xs rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">חודשים</label>
//                       <input type="number" value={track.months} onChange={(e) => handleInputChange(currentMix.id, idx, 'months', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm rounded-none" />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] text-gray-400 font-bold mb-0.5">ריבית (%)</label>
//                       <input type="text" value={track.interest} onChange={(e) => handleInputChange(currentMix.id, idx, 'interest', e.target.value)} className="w-full bg-white border border-gray-200 p-1.5 text-sm font-semibold text-emerald-600 rounded-none" />
//                     </div>
//                     <div className="col-span-2 sm:col-span-1 bg-[#1d75a1]/5 p-1">
//                       <label className="block text-[11px] text-[#1d75a1] font-bold mb-0.5">סכום חודשי</label>
//                       <input type="text" value={track.monthlyPayment} onChange={(e) => handleInputChange(currentMix.id, idx, 'monthlyPayment', e.target.value)} className="w-full bg-white border border-[#1d75a1]/30 p-1.5 text-sm font-bold text-gray-900 rounded-none" />
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }
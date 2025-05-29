'use client';

import { useState } from 'react';

const advisors = {
  'גיא כהן': {
    phone: '0523684844',
    card: 'https://morg-orcin.vercel.app/card',
  },
  'משה מוסיוב': {
    phone: '0502453345',
    card: 'https://morg-orcin.vercel.app/card_m',
  },
};

const bankLinksByAdvisor: Record<keyof typeof advisors, Record<string, string>> = {
  'גיא כהן': {
    "דיסקונט": "https://morg-orcin.vercel.app/muhni/bb/discount",
    "הפועלים": "https://morg-orcin.vercel.app/muhni/bb/hapoalim",
    "מזרחי טפחות": "https://morg-orcin.vercel.app/muhni/bb/mizrachi",
    "לאומי": "https://morg-orcin.vercel.app/muhni/bb/leumi",
  },
  'משה מוסיוב': {
    "דיסקונט": "https://morg-orcin.vercel.app/muhni7/bb/discount",
    "הפועלים": "https://morg-orcin.vercel.app/muhni7/bb/hapoalim",
    "מזרחי טפחות": "https://morg-orcin.vercel.app/muhni7/bb/mizrachi",
    "לאומי": "https://morg-orcin.vercel.app/muhni7/bb/leumi",
  },
};

export default function WhatsappMessageGenerator() {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('מזרחי טפחות');
  const [advisor, setAdvisor] = useState<keyof typeof advisors>('גיא כהן');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  const generateMessage = () => {
    const clientName = name.trim() || 'לקוח יקר';
    const bankLink = bankLinksByAdvisor[advisor][bank] || '';
    const advisorData = advisors[advisor];

    const msg = `היי ${clientName} 👋

בהמשך לשיחתנו, מצרף לך קישור ל-*מדריך להוצאת דוח יתרות לסילוק*:
יש להשיב להודעה זו כדי שהקישור ייפתח

📄 ${bank}:
${bankLink}

💼 *זה הכרטיס ביקור שלי:*
${advisorData.card}

📤 אנא שלח את דוח היתרות לטלפון הזה.

${notes ? `📝 הערה:\n${notes}\n\n` : ''}לכל שאלה – אני כאן בשבילך!
*${advisor}* – יועץ משכנתאות
📞 *${advisorData.phone}*`;

    setMessage(msg);
  };

  const getWhatsappLink = () => {
    const formattedPhone = clientPhone.replace(/[^0-9]/g, '');
    if (!formattedPhone || !message) return '#';
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
<div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-xl space-y-4" dir="rtl">
  <h2 className="text-2xl font-bold text-center text-gray-800">מחולל הודעת וואטסאפ</h2>

  {/* יועץ + טלפון */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-right font-medium text-gray-700">בחר יועץ:</label>
      <select
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:bg-orange-100"
        value={advisor}
        onChange={(e) => setAdvisor(e.target.value as keyof typeof advisors)}
      >
        {Object.keys(advisors).map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="block text-right font-medium text-gray-700">טלפון של הלקוח:</label>
      <input
        type="tel"
        placeholder="לדוגמה: 0521234567"
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:bg-orange-100"
        value={clientPhone}
        onChange={(e) => setClientPhone(e.target.value)}
      />
    </div>
  </div>

  {/* שם + בנק */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-right font-medium text-gray-700">שם הלקוח:</label>
      <input
        type="text"
        placeholder="לדוגמה: יוסי לוי"
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:bg-orange-100"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>

    <div>
      <label className="block text-right font-medium text-gray-700">בחר בנק:</label>
      <select
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:bg-orange-100"
        value={bank}
        onChange={(e) => setBank(e.target.value)}
      >
        {Object.keys(bankLinksByAdvisor[advisor]).map((bankName) => (
          <option key={bankName} value={bankName}>{bankName}</option>
        ))}
      </select>
    </div>
  </div>

  {/* הערה חופשית */}
  <div>
    <label className="block text-right font-medium text-gray-700">הערה חופשית (אופציונלי):</label>
    <textarea
      placeholder="לדוגמה: תוודא שהמסמך ברור ומעודכן"
      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400 focus:bg-orange-100"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      rows={3}
    />
  </div>

  {/* כפתור יצירת הודעה */}
  <button
    onClick={generateMessage}
    className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600"
  >
    צור הודעה
  </button>

  {/* תצוגת הודעה */}
  <textarea
    readOnly
    value={message}
    rows={10}
    className="w-full p-3 border bg-gray-50 text-sm font-mono rounded-md"
  />

  {/* כפתורי העתק/שלח */}
  {message && (
    <div className="flex flex-col gap-2 md:flex-row md:justify-between">
      <button
        onClick={() => navigator.clipboard.writeText(message)}
        className="w-full md:w-[48%] bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
      >
        העתק ללוח 📋
      </button>

      <a
        href={getWhatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full md:w-[48%] bg-[#25D366] text-white text-center py-2 rounded-md hover:bg-[#1ebe5b]"
      >
        שלח בוואטסאפ 📲
      </a>
    </div>
  )}
</div>

  );
}
















// 'use client';

// import { useState } from 'react';

// const advisors = {
//   'גיא כהן': {
//     phone: '0523684844',
//     card: 'https://morg-orcin.vercel.app/card',
//   },
//   'משה מוסיוב': {
//     phone: '0502453345',
//     card: 'https://morg-orcin.vercel.app/card_m', // שנה לפי הקישור האמיתי
//   },
// };

// const bankLinks: Record<string, string> = {
//   "דיסקונט": "https://morg-orcin.vercel.app/muhni/bb/discount",
//   "הפועלים": "https://morg-orcin.vercel.app/muhni/bb/hapoalim",
//   "מזרחי טפחות": "https://morg-orcin.vercel.app/muhni/bb/mizrachi",
//   "לאומי": "https://morg-orcin.vercel.app/muhni/bb/leumi",

// };

// export default function WhatsappMessageGenerator() {
//   const [name, setName] = useState('');
//   const [bank, setBank] = useState('מזרחי טפחות');
//   const [advisor, setAdvisor] = useState<keyof typeof advisors>('גיא כהן');
//   const [clientPhone, setClientPhone] = useState('');
//   const [message, setMessage] = useState('');

//   const generateMessage = () => {
//     const clientName = name.trim() || 'לקוח יקר';
//     const bankLink = bankLinks[bank] || '';
//     const advisorData = advisors[advisor];

//     const msg = `היי ${clientName} 👋

// בהמשך לשיחתנו, מצרף לך קישור ל-*מדריך להוצאת דוח יתרות לסילוק*:

// 📄 ${bank}:
// ${bankLink}

// 💼 *זה הכרטיס ביקור שלי:*
// ${advisorData.card}

// 📤 אנא שלח את דוח היתרות לטלפון הזה.

// לכל שאלה – אני כאן בשבילך!
// *${advisor}* – יועץ משכנתאות
// 📞 *${advisorData.phone}*`;

//     setMessage(msg);
//   };

//   const getWhatsappLink = () => {
//     const formattedPhone = clientPhone.replace(/[^0-9]/g, '');
//     if (!formattedPhone || !message) return '#';
//     return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
//   };

//   return (
//     <div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-xl space-y-4">
//       <h2 className="text-2xl font-bold text-center text-gray-800">מחולל הודעת וואטסאפ</h2>

//       <label className="block text-right font-medium text-gray-700">בחר יועץ:</label>
//       <select
//         className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400"
//         value={advisor}
//         onChange={(e) => setAdvisor(e.target.value as keyof typeof advisors)}
//       >
//         {Object.keys(advisors).map((name) => (
//           <option key={name} value={name}>{name}</option>
//         ))}
//       </select>

//       <label className="block text-right font-medium text-gray-700">שם הלקוח:</label>
//       <input
//         type="text"
//         placeholder="לדוגמה: יוסי לוי"
//         className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400"
//         value={name}
//         onChange={(e) => setName(e.target.value)}
//       />

//       <label className="block text-right font-medium text-gray-700">בחר בנק:</label>
//       <select
//         className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400"
//         value={bank}
//         onChange={(e) => setBank(e.target.value)}
//       >
//         {Object.keys(bankLinks).map((bankName) => (
//           <option key={bankName} value={bankName}>{bankName}</option>
//         ))}
//       </select>

//       <label className="block text-right font-medium text-gray-700">טלפון של הלקוח:</label>
//       <input
//         type="tel"
//         placeholder="לדוגמה: 0521234567"
//         className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-400"
//         value={clientPhone}
//         onChange={(e) => setClientPhone(e.target.value)}
//       />

//       <button
//         onClick={generateMessage}
//         className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600"
//       >
//         צור הודעה
//       </button>

//       <textarea
//         readOnly
//         value={message}
//         rows={10}
//         className="w-full p-3 border bg-gray-50 text-sm font-mono rounded-md"
//       />

//       {message && (
//         <div className="flex flex-col gap-2 md:flex-row md:justify-between">
//           <button
//             onClick={() => navigator.clipboard.writeText(message)}
//             className="w-full md:w-[48%] bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
//           >
//             העתק ללוח 📋
//           </button>

//           <a
//             href={getWhatsappLink()}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="w-full md:w-[48%] bg-[#25D366] text-white text-center py-2 rounded-md hover:bg-[#1ebe5b]"
//           >
//             שלח בוואטסאפ 📲
//           </a>
//         </div>
//       )}
//     </div>
//   );
// }


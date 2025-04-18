'use client';
import { useState } from 'react';

function formatWithCommas(value: string): string {
  const numeric = value.replace(/[^\d]/g, '');
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function extractNumeric(value: string): number {
  const cleaned = value.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

export default function FormWithMixedFields() {
  const [formData, setFormData] = useState({
    amount1: 0,
    amount2: 0,
    name: '',
    agreeToTerms: false,
  });

  const [displayData, setDisplayData] = useState({
    amount1: '',
    amount2: '',
  });

  const handleChangeWithCommas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = formatWithCommas(value);
    const numeric = extractNumeric(formatted);

    setDisplayData(prev => ({ ...prev, [name]: formatted }));
    setFormData(prev => ({ ...prev, [name]: numeric }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('✅ formData:', formData);
    console.log('💬 displayData:', displayData);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 shadow rounded" dir="rtl">
        <div>
          <label className="block mb-1">סכום 1 (עם מפריד)</label>
          <input
            type="text"
            name="amount1"
            value={displayData.amount1}
            onChange={handleChangeWithCommas}
            className="w-full border px-3 py-2 rounded text-right"
          />
        </div>

        <div>
          <label className="block mb-1">סכום 2 (עם מפריד)</label>
          <input
            type="text"
            name="amount2"
            value={displayData.amount2}
            onChange={handleChangeWithCommas}
            className="w-full border px-3 py-2 rounded text-right"
          />
        </div>

        <div>
          <label className="block mb-1">שם מלא</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded text-right"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            className="w-5 h-5"
          />
          <label htmlFor="agreeToTerms">מאשר את התנאים</label>
        </div>

        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          שלח
        </button>
      </form>

      <div className="mt-6">
        <h3 className="font-bold">✅ formData:</h3>
        <pre>{JSON.stringify(formData, null, 2)}</pre>

        <h3 className="font-bold mt-4">💬 displayData:</h3>
        <pre>{JSON.stringify(displayData, null, 2)}</pre>
      </div>
    </div>
  );
}



// 'use client';
// import { useState } from 'react';

// function formatWithCommas(num: number | string) {
//   const numeric = typeof num === 'number' ? num.toString() : num.replace(/[^\d]/g, '');
//   return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// }

// function extractNumeric(value: string): number {
//   const cleaned = value.replace(/,/g, '');
//   return parseFloat(cleaned) || 0;
// }

// export default function NumberForm() {
//   const [formData, setFormData] = useState({
//     amount1: 0,
//     amount2: 0,
//   });

//   const [displayData, setDisplayData] = useState({
//     amount1: '',
//     amount2: '',
//   });

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     const numericValue = extractNumeric(value);

//     setFormData(prev => ({ ...prev, [name]: numericValue }));
//     setDisplayData(prev => ({ ...prev, [name]: formatWithCommas(value) }));
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     console.log('נתונים אמיתיים לשליחה:', formData);
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white shadow rounded space-y-4" dir="rtl">
//       <div>
//         <label className="block mb-1">סכום 1</label>
//         <input
//           type="text"
//           name="amount1"
//           value={displayData.amount1}
//           onChange={handleChange}
//           className="w-full border border-gray-300 rounded px-3 py-2 text-right"
//           inputMode="numeric"
//         />
//       </div>

//       <div>
//         <label className="block mb-1">סכום 2</label>
//         <input
//           type="text"
//           name="amount2"
//           value={displayData.amount2}
//           onChange={handleChange}
//           className="w-full border border-gray-300 rounded px-3 py-2 text-right"
//           inputMode="numeric"
//         />
//       </div>

//       <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
//         שלח
//       </button>
//     </form>
//   );
// }

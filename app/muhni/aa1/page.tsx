'use client';

import { useEffect, useRef, useState } from 'react';

type Rate = {
  key: string;
  currentExchangeRate: number;
  currentChange: number;
  unit: number;
};

type InterestData = {
  interest: number;
  prime: number;
  nextDate: string;
};


const getCountryCode = (currencyCode: string) => {
  const map: Record<string, string> = {
    USD: 'us', EUR: 'eu', GBP: 'gb', JPY: 'jp', AUD: 'au', CAD: 'ca', CHF: 'ch',
    DKK: 'dk', NOK: 'no', SEK: 'se', ZAR: 'za', JOD: 'jo', LBP: 'lb', EGP: 'eg',
  };
  return map[currencyCode] || 'un';
};

export default function CurrencyTicker() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [interestData, setInterestData] = useState<InterestData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number | null>(null);

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/exchange-rates');
      const data = await res.json();
      if (Array.isArray(data) && data.every(item =>
        'key' in item && 'currentExchangeRate' in item &&
        'currentChange' in item && 'unit' in item)) {
        setRates(data);
      } else {
        setRates([]);
      }
    } catch (error) {
      console.error('שגיאה בשליפת נתוני מטבע:', error);
      setRates([]);
    }
  };

  const fetchInterest = async () => {
    try {
      const res = await fetch('/api/interest');
      const data = await res.json();
      console.log('נתוני ריבית:', data);
  
      if ('interest' in data && 'prime' in data && 'nextDate' in data) {
        setInterestData(data);
      } else {
        console.warn('מבנה לא תקין:', data);
      }
    } catch (error) {
      console.error('שגיאה בשליפת ריבית:', error);
    }
  };
  

  useEffect(() => {
    fetchRates();
    fetchInterest();
    const interval = setInterval(fetchRates, 1000 * 60 * 10); // כל 10 דקות
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (rates.length === 0) return;
    const speed = 0.5;
    const scroll = () => {
      if (containerRef.current && contentRef.current) {
        const container = containerRef.current;
        const content = contentRef.current;
        container.scrollLeft += speed;
        if (container.scrollLeft >= content.scrollWidth / 2) {
          container.scrollLeft = 0;
        }
      }
      animationIdRef.current = requestAnimationFrame(scroll);
    };
    animationIdRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [rates]);

  const handleMouseEnter = () => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
  };

  const handleMouseLeave = () => {
    animationIdRef.current = requestAnimationFrame(() => {
      const speed = 0.5;
      const scroll = () => {
        if (containerRef.current && contentRef.current) {
          const container = containerRef.current;
          const content = contentRef.current;
          container.scrollLeft += speed;
          if (container.scrollLeft >= content.scrollWidth / 2) {
            container.scrollLeft = 0;
          }
        }
        animationIdRef.current = requestAnimationFrame(scroll);
      };
      scroll();
    });
  };

  if (rates.length === 0) return null;

  const tickerItems = rates.map((rate) => (
    <div key={rate.key} className="flex items-center gap-0.5 text-sm px-6 py-2 min-w-fit whitespace-nowrap">


      <img
        src={`https://flagcdn.com/w40/${getCountryCode(rate.key)}.png`}
        srcSet={`https://flagcdn.com/w40/${getCountryCode(rate.key)}.png 1x, https://flagcdn.com/w80/${getCountryCode(rate.key)}.png 2x`}
        alt={rate.key}
        className="w-5 h-4 rounded-sm border"
      />
      <span className="font-semibold">{rate.key}</span>
      <span className="text-gray-700">₪{rate.currentExchangeRate.toFixed(4)}</span>
      <span className={`font-bold ${rate.currentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {rate.currentChange >= 0 ? '▲' : '▼'} {rate.currentChange.toFixed(2)}%
      </span>
    </div>
  ));


  return (
    <div className="overflow-hidden bg-white border-y border-gray-300 flex w-full flex-col md:flex-row">
      {/* מטבעות - רק במסכים בינוניים ומעלה */}
      <div
        ref={containerRef}
        className="hidden md:flex w-full md:w-[60%] whitespace-nowrap overflow-hidden"
        style={{ direction: 'ltr' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div ref={contentRef} className="flex">
          {tickerItems}
          {tickerItems}
        </div>
      </div>
  
     {/* נתוני ריבית - תמיד מוצג */}
        <div className="w-full md:w-[40%] bg-gray-50 flex items-center px-0 text-right">
          <div className="w-full text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis p-2">
            {interestData ? (
              <div className="flex gap-4 w-full justify-start md:justify-start">
                <div className="text-right">ריבית בנק ישראל: <span className="font-bold">{interestData.interest.toFixed(2)}%</span></div>
                <div className="text-right">פריים: <span className="font-bold">{interestData.prime.toFixed(2)}%</span></div>
                <div className="text-right">עדכון הבא: <span className="font-medium">{new Date(interestData.nextDate).toLocaleDateString('he-IL')}</span></div>
              </div>
            ) : (
              <div className="text-gray-400">טוען נתוני ריבית...</div>
            )}
          </div>
        </div>


    </div>
  );
  
  
}































// 'use client';

// import { useEffect, useRef, useState } from 'react';

// type Rate = {
//   key: string;
//   currentExchangeRate: number;
//   currentChange: number;
//   unit: number;
// };

// const getCountryCode = (currencyCode: string) => {
//   const map: Record<string, string> = {
//     USD: 'us', EUR: 'eu', GBP: 'gb', JPY: 'jp', AUD: 'au', CAD: 'ca', CHF: 'ch',
//     DKK: 'dk', NOK: 'no', SEK: 'se', ZAR: 'za', JOD: 'jo', LBP: 'lb', EGP: 'eg',
//   };
//   return map[currencyCode] || 'un';
// };

// export default function CurrencyTicker() {
//   const [rates, setRates] = useState<Rate[]>([]);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const contentRef = useRef<HTMLDivElement>(null);
//   const animationIdRef = useRef<number | null>(null);

//   const fetchRates = async () => {
//     try {
//       const res = await fetch('/api/exchange-rates');
//       const data = await res.json();

//       if (Array.isArray(data) && data.every(item =>
//         'key' in item &&
//         'currentExchangeRate' in item &&
//         'currentChange' in item &&
//         'unit' in item
//       )) {
//         setRates(data);
//       } else {
//         setRates([]);
//       }
//     } catch (error) {
//       console.error('שגיאה בשליפת נתוני מטבע:', error);
//       setRates([]);
//     }
//   };

//   useEffect(() => {
//     fetchRates();
//     const interval = setInterval(fetchRates, 1000 * 60 * 10);
//     return () => clearInterval(interval);
//   }, []);

//   useEffect(() => {
//     if (rates.length === 0) return;

//     const speed = 0.5;
//     const scroll = () => {
//       if (containerRef.current && contentRef.current) {
//         const container = containerRef.current;
//         const content = contentRef.current;

//         container.scrollLeft += speed;
//         if (container.scrollLeft >= content.scrollWidth / 2) {
//           container.scrollLeft = 0;
//         }
//       }
//       animationIdRef.current = requestAnimationFrame(scroll);
//     };

//     animationIdRef.current = requestAnimationFrame(scroll);

//     return () => {
//       if (animationIdRef.current) {
//         cancelAnimationFrame(animationIdRef.current);
//       }
//     };
//   }, [rates]);

//   const handleMouseEnter = () => {
//     if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
//   };

//   const handleMouseLeave = () => {
//     animationIdRef.current = requestAnimationFrame(() => {
//       const speed = 0.5;
//       const scroll = () => {
//         if (containerRef.current && contentRef.current) {
//           const container = containerRef.current;
//           const content = contentRef.current;

//           container.scrollLeft += speed;
//           if (container.scrollLeft >= content.scrollWidth / 2) {
//             container.scrollLeft = 0;
//           }
//         }
//         animationIdRef.current = requestAnimationFrame(scroll);
//       };
//       scroll();
//     });
//   };

//   if (rates.length === 0) return null;

//   const tickerItems = rates.map((rate) => (
//     <div key={rate.key} className="flex items-center gap-2 text-sm px-6 py-2 min-w-fit whitespace-nowrap">
//       <img
//         src={`https://flagcdn.com/w40/${getCountryCode(rate.key)}.png`}
//         srcSet={`https://flagcdn.com/w40/${getCountryCode(rate.key)}.png 1x, https://flagcdn.com/w80/${getCountryCode(rate.key)}.png 2x`}
//         alt={rate.key}
//         className="w-5 h-4 rounded-sm border"
//       />
//       <span className="font-semibold">{rate.key}</span>
//       <span className="text-gray-700">₪{rate.currentExchangeRate.toFixed(4)}</span>
//       <span className={`font-bold ${rate.currentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
//         {rate.currentChange >= 0 ? '▲' : '▼'} {rate.currentChange.toFixed(2)}%
//       </span>
//     </div>
//   ));

//   return (
//     <div className="hidden md:grid grid-cols-10 border-y border-gray-300 bg-white">
//       {/* אזור ה־Ticker: 7 מתוך 10 עמודות (70%) */}
//       <div className="col-span-7 overflow-hidden" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
//         <div
//           ref={containerRef}
//           className="flex whitespace-nowrap overflow-hidden w-full"
//           style={{ direction: 'ltr' }}
//         >
//           <div ref={contentRef} className="flex">
//             {tickerItems}
//             {tickerItems}
//           </div>
//         </div>
//       </div>

//       {/* אזור הריק (30%) */}
//       <div className="col-span-3 border-l border-gray-200">
//         {/* כאן אפשר להכניס תוכן בעתיד */}
//       </div>
//     </div>
//   );
// }























// 'use client';

// import { useEffect, useRef, useState } from 'react';

// type Rate = {
//   key: string;
//   currentExchangeRate: number;
//   currentChange: number;
//   unit: number;
// };

// const getCountryCode = (currencyCode: string) => {
//   const map: Record<string, string> = {
//     USD: 'us', EUR: 'eu', GBP: 'gb', JPY: 'jp', AUD: 'au', CAD: 'ca', CHF: 'ch',
//     DKK: 'dk', NOK: 'no', SEK: 'se', ZAR: 'za', JOD: 'jo', LBP: 'lb', EGP: 'eg',
//   };
//   return map[currencyCode] || 'un';
// };

// export default function CurrencyTicker() {
//   const [rates, setRates] = useState<Rate[]>([]);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const contentRef = useRef<HTMLDivElement>(null);
//   const animationIdRef = useRef<number | null>(null);

//   const fetchRates = async () => {
//     try {
//       const res = await fetch('/api/exchange-rates');
//       const data = await res.json();

//       if (Array.isArray(data) && data.every(item =>
//         'key' in item &&
//         'currentExchangeRate' in item &&
//         'currentChange' in item &&
//         'unit' in item
//       )) {
//         setRates(data);
//       } else {
//         setRates([]);
//       }
//     } catch (error) {
//       console.error('שגיאה בשליפת נתוני מטבע:', error);
//       setRates([]);
//     }
//   };

//   useEffect(() => {
//     fetchRates();
//     const interval = setInterval(fetchRates, 1000 * 60 * 10); // כל 10 דקות
//     return () => clearInterval(interval);
//   }, []);

//   useEffect(() => {
//     if (rates.length === 0) return;

//     const speed = 0.5;
//     const scroll = () => {
//       if (containerRef.current && contentRef.current) {
//         const container = containerRef.current;
//         const content = contentRef.current;

//         container.scrollLeft += speed;
//         if (container.scrollLeft >= content.scrollWidth / 2) {
//           container.scrollLeft = 0;
//         }
//       }
//       animationIdRef.current = requestAnimationFrame(scroll);
//     };

//     animationIdRef.current = requestAnimationFrame(scroll);

//     return () => {
//       if (animationIdRef.current) {
//         cancelAnimationFrame(animationIdRef.current);
//       }
//     };
//   }, [rates]);

//   const handleMouseEnter = () => {
//     if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
//   };

//   const handleMouseLeave = () => {
//     animationIdRef.current = requestAnimationFrame(() => {
//       const speed = 0.5;
//       const scroll = () => {
//         if (containerRef.current && contentRef.current) {
//           const container = containerRef.current;
//           const content = contentRef.current;

//           container.scrollLeft += speed;
//           if (container.scrollLeft >= content.scrollWidth / 2) {
//             container.scrollLeft = 0;
//           }
//         }
//         animationIdRef.current = requestAnimationFrame(scroll);
//       };
//       scroll();
//     });
//   };

//   if (rates.length === 0) return null;

//   const tickerItems = rates.map((rate) => (
//     <div key={rate.key} className="flex items-center gap-2 text-sm px-6 py-2 min-w-fit whitespace-nowrap">
//       <img
//         src={`https://flagcdn.com/w40/${getCountryCode(rate.key)}.png`}
//         srcSet={`https://flagcdn.com/w40/${getCountryCode(rate.key)}.png 1x, https://flagcdn.com/w80/${getCountryCode(rate.key)}.png 2x`}
//         alt={rate.key}
//         className="w-5 h-4 rounded-sm border"
//       />
//       <span className="font-semibold">{rate.key}</span>
//       <span className="text-gray-700">₪{rate.currentExchangeRate.toFixed(4)}</span>
//       <span className={`font-bold ${rate.currentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
//         {rate.currentChange >= 0 ? '▲' : '▼'} {rate.currentChange.toFixed(2)}%
//       </span>
//     </div>
//   ));

//   return (
//     <div className="overflow-hidden bg-white border-y border-gray-300">
//       <div
//         ref={containerRef}
//         className="flex whitespace-nowrap overflow-hidden w-full"
//         style={{ direction: 'ltr' }}
//         onMouseEnter={handleMouseEnter}
//         onMouseLeave={handleMouseLeave}
//       >
//         <div ref={contentRef} className="flex">
//           {tickerItems}
//           {tickerItems}
//         </div>
//       </div>
//     </div>
//   );
// }

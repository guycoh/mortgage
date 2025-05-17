'use client';

import { useEffect, useRef, useState } from 'react';

type Rate = {
  key: string;
  currentExchangeRate: number;
  currentChange: number;
  unit: number;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/exchange-rates');
        const data = await res.json();
        if (Array.isArray(data)) {
          setRates(data);
        } else {
          setRates([]);
        }
      } catch (error) {
        console.error('שגיאה בשליפת נתונים:', error);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 1000 * 60 * 10);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const speed = 0.5; // px per frame

    const scroll = () => {
      if (containerRef.current && contentRef.current) {
        const container = containerRef.current;
        const content = contentRef.current;

        if (content.offsetWidth <= 0) return;

        container.scrollLeft += speed;

        if (container.scrollLeft >= content.scrollWidth / 2) {
          container.scrollLeft = 0;
        }
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [rates]);

  const tickerItems = rates.map((rate, idx) => (
    <div key={idx} className="flex items-center gap-2 text-sm px-6 py-2 min-w-fit whitespace-nowrap">
      <img
        src={`https://flagcdn.com/h20/${getCountryCode(rate.key)}.png`}
        alt={rate.key}
        className="w-5 h-4 rounded-sm border"
      />
      <span className="font-semibold">{rate.key}</span>
      <span className="text-gray-700">₪{rate.currentExchangeRate.toFixed(4)}</span>
      <span className={`font-bold ${rate.currentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {rate.currentChange >= 0 ? '▲' : '▼'} {(rate.currentChange).toFixed(2)}%
      </span>
    </div>
  ));

  return (
    <div className="overflow-hidden bg-white border-y border-gray-300">
      <div
        ref={containerRef}
        className="flex whitespace-nowrap overflow-hidden w-full"
        style={{ direction: 'ltr' }}
      >
        <div ref={contentRef} className="flex">
          {tickerItems}
          {tickerItems}
        </div>
      </div>
    </div>
  );
}

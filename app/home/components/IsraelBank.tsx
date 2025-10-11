'use client'

import { useEffect, useState } from 'react';

type InterestData = {
  interest: number;
  prime: number;
  nextDate: string;
};

export default function IsraelInterest() {
  const [interestData, setInterestData] = useState<InterestData | null>(null);

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

  // ✅ כאן נוסף useEffect
  useEffect(() => {
    fetchInterest();
  }, []);

  return (
    <>
      {/* נתוני ריבית - תמיד מוצג */}
      <div className="w-full md:w-[40%] flex items-center px-0 text-right">
        <div className="w-full text-sm text-white whitespace-nowrap overflow-hidden text-ellipsis p-2">
          {interestData ? (
            <div className="flex gap-4 w-full justify-start md:justify-start">
              <div className="text-right">
                ריבית בנק ישראל:{' '}
                <span className="font-bold">{interestData.interest.toFixed(2)}%</span>
              </div>
              <div className="text-right">
                פריים:{' '}
                <span className="font-bold">{interestData.prime.toFixed(2)}%</span>
              </div>
              <div className="text-right">
                עדכון הבא:{' '}
                <span className="font-medium">
                  {new Date(interestData.nextDate).toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">טוען נתוני ריבית...</div>
          )}
        </div>
      </div>
    </>
  );
}

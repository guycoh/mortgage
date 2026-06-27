'use client';

import React, { useState, useEffect } from 'react';
import { Percent, Layers, Home, Landmark, Calculator, Info, TrendingUp, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface DetailedRate {
  displayDate: string;
  klac: number;
  prime: number;
  mish5_cz: number;
  mish5_lo_cz: number;
  avgLifeYears: number;
}

interface MarketSegment {
  displayDate: string;
  totalVolume: number; // במיליארדים
  totalCount: number;  // מספר תיקים
  avgLoanSize: number; // משכנתא ממוצעת בש"ח
  firstHomePct: number;
  moversPct: number;
  investorsPct: number;
}

export default function AdvancedBoiDashboard() {
  const [activeTab, setActiveTab] = useState<'rates' | 'market'>('rates');
  const [ratesData, setRatesData] = useState<DetailedRate[]>([]);
  const [marketData, setMarketData] = useState<MarketSegment[]>([]);
  const [loading, setLoading] = useState(true);

  // סימולטור השוואה מתקדם לפי מסלול נבחר
  const [selectedTrack, setSelectedTrack] = useState<'klac' | 'mish5_lo_cz' | 'mish5_cz'>('klac');
  const [inputRate, setInputRate] = useState('');
  const [calcResult, setCalcResult] = useState<{ status: 'good' | 'avg' | 'bad'; text: string; diff: number } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [resRates, resMarket] = await Promise.all([
          fetch('/api/boi-mortgage?type=rates'),
          fetch('/api/boi-mortgage?type=macro')
        ]);
        
        const dRates = await resRates.json();
        const dMarket = await resMarket.json();

        if (dRates.success && dMarket.success) {
          setRatesData(dRates.data);
          setMarketData(dMarket.data);
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const runComparison = (rateVal: string, track: typeof selectedTrack) => {
    setInputRate(rateVal);
    if (!rateVal || ratesData.length === 0) {
      setCalcResult(null);
      return;
    }
    const userNum = parseFloat(rateVal);
    if (isNaN(userNum)) return;

    const currentMarketAvg = ratesData[0][track];
    const diff = userNum - currentMarketAvg;

    if (diff <= -0.15) {
      setCalcResult({ status: 'good', diff, text: `מעולה! ההצעה שלך נמוכה ב-${Math.abs(diff).toFixed(2)}% מהממוצע הנוכחי בשוק בקטגוריה זו.` });
    } else if (diff > -0.15 && diff <= 0.15) {
      setCalcResult({ status: 'avg', diff, text: `ההצעה שלך תואמת את ממוצע השוק (פער של ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%). מחיר הגיוני ותקני.` });
    } else {
      setCalcResult({ status: 'bad', diff, text: `שים לב: הריבית הזו גבוהה ב-${diff.toFixed(2)}% מממוצע הבנקים! יש פה מקום משמעותי למשא ומתן.` });
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-white rounded-3xl dir-rtl">
        <p className="text-gray-500 animate-pulse font-bold">טוען נתונים אנליטיים מבנק ישראל...</p>
      </div>
    );
  }

  const latestRate = ratesData[0];
  const latestMarket = marketData[0];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 bg-slate-50 rounded-3xl shadow-sm dir-rtl font-sans my-6">
      
      {/* כותרת פרימיום */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-gray-800">מערכת ניתוח שוק המשכנתאות הרשמית</h2>
          <p className="text-xs text-gray-500 mt-1">עדכון אחרון מנתוני הפיקוח על הבנקים: <span className="font-bold text-gray-700">{latestRate?.displayDate}</span></p>
        </div>
        
        {/* טאבים להחלפת תצוגה */}
        <div className="flex bg-gray-200 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('rates')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'rates' ? 'bg-white text-[#1d75a1] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Percent className="h-4 w-4" /> ריביות לפי מסלולים
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'market' ? 'bg-white text-[#1d75a1] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Layers className="h-4 w-4" /> כמויות ונפח שוק
          </button>
        </div>
      </div>

      {/* תוכן טאב 1: ריביות ומסלולים */}
      {activeTab === 'rates' && latestRate && (
        <div>
          {/* גריד 4 מסלולים מובילים */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-xxs font-bold text-gray-400 block mb-1">קבועה לא צמודה (קל"צ)</span>
              <div className="text-2xl font-black text-gray-800">{latestRate.klac.toFixed(2)}%</div>
              <div className="text-xxs text-gray-400 mt-2 bg-slate-50 p-1.5 rounded">הבסיס היציב ביותר בתמהיל</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-xxs font-bold text-indigo-400 block mb-1">משתנה כל 5 לא צמודה</span>
              <div className="text-2xl font-black text-indigo-600">{latestRate.mish5_lo_cz.toFixed(2)}%</div>
              <div className="text-xxs text-indigo-400 mt-2 bg-indigo-50/50 p-1.5 rounded">תחנת יציאה ללא קנסות מדד</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-xxs font-bold text-emerald-400 block mb-1">ריבית הפריים (PRIME)</span>
              <div className="text-2xl font-black text-emerald-600">{latestRate.prime.toFixed(2)}%</div>
              <div className="text-xxs text-emerald-400 mt-2 bg-emerald-50/50 p-1.5 rounded">מושפעת ישירות מנגיד בנק ישראל</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <span className="text-xxs font-bold text-amber-400 block mb-1">משתנה כל 5 צמודה (קצ"מ)</span>
              <div className="text-2xl font-black text-amber-600">{latestRate.mish5_cz.toFixed(2)}%</div>
              <div className="text-xxs text-amber-400 mt-2 bg-amber-50/50 p-1.5 rounded">סכנת התייקרות בעליית האינפלציה</div>
            </div>
          </div>

          {/* סימולטור השוואה רב-מסלולי */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 mb-6 shadow-xs">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base"><Calculator className="h-5 w-5 text-[#1d75a1]" /> בודק הצעות מחיר מול ריביות השוק בזמן אמת</h3>
            <p className="text-xs text-gray-400 mt-1">בחר את המסלול שקיבלת מהבנק, הזן את הריבית המוצעת וראה את איכות הבקשה.</p>
            
            <div className="mt-5 flex flex-wrap gap-2">
              {(['klac', 'mish5_lo_cz', 'mish5_cz'] as const).map((track) => (
                <button
                  key={track}
                  onClick={() => { setSelectedTrack(track); setInputRate(''); setCalcResult(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedTrack === track ? 'bg-[#1d75a1] text-white border-[#1d75a1]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                >
                  {track === 'klac' && 'קל"צ (קבועה לא צמודה)'}
                  {track === 'mish5_lo_cz' && 'משתנה כל 5 לא צמודה'}
                  {track === 'mish5_cz' && 'משתנה כל 5 צמודה'}
                </button>
              ))}
            </div>

            <div className="mt-4 max-w-xs relative">
              <input
                type="number" step="0.01" placeholder="הזן ריבית באחוזים, לדוגמה: 4.80"
                value={inputRate} onChange={(e) => runComparison(e.target.value, selectedTrack)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-gray-800 text-left dir-ltr focus:outline-none focus:border-[#1d75a1]"
              />
              <span className="absolute left-4 top-2.5 font-bold text-gray-400">%</span>
            </div>

            {calcResult && (
              <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${calcResult.status === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : calcResult.status === 'avg' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                <div className="mt-0.5">{calcResult.status === 'good' ? <CheckCircle className="h-5 w-5" /> : calcResult.status === 'avg' ? <HelpCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}</div>
                <div>
                  <p className="font-bold text-sm">פער מול הממוצע: {calcResult.diff > 0 ? '+' : ''}{calcResult.diff.toFixed(2)}%</p>
                  <p className="text-xs mt-1 leading-relaxed">{calcResult.text}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* תוכן טאב 2: כמויות ונפחי שוק (הדברים הכי מעניינים) */}
      {activeTab === 'market' && latestMarket && (
        <div>
          {/* כרטיסי KPI פילוח שוק */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-[#1d75a1] rounded-xl"><TrendingUp className="h-6 w-6" /></div>
              <div>
                <span className="text-xxs font-bold text-gray-400 uppercase">נפח שוק חודשי</span>
                <p className="text-xl font-black text-gray-800">{latestMarket.totalVolume} מיליארד ש"ח</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Landmark className="h-6 w-6" /></div>
              <div>
                <span className="text-xxs font-bold text-gray-400 uppercase">כמות תיקי משכנתא</span>
                <p className="text-xl font-black text-gray-800">{latestMarket.totalCount.toLocaleString()} חוזים שנחתמו</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Home className="h-6 w-6" /></div>
              <div>
                <span className="text-xxs font-bold text-gray-400 uppercase">גודל משכנתא ממוצעת</span>
                <p className="text-xl font-black text-emerald-600">{latestMarket.avgLoanSize.toLocaleString()} ש"ח</p>
              </div>
            </div>
          </div>

          {/* פילוח סוגי קונים */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 mb-6">
            <h3 className="font-bold text-gray-800 text-sm mb-4">חלוקת עוגת המשכנתאות לפי פרופיל רוכש</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">זוגות צעירים ורוכשי דירה ראשונה</span>
                  <span className="text-[#1d75a1]">{latestMarket.firstHomePct}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1d75a1] h-full" style={{ width: `${latestMarket.firstHomePct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">משפרי דיור (מוכרים וקונים נכס גדול יותר)</span>
                  <span className="text-indigo-600">{latestMarket.moversPct}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full" style={{ width: `${latestMarket.moversPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">משקיעי נדל"ן (דירה שנייה ומעלה)</span>
                  <span className="text-amber-500">{latestMarket.investorsPct}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${latestMarket.investorsPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* טבלה היסטורית משותפת בתחתית הדף */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs">
        <h3 className="font-bold text-gray-800 text-sm mb-4">מגמות חודשיות לאורך זמן (היסטוריית בנק ישראל)</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-50">
          <table className="min-w-full text-right text-xs">
            <thead className="bg-slate-50 font-bold text-gray-500">
              <tr>
                <th className="px-4 py-2.5">חודש</th>
                <th className="px-4 py-2.5">נפח (מיליארד ש"ח)</th>
                <th className="px-4 py-2.5">תיקים שנפתחו</th>
                <th className="px-4 py-2.5">משכנתא ממוצעת</th>
                <th className="px-4 py-2.5">ריבית קל"צ ממוצעת</th>
                <th className="px-4 py-2.5">ריבית פריים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {marketData.map((row, idx) => {
                const rateRow = ratesData[idx] || latestRate;
                return (
                  <tr key={row.displayDate} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-gray-900 font-bold">{row.displayDate}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">{row.totalVolume.toFixed(1)}</td>
                    <td className="px-4 py-3">{row.totalCount.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono">{row.avgLoanSize.toLocaleString()} ₪</td>
                    <td className="px-4 py-3 text-[#1d75a1] font-bold">{rateRow?.klac?.toFixed(2)}%</td>
                    <td className="px-4 py-3">{rateRow?.prime?.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
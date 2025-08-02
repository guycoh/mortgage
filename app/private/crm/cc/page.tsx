// components/BankReport/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
//import type { LoanPart } from './types'
//import { parseByBank } from './parserIndex'
import type { LoanPart } from '../components/BankReport/types'
import { parseByBank } from '../components/BankReport/parserIndex' 


const SAMPLE_FALLBACK_PARTS: LoanPart[] = [
  {
    id: 1,
    name: 'ריבית קבועה צמודה למדד, שפיצר',
    loanType: 'קבועה',
    interestRate: 4.5,
    adjustedInterestRate: 4.3,
    averageInterestAtPayoff: 4.4,
    principalBalance: 1_200_000,
    monthlyCharge: 5_300,
  },
  {
    id: 2,
    name: 'ריבית משתנה לפי פריים',
    loanType: 'משתנה',
    interestRate: 3.9,
    principalBalance: 800_000,
    monthlyCharge: 4_200,
  },
  {
    id: 3,
    name: 'משולבת',
    loanType: 'משולבת',
    interestRate: 4.2,
    adjustedInterestRate: 4.1,
    principalBalance: 600_000,
    monthlyCharge: 3_100,
  },
]

const banks = [
  { code: '10', name: 'בנק לאומי' },
  { code: '12', name: 'בנק הפועלים' },
  { code: '20', name: 'בנק מזרחי טפחות' },
  { code: '31', name: 'בנק הבינלאומי' },
  { code: '46', name: 'בנק מרכנתיל' },
  { code: '52', name: 'בנק איגוד' },
]

export default function BankReportPage() {
  const [selectedBankCode, setSelectedBankCode] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loanParts, setLoanParts] = useState<LoanPart[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile)
    } else {
      alert('אנא העלה קובץ PDF בלבד')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected?.type === 'application/pdf') {
      setFile(selected)
    } else {
      alert('קובץ לא חוקי - יש להעלות רק PDF')
    }
  }

  const handleParse = async () => {
    if (!selectedBankCode) {
      alert('יש לבחור בנק')
      return
    }
    if (!file) {
      alert('אין קובץ')
      return
    }

    setIsParsing(true)
    setError(null)
    try {
      const parts: LoanPart[] = await parseByBank(selectedBankCode, file)
      if (!Array.isArray(parts) || parts.length === 0) {
        setError('ה-parser חזר ללא מסלולים; בדוק את הפורמט של הקובץ')
        setLoanParts([])
      } else {
        setLoanParts(parts)
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'שגיאה בפיענוח הדוח')
      setLoanParts([])
    } finally {
      setIsParsing(false)
    }
  }

  const loadFallback = () => {
    setLoanParts(SAMPLE_FALLBACK_PARTS)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow space-y-6">
        <h1 className="text-2xl font-bold">טעינת דוח בנק והצגת מסלולים</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              בחר בנק
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              onChange={(e) => setSelectedBankCode(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                -- בחר בנק --
              </option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              קובץ דוח PDF
            </label>
            <div
              className={`w-full border-2 border-dashed rounded-lg p-5 text-center transition-colors flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'bg-orange-100 border-orange-400'
                  : 'border-gray-300 bg-white'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{ minHeight: 140 }}
            >
              {file ? (
                <div className="flex flex-col items-center">
                  <p className="text-green-600 font-semibold">
                    ✔️ {file.name}
                  </p>
                  <button
                    onClick={() => setFile(null)}
                    className="text-xs underline mt-1"
                  >
                    הסר
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">
                  גרור ושחרר כאן PDF או לחץ לבחירה
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                >
                  בחר קובץ
                </button>
                <button
                  type="button"
                  onClick={loadFallback}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300 transition"
                >
                  טען דוח דמה
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-600 bg-red-100 p-2 rounded">{error}</div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <button
            className="flex-1 inline-flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold transition disabled:opacity-50"
            onClick={handleParse}
            disabled={isParsing || !selectedBankCode || !file}
          >
            {isParsing ? 'קורא...' : 'קלוט דוח'}
          </button>
          <div className="flex-1 text-sm text-gray-600 flex items-center">
            {selectedBankCode ? (
              <span>
                בנק נבחר:{' '}
                <span className="font-medium">
                  {banks.find((b) => b.code === selectedBankCode)?.name}
                </span>
              </span>
            ) : (
              <span className="italic">לא נבחר בנק</span>
            )}
          </div>
        </div>

        {loanParts.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">
              תוצאות פענוח מסלולים ({loanParts.length})
            </h2>
            <div className="space-y-5">
              {loanParts.map((part, idx) => (
                <div
                  key={
                    part.id >= 0 ? `loan-${part.id}` : `fallback-${idx}`
                  }
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-md mb-1">
                      מסלול {part.id >= 0 ? part.id : 'לא ידוע'} — {part.name}
                    </div>
                    <div className="text-sm">
                      סוג ריבית:{' '}
                      <span className="font-medium">
                        {part.loanType || 'לא ידוע'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1 text-right">
                    <div>
                      ריבית:{' '}
                      <span className="font-medium">
                        {part.interestRate?.toFixed(2)}%
                      </span>
                    </div>
                    {part.adjustedInterestRate !== undefined && (
                      <div>
                        ריבית מתואמת:{' '}
                        <span className="font-medium">
                          {part.adjustedInterestRate.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {part.averageInterestAtPayoff !== undefined && (
                      <div>
                        ריבית ממוצעת בסילוק:{' '}
                        <span className="font-medium">
                          {part.averageInterestAtPayoff.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex flex-col sm:flex-row gap-6 text-sm">
                      <div>
                        יתרת קרן:{' '}
                        <span className="font-medium">
                          {part.principalBalance
                            ? `₪${part.principalBalance.toLocaleString()}`
                            : '–'}
                        </span>
                      </div>
                      <div>
                        חיוב חודשי:{' '}
                        <span className="font-medium">
                          {part.monthlyCharge
                            ? `₪${part.monthlyCharge.toLocaleString()}`
                            : '–'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !isParsing && (
            <div className="mt-4 text-center text-gray-500">
              עדיין לא קיבלת פלט ממסלולים. בחר בנק, העלה PDF ולחץ על "קלוט
              דוח" או טען דוח דמה.
            </div>
          )
        )}
      </div>
    </div>
  )
}

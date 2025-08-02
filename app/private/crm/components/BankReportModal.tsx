'use client'

import { useRef, useState } from 'react'
import type { LoanPart } from './parsers/parseMizrahiReport'

const banks = [
  { code: '10', name: 'בנק לאומי' },
  { code: '12', name: 'בנק הפועלים' },
  { code: '20', name: 'בנק מזרחי טפחות' },
  { code: '31', name: 'בנק הבינלאומי' },
  { code: '46', name: 'בנק מרכנתיל' },
  { code: '52', name: 'בנק איגוד' },
]

export default function BankReportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [selectedBankCode, setSelectedBankCode] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loanParts, setLoanParts] = useState<LoanPart[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

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
    if (selectedBankCode === '20' && file) {
      const { parseMizrahiReport } = await import('./parsers/parseMizrahiReport')
      const parts = await parseMizrahiReport(file)
      console.log('תוצאה מזרחי:', parts)
      setLoanParts(parts)
    } else {
      alert('פורמט לבנק זה טרם נתמך')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-lg space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 left-3 text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-gray-800 text-center">טעינת דוח בנק</h2>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">בחר בנק</label>
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

        {selectedBankCode && (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? 'bg-orange-100 border-orange-400' : 'border-gray-300'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {file ? (
                <p className="text-green-600 font-semibold">✔️ {file.name}</p>
              ) : (
                <p className="text-gray-500">גרור ושחרר כאן קובץ PDF</p>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                בחר קובץ מהמחשב
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </>
        )}

        {file && (
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold transition"
            onClick={handleParse}
          >
            קלוט דוח
          </button>
        )}

        {/* הצגת תוצאה לדוגמה */}
        {loanParts.length > 0 && (
          <div className="mt-4 max-h-40 overflow-auto text-sm text-gray-700 bg-gray-100 p-2 rounded">
            {loanParts.map((part, idx) => (
              <div key={idx}>
                <strong>מסלול {part.id}:</strong> {part.type} — ₪{part.amount.toLocaleString()} — ריבית {part.interest}%
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

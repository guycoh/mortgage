"use client"
import { useState } from 'react'

type CostItem = {
  label: string
  percentage: number
  amount: number
}

const VAT_RATE = 18

const options = [
  'תיווך',
  'עורך דין',
  'מס רכישה',
  'יועץ משכנתא',
  'שמאי',
  'הובלות',
  'שיפוץ',
  'אחר',
]

export default function CostsCalculator() {
  const [propertyPrice, setPropertyPrice] = useState<number>(0)
  const [priceInput, setPriceInput] = useState<string>('')

  const [items, setItems] = useState<CostItem[]>([
    { label: 'עורך דין', percentage: 0.5, amount: 0 },
    { label: 'תיווך', percentage: 2, amount: 0 },
  ])

  const formatNumber = (num: number) =>
    num.toLocaleString('he-IL', { maximumFractionDigits: 0 })

  const parseNumber = (val: string) => Number(val.replace(/[^\d.]/g, ''))

  const handlePriceChange = (value: string) => {
    const numericValue = parseNumber(value)
    setPropertyPrice(numericValue)
    setPriceInput(formatNumber(numericValue))
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        amount: (item.percentage / 100) * numericValue,
      }))
    )
  }

  const handleItemChange = (
    index: number,
    field: keyof CostItem,
    value: string
  ) => {
    const newItems = [...items]
    if (field === 'percentage') {
      const perc = parseFloat(value) || 0
      newItems[index].percentage = perc
      newItems[index].amount = (perc / 100) * propertyPrice
    } else if (field === 'amount') {
      const amount = parseNumber(value)
      newItems[index].amount = amount
      newItems[index].percentage =
        propertyPrice > 0 ? (amount / propertyPrice) * 100 : 0
    } else {
      newItems[index][field] = value
    }
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { label: '', percentage: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  const totalCost = items.reduce((sum, item) => sum + item.amount, 0)
  const totalVat = items.reduce((sum, item) => {
    if (item.label === 'מס רכישה') return sum
    return sum + item.amount * (VAT_RATE / 100)
  }, 0)

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-100 to-purple-200 text-gray-700 flex justify-center items-start">
      <div className="w-full md:max-w-[80%] mt-12 mb-12 p-6 bg-white rounded-xl shadow-md space-y-6">
        <h2 className="text-xl font-bold">מחשבון עלויות נלוות</h2>

        <p className="text-sm text-red-600 font-semibold">
          ⚠️ חשוב מאוד לדעת שההוצאות הנלוות אינן חלק מן ההון העצמי המחושב לצרכי משכנתא
        </p>

        <button
          onClick={addItem}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded flex items-center gap-1"
        >
          <span className="text-white text-xl">+</span>
          הוסף שורה
        </button>

        <div>
          <label className="block mb-1 font-medium">מחיר הדירה (₪)</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50"
            inputMode="numeric"
            value={priceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
          />
        </div>

        <div id="pdf-content" className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-right border-t mt-4">
            <thead>
              <tr className="border-b bg-gray-100 text-sm">
                <th className="p-2 w-[150px] max-w-[150px] truncate">סעיף</th>
                <th className="p-2 w-[80px]">אחוז<br />מהנכס</th>
                <th className="p-2 w-[150px]">עלות<br />משוערת (₪)</th>
                <th className="p-2 w-[150px]">כולל<br />מע״מ</th>
                <th className="p-2 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const itemVat = item.label === 'מס רכישה' ? 0 : Math.round(item.amount * (VAT_RATE / 100));
                const totalWithVat = item.amount + itemVat;

                return (
                  <tr key={i} className="border-b">
                    <td className="p-2 max-w-[150px]">
                      <select
                        className="w-full border rounded px-2 py-1 bg-white truncate"
                        value={item.label}
                        onChange={(e) => handleItemChange(i, 'label', e.target.value)}
                      >
                        <option value="">בחר סעיף</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.length > 15 ? opt.slice(0, 15) + '…' : opt}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2">
                      <div className="relative">
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          className="w-full border rounded px-6 py-1 text-right bg-orange-50"
                          value={item.percentage.toString()}
                          onChange={(e) => handleItemChange(i, 'percentage', e.target.value)}
                        />
                      </div>
                    </td>

                    <td className="p-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full border rounded px-3 py-1 text-right bg-orange-50"
                        value={formatNumber(item.amount)}
                        onChange={(e) => handleItemChange(i, 'amount', e.target.value)}
                      />
                    </td>

                    <td className="p-2 text-green-700 font-semibold text-sm">
                      {Math.round(totalWithVat).toLocaleString('he-IL', {
                        style: 'currency',
                        currency: 'ILS',
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeItem(i)}
                        className="text-red-500 hover:text-red-700 text-xl font-bold"
                        title="מחק שורה"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t bg-gray-50">
                <td className="p-2">סה״כ</td>
                <td></td>
                <td className="p-2 text-blue-700">
                  {Math.round(totalCost).toLocaleString('he-IL', {
                    style: 'currency',
                    currency: 'ILS',
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="p-2 text-green-700">
                  {Math.round(totalCost + totalVat).toLocaleString('he-IL', {
                    style: 'currency',
                    currency: 'ILS',
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={addItem}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded flex items-center gap-1"
          >
            <span className="text-white text-xl">+</span>
            הוסף שורה
          </button>
        </div>
      </div>

    </main>

    
  )
}
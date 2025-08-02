import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export type LoanPart = {
  id: string
  type: string
  amount: number
  interest: number
  linked: boolean
  monthlyPayment: number
  startDate: string
  endDate: string
}

// הגדר את ה-worker לטעינה נכונה בדפדפן
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

export async function parseMizrahiReport(file: File): Promise<LoanPart[]> {
  const text = await extractTextFromPDF(file)
  const parts: LoanPart[] = []

  const blocks = text.split(/שם החלק בהלוואה:\s*\d+\s+1/g).slice(1)

  blocks.forEach((block, i) => {
    const id = (i + 1).toString()

    const amountMatch = block.match(/יתרת הקרן:\s+([\d,]+\.\d{2})/)
    const interestMatch = block.match(/שיעור ריבית ממוצעת.*?:\s+%?([\d.]+)/)
    const linked = /צמוד מדד/.test(block)
    const monthlyPaymentMatch = block.match(/סכום החיוב החודשי.*?:\s+ש"ח\s+([\d,]+\.\d{2})/)
    const startDateMatch = block.match(/תאריך הביצוע:\s+(\d{2}\/\d{2}\/\d{4})/)
    const endDateMatch = block.match(/תאריך סיום חלק.*?:\s+(\d{2}\/\d{2}\/\d{4})/)

    const type = block.includes('פריים')
      ? 'פריים לא צמוד'
      : block.includes('משתנה') && linked
      ? 'משתנה אג"ח צמודה'
      : 'קבועה צמודה'

    const parseNumber = (value: string | undefined) =>
      value ? parseFloat(value.replace(/,/g, '')) : 0

    parts.push({
      id,
      type,
      amount: parseNumber(amountMatch?.[1]),
      interest: parseFloat(interestMatch?.[1] || '0'),
      linked,
      monthlyPayment: parseNumber(monthlyPaymentMatch?.[1]),
      startDate: convertDate(startDateMatch?.[1]),
      endDate: convertDate(endDateMatch?.[1]),
    })
  })

  return parts
}

function convertDate(dateStr?: string): string {
  if (!dateStr) return ''
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month}-${day}`
}

async function extractTextFromPDF(file: File): Promise<string> {
  const typedArray = new Uint8Array(await file.arrayBuffer())
  const pdf: PDFDocumentProxy = await getDocument({ data: typedArray }).promise

  const pageTexts = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, i) => {
      const page = await pdf.getPage(i + 1)
      const content = await page.getTextContent()
      return content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    })
  )

  return pageTexts.join('\n')
}












// 'use client'
// import * as pdfjsLib from 'pdfjs-dist'
// import { getDocument } from 'pdfjs-dist'

// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// export type ParsedLoanPart = {
//   amount: number
//   type: string
//   interest: number
//   linked: boolean
//   anchorType: string
//   anchorValue: number
//   spread: number
//   calculatedRate: number
//   endDate: string
//   months: number
//   monthlyPayment: number
// }

// export async function parseMizrahiReport(file: File): Promise<ParsedLoanPart[]> {
//   const buffer = await file.arrayBuffer()
//   const pdf = await getDocument({ data: buffer }).promise
//   const firstPage = await pdf.getPage(1)
//   const content = await firstPage.getTextContent()
//   const text = content.items.map((item: any) => item.str).join(' ')

//   // סימולציה זמנית, בקרוב נבנה regex אמיתי
//   return [
//     {
//       amount: 250000,
//       type: 'קל"צ',
//       interest: 3.1,
//       linked: false,
//       anchorType: 'אג"ח',
//       anchorValue: 1.5,
//       spread: 1.6,
//       calculatedRate: 3.1,
//       endDate: '2035-01-01',
//       months: 120,
//       monthlyPayment: 2400,
//     },
//   ]
// }

// import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
// import type { PDFDocumentProxy } from 'pdfjs-dist'

// export type LoanPart = {
//   id: string
//   type: 'פריים לא צמוד' | 'משתנה אג"ח צמודה' | 'קבועה צמודה' | 'לא ידוע'
//   amount: number | null
//   interest: number | null
//   linked: boolean
//   monthlyPayment: number | null
//   startDate: string // ISO yyyy-MM-dd or empty
//   endDate: string // ISO yyyy-MM-dd or empty
// }

// // Set worker; in production consider bundling or conditionally setting for browser
// GlobalWorkerOptions.workerSrc =
//   typeof window !== 'undefined'
//     ? 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
//     : ''

// /**
//  * Parses the Mizrahi loan report PDF into structured loan parts.
//  */
// export async function parseMizrahiReport(file: File): Promise<LoanPart[]> {
//   const text = await extractTextFromPDF(file)
//   if (!text) {
//     throw new Error('לא נמצא טקסט בקובץ ה-PDF או שההפקה נכשלה.')
//   }

//   // Try to robustly split into loan part blocks by looking for the "שם החלק בהלוואה:" header.
//   const partHeaderRegex = /שם החלק בהלוואה:\s*\d+/g
//   const indices: number[] = []
//   let match: RegExpExecArray | null
//   while ((match = partHeaderRegex.exec(text)) !== null) {
//     indices.push(match.index)
//   }

//   const blocks: string[] = []
//   for (let i = 0; i < indices.length; i++) {
//     const start = indices[i]
//     const end = i + 1 < indices.length ? indices[i + 1] : text.length
//     blocks.push(text.slice(start, end))
//   }

//   const parts: LoanPart[] = []

//   blocks.forEach((block, i) => {
//     const id = (i + 1).toString()

//     const amountMatch = block.match(/יתרת הקרן:\s*([\d.,]+\.\d{2})/)
//     const interestMatch = block.match(/שיעור ריבית ממוצעת[^:]*:\s*%?([\d.,]+)/)
//     const linked = /צמוד\s*מדד/i.test(block)
//     const monthlyPaymentMatch = block.match(
//       /סכום\s*החיוב\s*החודשי[^:]*:\s*ש"ח\s*([\d.,]+\.\d{2})/
//     )
//     const startDateMatch = block.match(/תאריך\s*הביצוע:\s*(\d{2}\/\d{2}\/\d{4})/)
//     const endDateMatch = block.match(
//       /תאריך\s*סיום\s*חלק[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/
//     )

//     // Determine type with clear priority
//     let type: LoanPart['type'] = 'לא ידוע'
//     if (block.includes('פריים')) {
//       type = 'פריים לא צמוד'
//     } else if (block.includes('משתנה') && linked) {
//       type = 'משתנה אג"ח צמודה'
//     } else if (block.includes('קבועה') && linked) {
//       type = 'קבועה צמודה'
//     }

//     const parseNumber = (value: string | undefined): number | null => {
//       if (!value) return null
//       // Remove commas and any other non-digit/dot characters
//       const cleaned = value.replace(/[,\s]/g, '')
//       const num = parseFloat(cleaned)
//       return isNaN(num) ? null : num
//     }

//     parts.push({
//       id,
//       type,
//       amount: parseNumber(amountMatch?.[1]) ?? null,
//       interest: interestMatch
//         ? (() => {
//             const cleaned = interestMatch[1].replace(',', '.')
//             const num = parseFloat(cleaned)
//             return isNaN(num) ? null : num
//           })()
//         : null,
//       linked,
//       monthlyPayment: parseNumber(monthlyPaymentMatch?.[1]) ?? null,
//       startDate: convertDate(startDateMatch?.[1]),
//       endDate: convertDate(endDateMatch?.[1]),
//     })
//   })

//   return parts
// }

// /**
//  * Converts DD/MM/YYYY into ISO YYYY-MM-DD. Returns empty string if invalid.
//  */
// function convertDate(dateStr?: string): string {
//   if (!dateStr) return ''
//   const parts = dateStr.split('/')
//   if (parts.length !== 3) return ''
//   const [day, month, year] = parts
//   // Basic validation
//   if (
//     !/^\d{2}$/.test(day) ||
//     !/^\d{2}$/.test(month) ||
//     !/^\d{4}$/.test(year)
//   ) {
//     return ''
//   }
//   return `${year}-${month}-${day}`
// }

// async function extractTextFromPDF(file: File): Promise<string> {
//   try {
//     const arrayBuffer = await file.arrayBuffer()
//     const typedArray = new Uint8Array(arrayBuffer)
//     const loadingTask = getDocument({ data: typedArray })
//     const pdf: PDFDocumentProxy = await loadingTask.promise

//     const pageTexts: string[] = []
//     for (let i = 1; i <= pdf.numPages; i++) {
//       try {
//         const page = await pdf.getPage(i)
//         const content = await page.getTextContent()
//         const pageText = content.items
//           .map((item) => ('str' in item ? item.str : ''))
//           .join(' ')
//         pageTexts.push(pageText)
//       } catch (err) {
//         // If a single page fails, continue but note it.
//         console.warn(`Failed to extract text from page ${i}:`, err)
//       }
//     }

//     return pageTexts.join('\n')
//   } catch (err) {
//     console.error('Error extracting PDF text:', err)
//     return ''
//   }
// }










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

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

// components/BankReport/parseMizrahiReport.ts
import type { LoanPart } from './types'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf'

if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
}

const numberFromHebrew = (s: string) => {
  return parseFloat(s.replace(/[^\d,\.]/g, '').replace(/,/g, '')) || 0
}

export async function parseMizrahiReport(file: File): Promise<LoanPart[]> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((it: any) => it.str || '')
    fullText += strings.join(' ') + '\n'
  }

  const parts: LoanPart[] = []

  // חלקים מוגדרים לפי "נתונים כלליים חלק מס'" עם מספר
  const sectionRegex =
    /(נתונים כלליים חלק מס['"]?\s*([0-9]+)[\s\S]*?)(?=נתונים כלליים חלק מס['"]?\s*[0-9]+|$)/gi
  let match: RegExpExecArray | null
  while ((match = sectionRegex.exec(fullText)) !== null) {
    const sectionText = match[1]
    const id = parseInt(match[2], 10)

    // שם מסלול — עד רווח כפול או סוף
    const nameMatch = /שם החלק בהלוואה[:\s]*(.+?)(?:\s{2,}|$)/.exec(sectionText)
    const name = nameMatch ? nameMatch[1].trim() : `מסלול ${id}`

    // סוג ריבית
    const loanTypeMatch = /(פריים|משתנה|קבועה|צמודה|לא צמוד|משולבת)/i.exec(
      sectionText
    )
    const loanType = loanTypeMatch ? loanTypeMatch[1].trim() : undefined

    // ריבית — גמיש חיפוש על כמה וריאציות
    const interestRateMatch =
      /(?:שיעור הריבית|ריבית ממוצעת|ריבית)[:\s]*([\d\.]+)%/i.exec(
        sectionText
      )
    const interestRate = interestRateMatch
      ? parseFloat(interestRateMatch[1])
      : 0 // נשאר 0 אם לא נמצא

    // ריבית מתואמת / ממוצעת בסילוק (נפרדות)
    const adjustedInterestRateMatch = /ריבית מתואמת[:\s]*([\d\.]+)%/i.exec(
      sectionText
    )
    const adjustedInterestRate = adjustedInterestRateMatch
      ? parseFloat(adjustedInterestRateMatch[1])
      : undefined

    const averageInterestAtPayoffMatch = /ריבית ממוצעת במועד הסילוק[:\s]*([\d\.]+)%/i.exec(
      sectionText
    )
    const averageInterestAtPayoff = averageInterestAtPayoffMatch
      ? parseFloat(averageInterestAtPayoffMatch[1])
      : undefined

    // יתרת קרן — חיפוש קצת יותר גמיש
    const principalMatch =
      /יתרת הקרן[:\s]*([\d,\.]+)/i.exec(sectionText) ||
      /ש"ח\s*([\d,\.]+)\s*יתרת הקרן/i.exec(sectionText) ||
      /יתרת\s*הקרן[\s\S]*?ש"ח[:\s]*([\d,\.]+)/i.exec(sectionText)
    
    
    
    
    
      const principalBalance = principalMatch
      ? numberFromHebrew(principalMatch[1])
      : undefined

    // חיוב חודשי
    const monthlyChargeMatch =
      /סכום החיוב החודשי בגין חלק זה[:\s]*([\d,\.]+)/i.exec(
        sectionText
      ) ||
      /חיוב חודשי[:\s]*([\d,\.]+)/i.exec(sectionText)
    const monthlyCharge = monthlyChargeMatch
      ? numberFromHebrew(monthlyChargeMatch[1])
      : undefined

    parts.push({
      id,
      name,
      loanType,
      interestRate,
      adjustedInterestRate,
      averageInterestAtPayoff,
      principalBalance,
      monthlyCharge,
    })
  }

  // fallback רופף לפי "שם החלק בהלוואה" אם לא נמצא כלום
  if (parts.length === 0) {
    let fallbackCounter = -1
    const looseSectionRegex = /(שם החלק בהלוואה[:\s][\s\S]*?)(?=שם החלק בהלוואה[:\s]|$)/gi
    let looseMatch: RegExpExecArray | null
    while ((looseMatch = looseSectionRegex.exec(fullText)) !== null) {
      const sectionText = looseMatch[1]
      const nearbyIdMatch = /חלק\s*מס['"]?\s*([0-9]+)/i.exec(sectionText)
      const id = nearbyIdMatch ? parseInt(nearbyIdMatch[1], 10) : fallbackCounter--

      const nameMatch = /שם החלק בהלוואה[:\s]*(.+?)(?:\s{2,}|$)/.exec(
        sectionText
      )
      const name = nameMatch ? nameMatch[1].trim() : `מסלול ${id}`

      const loanTypeMatch = /(פריים|משתנה|קבועה|צמודה|לא צמוד|משולבת)/i.exec(
        sectionText
      )
      const loanType = loanTypeMatch ? loanTypeMatch[1].trim() : undefined

      const interestRateMatch =
        /(?:שיעור הריבית|ריבית ממוצעת|ריבית)[:\s]*([\d\.]+)%/i.exec(
          sectionText
        )
      const interestRate = interestRateMatch
        ? parseFloat(interestRateMatch[1])
        : 0

      parts.push({
        id,
        name,
        loanType,
        interestRate,
      })
    }
  }

  return parts
}

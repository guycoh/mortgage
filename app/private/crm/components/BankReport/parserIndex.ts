// components/BankReport/parserIndex.ts
import { parseMizrahiReport } from './parseMizrahiReport'
// בעתיד תוכל להוסיף: import { parseLeumiReport } from './parseLeumiReport'

export const parserMap: Record<string, (file: File) => Promise<any>> = {
  '20': parseMizrahiReport,
  // '10': parseLeumiReport,
}

export async function parseByBank(bankCode: string, file: File) {
  const parser = parserMap[bankCode]
  if (!parser) throw new Error(`Parser for bank ${bankCode} not implemented`)
  return parser(file)
}

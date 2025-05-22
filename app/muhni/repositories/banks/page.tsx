// app/banks/page.tsx או כל קובץ page אחר
'use client'

import BankBranchesTable from "./BankBranchesTable"

export default function BanksPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">סניפי הבנקים בישראל</h1>
      <BankBranchesTable apiUrl="/api/banks/branches" />
    </main>
  )
}

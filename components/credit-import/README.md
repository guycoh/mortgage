# Credit Report Import — universal component

Drag-and-drop that parses an Israeli **"דוח ריכוז נתונים"** (Credit Data System report)
PDF **entirely in the browser** (the file is never uploaded), lets the user pick which
debts to use, and hands them back so **any calculator** can consume the data. Includes a
collapsible full-report **JSON side panel** (copy / download / expand-all).

## Quick start

```tsx
import { CreditReportImport, toLoanRows, type ExtractedLoan } from "@/components/credit-import";

<CreditReportImport
  onSelect={(loans: ExtractedLoan[]) => setRows(toLoanRows(loans))}
  onImported={() => scrollToCalculator()}
/>
```

`onSelect` fires on the initial parse **and on every checkbox toggle** with the currently
selected loans. Map `ExtractedLoan[]` to whatever shape your calculator needs.

## Props

| Prop | Default | Purpose |
|---|---|---|
| `onSelect(loans, report)` | — | Selected loans + full report; fires on parse & each toggle |
| `onImported(report)` | — | Fires once per successful parse |
| `candidateFilter(loan)` | `l => l.isLoanOrMortgage` | Which debts appear in the pick-list |
| `isDefaultSelected(loan)` | `l => l.defaultInclude` | Which candidates are pre-checked |
| `showJsonPanel` | `true` | Render the full-report JSON side panel |
| `autoOpenJson` | `true` | Auto-open that panel after a parse |
| `showCandidates` | `true` | Render the checkbox pick-list |
| `jsonSide` | `"left"` | Side the JSON panel slides in from |
| `title` / `hint` | Hebrew defaults | Dropzone copy overrides |
| `className` | — | Extra wrapper classes |

## `ExtractedLoan` shape

```ts
{ uid, source, type, role, section, isMortgage, isLoanOrMortgage,
  balance, balanceStr, interest, months, monthlyPayment, knownPayment, defaultInclude }
```

`balance` (`201-049`), `interest` (utilization-weighted track nominal, or back-solved from
the reported payment), `months` (today → planned-end `201-018`). Use `toLoanRows()` for the
`{ balance, interest, months }` calculator shape, or read the fields directly.

## Recipes

**Loan-consolidation calculator** (loans & mortgages only — the default):
```tsx
<CreditReportImport onSelect={(loans) => setRows(toLoanRows(loans))} />
```

**Total-exposure widget** (every debt, no UI chrome):
```tsx
<CreditReportImport
  candidateFilter={() => true}
  showCandidates={false}
  showJsonPanel={false}
  onSelect={(loans) => setTotal(loans.reduce((s, l) => s + l.balance, 0))}
/>
```

**Mortgages only:**
```tsx
<CreditReportImport candidateFilter={(l) => l.isMortgage} onSelect={...} />
```

## Requirements

- `pdfjs-dist` v4 with the worker copied to `public/pdf.worker.min.mjs`.
- `react-json-view-lite` (only if `showJsonPanel` is used).
- Tailwind; the JSON tree uses the `.cdv-json` rules in `app/globals.css`.

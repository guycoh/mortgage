# עוגני ריבית משתנה — מקורות, הגדרות ומה מאומת

What the "עדכון עוגנים" button resolves, where each number comes from, and — just
as important — what is **not** verified and therefore never answered.

Last reviewed: **2026-08-13**.

---

## The finding that shapes the design

An עוגן is **not a private number each bank invents.** It is a small set of
published reference tables, and the key into them is the **track**, not the
lender:

| family | Hebrew | applies to | keyed by | publication |
|---|---|---|---|---|
| `prime` | ריבית פריים | prime tracks | nothing — one national value | BOI rate + 1.5%, on each rate decision |
| `bond_linked` | עוגן אג"ח צמוד מדד (ריאלי) | משתנה צמודה | reset period | twice monthly, 11th & 26th |
| `bond_unlinked` | עוגן אג"ח לא צמוד (נומינלי) | משתנה לא צמודה | reset period | twice monthly, 11th & 26th |
| `makam` | עוגן מק"ם | משתנה כל שנה, לא צמודה | 12 months | monthly, ~9th |

Most banks price most variable tracks off Bank of Israel government-bond yield
data, so keeping a private copy of that curve per bank would be six copies of one
number, free to drift apart. That much is solid, and it is why nothing here is
keyed on the lender.

**But "six banks quoting משתנה צמודה כל 5 שנים quote the same number" is too
strong, and an earlier version of this file said exactly that.** Banks differ in
*convention*, not only in dataset: which BOI series, which averaging window, and
whether a model-derived table is used in place of the raw zero curve. Documented
examples NOT yet reflected in the registry:

- **הפועלים** — 3/5/10-year tracks off the BOI nominal/real zero curves, but an
  18-month track off a different, model-derived dataset. One bank, two bases —
  which is on its own enough to show that `linkage × resetPeriod` is not a
  sufficient key.
- **הבינלאומי** — documents its government-bond anchor off BOI's model-based
  yield table used for the forecast total rate, not the plain zero-curve table.
- **בנק ירושלים** — per-track averaging conventions, including a calendar
  average of the 5-year nominal curve on its non-linked contract.

So the conceptual key is `source + convention + linkage + resetMonths`, and the
bank selects all four. `BankRule.overrides` is that slot: keyed `"linked:60"` /
`"unlinked:12"`, it lets one track of one bank read a different dataset without
disturbing the others.

What is actually verified today:

| claim | status |
|---|---|
| prime = BOI rate + 1.5%, one national value | ✅ verified, and refreshed from BOI |
| Leumi annual unlinked → מק"ם 12M | ✅ verified from Leumi's own page |
| every other bank/track → the national bond curve | ⚠️ **a default, not a verified mapping** — carried as `verified: false`, and the advisor's tooltip says המקור טרם אומת מול פרסום הבנק |

The margin is never touched by any of this — it is on the row, from the document.

### A rule that was removed

An earlier version floored מזרחי's anchor at 0%, on the strength of a commentary
article rather than a contract. It is gone. Mizrahi's own historical anchor
tables print negative values across several maturities, so the floor was not a
bank rule but a guess wearing one — and it appears to have been a confusion with
a separate "emergency protection" mechanism that a 2023 court settlement bound
the bank not to apply to future rate updates. A clamp returns only against an
exact contractual source, for the exact product it governs.

---

## Values currently bundled

These ship as a dated snapshot in `lib/anchors/registry.ts` and are overridden by
any fresher row in the `mortgage_anchors` table. Every one carries its own
`effective_at`, and the UI shows it — a stale anchor that says it is stale is
usable; one that pretends to be current is not.

### `prime` — ריבית פריים

| value | effective | source | verified |
|---|---|---|---|
| 5.00% | 2026-07-06 | BOI rate 3.5% (decision of 06/07/2026) + 1.5% | ✅ |

Verified because it is arithmetic on a published Bank of Israel decision, not a
reading off a table. The +1.5% spread is fixed by convention across all banks.

### `bond_linked` — עוגן אג"ח צמוד מדד, as of 11/07/2026

| reset | value |
|---|---|
| 12 months | 1.65% |
| 30 months | 1.61% |
| 60 months | 1.73% |
| 84 months | 1.74% |
| 120 months | 1.86% |

### `bond_unlinked` — עוגן אג"ח לא צמוד, as of 11/07/2026

| reset | value |
|---|---|
| 24 months | 3.21% |
| 60 months | 3.34% |
| 84 months | 3.48% |

### `makam` — עוגן מק"ם, as of 2026-07-09

| reset | value |
|---|---|
| 12 months | 3.22% |

Defined as the yield on 12-month מק"ם — a short-term bill issued by the Bank of
Israel — which the lender then adds its margin to.

---

## ⚠️ What is NOT verified

**The bond and מק"ם figures above were read from a secondary source**
(moti.org.il, a mortgage-advisory portal that republishes the tables), not from
each bank's own מחירון or from the Bank of Israel directly. They are marked
`verified: false` in the registry, and that flag reaches the tooltip.

Specifically unverified:

- **Per-bank divergence.** The underlying curve is national, but each bank states
  its own reading date, averaging window and rounding in its price list. A small
  difference from a given bank's published figure is possible. The registry uses
  the national table for every bank that is mapped to a bond family, and says so.
- **Whether every bank's "משתנה צמודה" really prices off the real bond curve** at
  every reset period. Verified for מזרחי טפחות (whose table this is) and
  documented for לאומי, which publishes its own equivalents.
- **The reset periods that do not appear in the tables.** A row resetting every
  36 months has no published column; the resolver returns `INSUFFICIENT_DATA`
  rather than interpolating between the 30- and 60-month values. Interpolating
  would be inventing a rate.

### To promote a value to verified

Replace the source with the bank's own published price list or the Bank of
Israel series, record the URL and the reading date, and set `verified: true` —
either in `registry.ts` or, better, as a row in `mortgage_anchors`.

Authoritative sources, in the order they should be preferred:

1. **Bank of Israel** — see below.
2. **The bank's own published price list** (מחירון / טבלת עוגנים), per bank.
3. A secondary aggregator — what is bundled now, and the reason nothing here is
   marked verified except prime.

### Bank of Israel endpoints, as tested on 2026-08-13

**`GET https://boi.org.il/PublicApi/GetInterest`** — ✅ works, no auth, returns:

```json
{"currentInterest":3.5,"nextInterestDate":"2026-09-01T00:00:00Z","lastPublishedDate":"2026-07-12T08:59:20.943Z"}
```

This is what `app/api/simulator/anchors/refresh` reads. `lastPublishedDate` is
the anchor's effective date — stamping the row with *today* instead would make
an eight-week-old rate look like this morning's. `nextInterestDate` is the date
the value stops being current, and is why prime's staleness allowance is measured
in decisions rather than days.

**SDMX at `edge.boi.gov.il/FusionEdgeServer/sdmx/v2/…`** — partially confirmed.
The *structure* endpoint responds (`/structure/dataflow/BOI.STATISTICS/all/latest?format=sdmx-json`,
43 dataflows). The two that matter:

| dataflow | contents |
|---|---|
| `BR` | BOI interest rate |
| `ZCM` | Inflation expectations and **zero yield curve** — what the bond anchors derive from ("התשואה הנומינלית הנגזרת מאמידת עקום אפס") |

The *data* endpoint form was **not** established — every variant tried returned
404 or timed out from this network. So nothing in the code reads it, and
`bond_linked` / `bond_unlinked` / `makam` remain hand-maintained. Establishing
that URL is the single change that would automate the remaining three families.

---

## Banks

Mapping lives in `lib/anchors/registry.ts` (`BANK_RULES`). A bank absent from it
resolves to `UNSUPPORTED` and its rows are left untouched — non-bank lenders,
card companies and anyone whose variable-rate pricing has not been checked.

| bank | prime | משתנה צמודה | משתנה לא צמודה | notes |
|---|---|---|---|---|
| מזרחי טפחות | ✅ | `bond_linked` | `bond_unlinked` | anchor floored at 0% |
| לאומי | ✅ | `bond_linked` | `makam` at 12mo, else `bond_unlinked` | publishes its own tables |
| הפועלים | ✅ | `bond_linked` | `bond_unlinked` | |
| דיסקונט | ✅ | `bond_linked` | `bond_unlinked` | |
| מרכנתיל | ✅ | `bond_linked` | `bond_unlinked` | Discount group |
| הבינלאומי | ✅ | `bond_linked` | `bond_unlinked` | |
| ירושלים | ✅ | `bond_linked` | `bond_unlinked` | |
| אוצר החייל / פאג"י / מסד | ✅ | `bond_linked` | `bond_unlinked` | FIBI group |
| יהב | ✅ | `bond_linked` | `bond_unlinked` | |

---

## Refreshing

`mortgage_anchors` is the cache the button reads. Nothing about a click touches
an external site — see `app/api/simulator/anchors/route.ts`, which reads the
table and falls back to the bundled snapshot.

To refresh, insert new rows with a later `effective_at`; the resolver always
takes the newest row at or before today for each `(family, reset_months)`. Old
rows are kept, which is what makes the table a history rather than a setting.

A future scheduled job should write:

- `prime` on every BOI rate decision (dates published a year ahead);
- `bond_linked` / `bond_unlinked` on the 11th and 26th;
- `makam` monthly.

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
| every other bank/track → the BOI zero curve | ✅ authoritative SOURCE; the per-bank CONVENTION is still open — see below |

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

## Where the numbers come from — all of it, the Bank of Israel

Every family is fetched from BOI directly by `lib/anchors/sources.ts`. Nothing is
read off a republished table any more.

| family | series | cadence |
|---|---|---|
| `prime` | `boi.org.il/PublicApi/GetInterest` → rate + 1.5% | each rate decision |
| `bond_linked` | `ZC_TSB_ZRD_{n}Y_MA` — real zero curve | monthly |
| `bond_unlinked` | `ZC_TSB_ZND_{n}Y_MA` — nominal zero curve | monthly |
| `makam` | the one-year point of the nominal curve | monthly |

Maturities published: **1, 2, 3, 4, 5, 7, 10, 15, 20 years.**

### The endpoint, because it cost an afternoon

`edge.boi.gov.il` runs **Fusion Edge Server**, which serves *structure* and *data*
under different prefixes. Every documented SDMX REST data path under `/sdmx/v2/`
returns 404 — that is not a broken service, it is the wrong prefix:

```
structure  /FusionEdgeServer/sdmx/v2/structure/dataflow/BOI.STATISTICS/all/latest
data       /FusionEdgeServer/ws/public/sdmxapi/rest/data/BOI.STATISTICS,ZCM,1.0
```

Ask for `application/vnd.sdmx.data+csv`. The same query as XML is 10MB; as CSV it
is 4KB. `?lastNObservations=1` returns the current value of every series in the
flow, so an entire curve costs one request.

Dataflows that matter: **`BR`** (BOI interest rate), **`ZCM`** (zero yield curve
and inflation expectations).

### Reading between published points

The curve is sampled at whole years, and "משתנה כל שנתיים וחצי" is one of the
commonest tracks sold. A 30-month reset is read linearly between the 2- and
3-year points, and the row's source says so. This is reading a continuous curve
at a maturity it is defined for — not the same act as inventing a bank rule.

Past the ends of the curve there is nothing to read between, so a 30-year reset
returns `INSUFFICIENT_DATA` rather than extrapolating.

### Freshness is enforced, not hoped for

`app/api/simulator/anchors` checks the cache against each family's cadence before
answering. Past cadence, it refreshes from source and re-reads, then answers. A
warm cache skips this entirely. The advisor is never told about our cache age —
the button's promise is the current anchor, and reporting our own plumbing to the
person who pressed it is not their problem to solve.

`app/api/simulator/anchors/refresh` does the same on a schedule, so the gate is
rarely the thing that pays for it.

## ⚠️ What is still NOT verified

The **source** is now authoritative for all four families. What remains open is
**per-bank convention** — which reading of the curve, what averaging window, and
whether a particular product uses a model-derived series instead:

- **הפועלים** — an 18-month track documented off a different, model-derived
  dataset than its 3/5/10-year tracks.
- **הבינלאומי** — documents its anchor off BOI's model-based table used for the
  forecast total rate, not the plain zero curve.
- **בנק ירושלים** — per-track averaging, including a calendar average of the
  5-year nominal curve on its non-linked contract.

`BankRule.overrides` is the slot for these, keyed `"linked:60"` / `"unlinked:12"`.
Only one is filled: Leumi's annual unlinked off מק"ם, from Leumi's own page.

Because the BOI curve is a **monthly average** and the banks' own anchor tables
are read on specific dates, a few basis points of difference from a given bank's
published figure is expected. That is a convention gap, not an error, and closing
it means entering that bank's convention above.

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

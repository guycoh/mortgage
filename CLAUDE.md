# CLAUDE.md — the mortgage app, and the simulator inside it

Orientation for anyone (human or agent) landing in this repo cold. Read this
before exploring; it answers "where is X, what talks to what, and what will
bite me". It is written from the code as of 2026-08-17 — when this file and the
code disagree, the code wins and this file needs a fix.

## 1. What this repo is

`guycoh/mortgage` — a Next.js 16 (App Router, Turbopack, React 19, Tailwind 4)
app for an Israeli mortgage-advisory business. It carries a public marketing
site, a CRM under `/private/**`, a pile of calculator experiments, and — the
part that gets nearly all the engineering attention — **the mix simulator**:
a board where an advisor drops a client's credit report or bank payoff letter,
gets the debts as rows, and builds alternative mortgage mixes (תמהילים) to
compare against the client's current one.

Stack you will meet: Supabase (Postgres via PostgREST, anon key server-side),
ECharts 6, Motion (framer), `@number-flow/react`, ExcelJS, pdf.js (client-side
PDF text extraction), zod, `@phosphor-icons/react` (simulator) and `lucide-react`
(console). Fonts: Inter Variable + Assistant (simulator), Rubik + JetBrains
Mono (console).

Deploys: several Vercel projects build this repo; **`morg`
(`morg-orcin.vercel.app`) is the live one.** `git push` to `origin/main` deploys.
Do NOT run `vercel` CLI or `git add -A` from a worktree (see §9).

Local dev: `.claude/launch.json` → `npm run dev -- --port 3500` (entry
`aa100-ink`). `.env.local` is gitignored and holds the real Supabase keys,
`SUPABASE_SERVICE_ROLE_KEY`, `FB_LINK_SECRET`, `FIREBERRY_TOKEN`,
`SIMULATOR_ADMIN_KEY`, `ADMIN_USER`, `ADMIN_PASS_HASH`, `ANCHOR_REFRESH_SECRET`,
`CRON_SECRET`. A fresh worktree without them cannot `next build` (unrelated
routes die at module evaluation) — stub them to build.

## 2. The simulator surfaces — which one is real

There are several copies of "the simulator". They are NOT one codebase with
themes; they are separate route folders that share only maths and parsers.

| Route | Folder | Status |
|---|---|---|
| **`/aa102test`**, `/aa102test/<leadId>` | `app/aa102test/` | **The one under active development. Design and behaviour of record.** |
| `/simulator/board` | `app/simulator/board/page.tsx` | The Fireberry-facing door: renders `app/aa102test/Simulator` with the lead fixed by a signed cookie (`locked`). Same code, no lead picker. |
| `/hachamsim` | `app/hachamsim/` | The CEO's layout variant. Imports everything from aa102test except its own copy of the table. |
| `/aa100test`, `/aa101test` | `app/aa100test/`, `app/aa101test/` | Earlier design generations, kept side by side for comparison. Deliberately frozen. Class prefixes `.fin-*` / `.ink-*`. **Don't edit them to change aa102test, and don't assume a fix in one lands in another.** |
| `/private/crm/leads/simulators/[id]` | `app/private/crm/leads/simulators/` | The original CRM simulator. Owns the **calc engine** everyone imports (see §4). |
| `/aa4`, `/aa4test` | `app/aa4/` | A different tool (BDI liabilities board / mortgage calculator with a credit dropzone). Not the mix simulator. |

**Class-prefix isolation is load-bearing.** Every simulator route ships a global
stylesheet: aa102test's is `.lgr-*` (`app/aa102test/theme.css`, ~3,100 lines).
Portalled surfaces (popovers, modals) carry `.lgr-vars` for tokens, not
`.lgr-root` (which sets `min-height: 100dvh`).

## 3. `/aa102test` — anatomy

`app/aa102test/`
- `page.tsx` — blank board (no lead). `?lead=3` redirects to `/aa102test/3`. `?tool=` picks the instrument.
- `[leadId]/page.tsx` — one lead's board; resolves the lead server-side (404 if unknown).
- `Simulator.tsx` (~1,500 lines) — the whole surface: state, load/save, tool switch, masthead, rail, intake, mix tabs, ledger, comparison, charts, modals.
- `components/`
  - `Ledger.tsx` — the editable table. Master mix (`isBase`) and proposals have **different colgroups** (both 14 columns). Master: סוג · מטרה · גוף מימון · **יתרת קרן/הצמדת קרן** (a paired well) · **הפרשי היוון** · מסלול · לוח סילוקין · עוגן/תוספת · ריבית · תדירות שינוי · חודשים · תאריך סיום · החזר חודשי · actions. Proposal: סוג · מטרה · גוף מימון · סכום · **אחוז** · … (same tail). Widths are hand-budgeted percentages — measured on real screenshots; don't shave תאריך סיום or עוגן.
  - `Bay.tsx` — the drop zone + import receipt (PDF → parser → rows). Whole-window drag capture.
  - `DuplicateMasterModal.tsx` — שכפול משכנתא נוכחית: fold יתרת קרן+הצמדה into one amount, with/without folding הפרשי היוון.
  - `Charts.tsx` + `EChart.tsx` + `lib/timeline.ts` — מהלך התמהיל. Proposal: החזר חודשי, יתרת החוב (stacked by track), חלוקת התשלום לקרן/הצמדה/ריבית (yearly bars), ריבית ממוצעת (balance-weighted). Master: החזר חודשי only. One ECharts theme, three month-panels share an axis pointer.
  - `Compare.tsx` — השוואת תמהילים (active vs picked mix, row vs row). The older two-pane version is archived in `docs/aa102-compare-previous.md`.
  - `ScheduleModal.tsx` — לוח סילוקין for a row or the whole mix (unified schedule).
  - `ClientSummaryModal.tsx` (credit report) / `StatementSummaryModal.tsx` (bank letter) — סיכום ללקוח, the page you show the client. **Selects nothing itself**: rows, worries and footer come from `analysis.clientView` / `StatementAnalysis`. `Worries` is shared.
  - `AnalysisModal.tsx` / `StatementAnalysisModal.tsx` — the advisor's deep analysis (flags with evidence).
  - `RowSettings.tsx` — per-row sheet for the rarely-touched fields (עוגן name, גרייס…).
  - `Select.tsx`, `DateField.tsx`, `Money.tsx`, `Btn.tsx`, `Toast.tsx`, `ToolSwitch.tsx`, `LeadPicker.tsx`, `bankIcons.tsx`, `Logo.tsx`.
- `reverse/` (משכנתא הפוכה) and `ability/` (משכנתא חדשה / יכולת החזר) — the other two instruments on the same surface, code-split, prefilled from Fireberry via `/api/simulator/{reverse,ability}-profile`.
- `lib/`
  - `credit.ts` — `ImportedLoan` (the row type = CRM `Loan` + provenance + master split fields), `FAMILY`/`TRACK_HEX`/`PATH_LABEL` palettes, `owedOnly` (guarantees are never totalled), `perShekel` (החזר לשקל), `principalOf/indexationOf/feeOf/masterTotals/foldMasterRow`, credit-report → rows, `mergeReportLoans` (household de-dup).
  - `purposes.ts` — the eleven-value מטרת ההלוואה list (SmartNPV order) and `purposeFrom(kind, raw, group)`.
  - `analysis.ts` — the credit-report analysis engine (flags, client view, invariants `unshownBalance`/`unshownMonthly` must be 0).
  - `excel.ts` — client-facing Excel export (ExcelJS).
  - `timeline.ts` — pure chart maths (testable in Node).
  - `dates.ts`, `lenders.ts`, `tools.ts` (`Tool` list, server-safe), `transitions.ts` (Motion presets), `track.client.ts` (telemetry beacons — no-op off `/simulator/board`), `migration.sql`, `no-field-drag.ts`, `profile-cache.ts`.

### Mix / row semantics that are easy to get wrong
- **`amount` is always the balance every calculation reads.** On the master it equals יתרת קרן + הצמדת קרן; `indexation` (הצמדת קרן) is stored and principal is derived (`principalOf = amount − indexation`). `prepayment_fee` (הפרשי היוון) is a stated cost, part of no balance.
- **The master mix** = first mix / `is_base`. It's what the client owes today: reports drop into it, אחוז is read-only there, עדכון עוגנים is proposals-only, גובה התמהיל (`target_amount`) is proposals-only.
- **Duplicating the master** goes through `DuplicateMasterModal`; the copy's rows carry `fee_folded` (session-only) when fees were added.
- **Guarantees** (`is_guarantor`) stay on the board, in their own section, and out of every total (`owedOnly`).
- **תאריך סיום ↔ חודשים are synced**, anchored on the row's own frame (end − months), never on today.
- **Grace** (`grace_type_id` 2 = interest-only, 3 = capitalise) is implemented in the engine for שפיצר/קרן שווה.

## 4. The maths (shared by every simulator)

`app/private/crm/leads/simulators/components/calculate/loanCalculators.ts` —
`calculateLoan(loan, annualInflation)` → monthly, totals, `isIndexed`, and a
per-month `schedule` (payment/principal/interest/opening/closing, nominal).
Schedules 1 שפיצר · 2 קרן שווה · 3 בלון חלקי · 4 בלון מלא. Indexation is
`(1+infl/12)^month`. `mixScheduleCalculators.ts` → the unified mix schedule.
Track identity comes from the STATIC `app/data/paths.ts` (1 פריים · 2 קל"צ · 3 ק"צ · 4 מל"צ · 5 מ"צ; `indexed` flag), never from the API.
`app/data/amortization_schedules.ts` names the schedules.

## 5. Parsers (client-side, PDF never leaves the browser)

- `lib/credit-parser/` — חיווי אשראי / דוח ריכוז נתונים (BDI). `extract.client.ts` (pdf.js) → `parse.ts`/`report.ts` → `loan-mapping.ts#extractLoans` (balance, rate, term, track label, purpose 201-017, anchor 201-034/035, printed payment 201-046). Term is measured from the report date, not today.
- `lib/bank-parser/` — bank payoff letters: `banks/{leumi,poalim,discount,mizrahi}.ts` (mercantile = discount template), `types.ts` (`BankTranche`: principal, indexation, breakFee, anchor/margin/reset, dates), `to-loans.ts` (tranche → `ImportedLoan`, fills `indexation`, `prepayment_fee`, `purpose`), `purpose.ts` (`PurposeKind`, `classifyPurpose`, `creditReportPurpose`), `analysis.ts` (`StatementAnalysis`: tracks, payoff, break fees, findings).
- `lib/anchors/` — עדכון עוגנים: registry + sources + resolver behind `/api/simulator/anchors`; cache table `mortgage_anchors` (migration in `supabase/migrations/`), refreshed by a cron on `morg`.
- `lib/verdicts.ts` — shared severity/heat helpers.

Where to test parsers: real PDFs live outside the repo (`../Bank-Templates/*.pdf` = the four bank templates; `../דוח/*.pdf` = credit reports).

## 6. Persistence and APIs

- Tables (Supabase project `sgfkbxwarglqrxjrhdth`): `loan_mixes` (`id`, `lead_id` FK → `leads` — a mix cannot exist without a real lead, `mix_name`, `is_base`, `target_amount`), `loans` (core columns + `debt_group`, `is_guarantor`, `is_shared`, `source_bank/type/track/anchor`, `indexation`, `prepayment_fee`, `purpose`), `sim_events` (telemetry), `mortgage_anchors`.
- `app/api/aa100/mixes/board.ts` — `loadBoard`/`saveBoard`, **replace-not-merge** (a save makes the lead's board equal the payload). Columns are grouped behind feature-detect flags (`hasExtra`, `hasAnchor`, `hasSplit`, `hasPurpose`, `hasTarget`) that latch `false` on PGRST204 and never recover in-process → **restart the dev server / redeploy after a migration**, and know PostgREST's schema cache lags DDL by up to a minute (`NOTIFY pgrst, 'reload schema'`).
- `/api/aa100/mixes` (lead in the query — the open sandbox) and `/api/simulator/mixes` (lead from the signed cookie) share `board.ts`.
- `/api/aa100/leads` — lead search for the picker.
- `/api/simulator/track` — telemetry beacon; drops anything without the board cookie, so `/aa102test` never produces stats.
- `/api/simulator/anchors` (+ `refresh`), `/api/simulator/{reverse,ability}-profile` (Fireberry, read-only).
- **DDL is not possible over PostgREST or the read-only Supabase MCP.** It goes through the Management API (`POST https://api.supabase.com/v1/projects/<ref>/database/query` with the PAT in `~/.claude.json`) — additive, nullable, `if not exists`. Every column the app expects is listed in `app/aa102test/lib/migration.sql`.
- Anon-key RLS allows insert/update/delete on `loan_mixes`/`loans` — the API routes rely on it. Back a lead up (`GET /api/aa100/mixes?lead=N`) before testing writes.

## 7. Fireberry door, board, console

- `/simulator/fb/<accountid>?n=&exp=&sig=&u=` — a signed link from a Fireberry record button (`app/simulator/lib/fblink.ts`) mints the httpOnly `fb_sim` cookie (lead + operator) and redirects to `/simulator/board`. `?u=` = the operator name (see memory `console-operator-attribution`).
- `/console` — the monitoring panel (login: `ADMIN_USER` + scrypt `ADMIN_PASS_HASH`; session cookie via `SIMULATOR_ADMIN_KEY`; 404 when the key is unset). `app/console/`: `page.tsx` (server, loads `sim_events`), `Console.tsx` (shell/rail), `Views.tsx` (five screens), `aggregate.ts`, `charts/`, `ui/kit.tsx` (shadcn sources rewritten onto `--cns-*` tokens — the global shadcn tokens are NOT mapped in this repo). To open it locally without the password, mint the cookie: `exp.hmac_sha256("admin|exp", SIMULATOR_ADMIN_KEY)` as `sim_admin`.

## 8. Design system (aa102test) — the rules that keep getting re-learned

- One card is the workbench (rail → intake → mix tabs → ledger). Bands are ruled by hairlines, never nested cards. Nothing sticks. Header is not sticky (owner's explicit ask).
- Identity: violet `#5b54d6` = משכנתא, warm orange `#e07b39` = הלוואה (`FAMILY[x].color` fills, `FAMILY[x].text` for type). Five track hues in `TRACK_HEX`. Colour is never the only signal.
- Two radii (16 card / 10 control), hairlines `--line`/`--line-2`, tabular figures, ₪ leads the number (`Money` isolates bidi).
- The mix strip's pill tabs, the dashed gradient bay and the bordered strip buttons are the **kept** design (a flat-tabs pass was built and reverted at the owner's request 2026-08-17). `.lgr-tab` is shared with three modals — never restyle it for the strip.
- The nav bar (`1fr auto 1fr`, centred tools, hairlines between) is settled — don't re-propose.
- Impeccable skill is installed at `.claude/skills/impeccable`; run its detector on touched CSS. The four baseline findings in `theme.css` (two CSS-triangle "side-tab" false positives, two `transition: width` on bars whose width IS the data) are deliberate.

## 9. Working here safely

- Worktrees: `mortgage-aa100-ink` (port 3500) is where aa102test work happens; others exist for aa4/card work. `git push` is safe; `vercel` CLI and `git add -A` are not (worktrees carry `.claude/`, screenshots, temp files). Add files explicitly.
- Line endings: files are CRLF in the working copy; Git warns "LF will be replaced" — harmless.
- Typecheck: `npx tsc --noEmit -p tsconfig.json` (slow, ~2 min). There is no eslint config.
- Chart/maths checks run in Node: `npx tsx --tsconfig tsconfig.json file.ts` (path aliases work); ECharts options can be rendered headless with `echarts.init(null, …, {renderer:'svg', ssr:true})`.
- Browser verification: the in-app Browser pane may be hidden (no compositing → Motion enters freeze at initial values, ECharts never paints). Use `playwright-cli` (skill) for real screenshots; drive inputs with the native value setter + `input` event or Playwright `fill`. A dirty board triggers `beforeunload` — reset via the receipt's "התחלה מחדש" instead of navigating.
- Telemetry/analytics rows only come from `/simulator/board`; test on `/aa102test` freely.
- Test leads: lead 2 ("יעקב הבבון") is a safe scratch lead; clear it with `POST /api/aa100/mixes {"lead":2,"mixes":[]}`.

## 10. Reference: what SmartNPV does

The owner benchmarks against SmartNPV (`snpv.co.il`). Their simulator JS is
public and unminified at `https://www.snpv.co.il/media/js/mortgage.js` — grep it
to settle what any of their fields/buttons actually do (e.g. שכפול משכנתה נוכחית
= `loan_value + loan_value_inflation [+ loan_deferred_interest] [+ fee_differences]`).

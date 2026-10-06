"use client";

// כרטיסי אשראי — every card-related debt the loaded reports list, with a tick
// that decides whether it is a loan row on the master.
//
// The tick is not a second copy of the state: it READS the master's rows
// (`source_refs`), so deleting a row in the ledger unticks it here, and ticking
// it here is the same as the import having brought it in. What the import
// brings by default is lib/cards#loanLikeCard; this is where the advisor
// overrules it.

import { Check, CreditCard } from "@phosphor-icons/react";
import Money from "./Money";
import { BankIcon } from "./bankIcons";
import { lenderLabel } from "../lib/lenders";
import type { CardItem } from "../lib/cards";

export default function CardsPanel({
  items,
  onBoard,
  onToggle,
  multiDoc,
}: {
  items: CardItem[];
  /** Refs that are rows on the master right now. */
  onBoard: Set<string>;
  onToggle: (item: CardItem, on: boolean) => void;
  /** Two reports loaded — each line says whose it is. */
  multiDoc: boolean;
}) {
  if (!items.length) return null;

  return (
    <section className="lgr-card lgr-cc" aria-labelledby="lgr-cc-title">
      <header className="lgr-head">
        <CreditCard size={17} weight="duotone" color="var(--loan-deep)" aria-hidden />
        <h2 id="lgr-cc-title" className="lgr-title">
          כרטיסי אשראי
        </h2>
        <span className="lgr-count">{items.length}</span>
      </header>

      <table className="lgr-cc-table">
        <colgroup>
          <col style={{ width: 44 }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th aria-label="בטבלה" />
            <th>גוף מימון</th>
            <th>יתרה</th>
            <th>מסגרת</th>
            <th>חיוב חודשי</th>
            <th>ריבית</th>
            <th>חודשים</th>
            <th>הערה</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const on = onBoard.has(it.ref);
            const l = it.loan;
            const rate = Number(l.interest);
            const label = lenderLabel(l.source) || l.source;
            return (
              <tr
                key={it.ref}
                data-on={on || undefined}
                onClick={() => onToggle(it, !on)}
              >
                <td>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`${label} — ${on ? "בטבלה" : "לא בטבלה"}`}
                    className="lgr-cc-box"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(it, !on);
                    }}
                  >
                    {on && <Check size={12} weight="bold" />}
                  </button>
                </td>
                <td>
                  <div className="lgr-cc-lender">
                    <BankIcon source={l.source} size={22} />
                    <div className="min-w-0">
                      <div className="lgr-cc-name" title={l.source}>
                        {label}
                      </div>
                      <div className="lgr-cc-kind">
                        {it.kind === "loan" ? "הלוואה" : "מסגרת אשראי מתחדשת"}
                        {multiDoc && it.clientName && <> · {it.clientName}</>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <Money value={l.balance} block={false} weight={600} />
                </td>
                <td className="lgr-cc-quiet">
                  {l.limit > 0 ? <Money value={l.limit} block={false} /> : "—"}
                </td>
                <td>
                  {l.knownPayment > 0 ? (
                    <Money value={l.knownPayment} block={false} />
                  ) : (
                    <span className="lgr-cc-quiet">לא דווח</span>
                  )}
                </td>
                <td className="lgr-fig">{Number.isFinite(rate) && l.interest !== "" ? `${rate}%` : "—"}</td>
                <td className="lgr-fig">{l.months || "—"}</td>
                <td>
                  <div className="lgr-cc-note">
                    {l.overdue > 0 && <span className="lgr-cc-tag" data-tone="neg">פיגור</span>}
                    {it.suggested && it.kind === "facility" && (
                      <span className="lgr-cc-tag" data-tone="loan">
                        מומלץ
                      </span>
                    )}
                    <span className="lgr-cc-reason">{it.reason}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

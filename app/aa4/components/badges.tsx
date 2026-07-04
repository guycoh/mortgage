import { House, HandCoins } from "@phosphor-icons/react";
import { catMeta } from "../debtTags";
import { BankIcon } from "./bankIcons";

/** A small circular mark that identifies the reporting bank. */
export function BankBadge({ source, size = 20 }: { source?: string; size?: number }) {
  return <BankIcon source={source} size={size} />;
}

/** Category tag: mortgage (petrol) vs loan (indigo), colour-coded with a label. */
export function TypeTag({ kind, typeLabel }: { kind?: "mortgage" | "loan"; typeLabel?: string }) {
  const m = catMeta(kind, typeLabel);
  const Icon = kind === "mortgage" ? House : HandCoins;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--r-pill)] px-1.5 py-px text-[9.5px] font-semibold"
      style={{ color: m.color, background: m.tint }}
    >
      <Icon className="size-3" weight="fill" />
      {m.label}
    </span>
  );
}

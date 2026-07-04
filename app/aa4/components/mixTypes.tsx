import { House, Coins, Wrench, StackSimple } from "@phosphor-icons/react";

// The consolidation-mix track types are their own categorisation (a separate
// process from the imported loans/mortgages). Each gets a distinct colour +
// icon so a built mix reads at a glance.
export interface MixType {
  value: string;
  label: string;
  color: string; // icon
  tint: string; // medallion background
  strong: string; // label text (AA on white)
  Icon: React.ElementType;
}

export const MIX_TYPES: MixType[] = [
  { value: "מחזור דיור", label: "מחזור דיור", color: "#1d75a1", tint: "rgba(29,117,161,0.12)", strong: "#135573", Icon: House },
  { value: "כל מטרה", label: "כל מטרה", color: "#6d5bd0", tint: "rgba(109,91,208,0.13)", strong: "#463593", Icon: Coins },
  { value: "שיפוץ", label: "שיפוץ", color: "#bf7d17", tint: "rgba(191,125,23,0.15)", strong: "#8a590f", Icon: Wrench },
  { value: "דרגה ב'", label: "דרגה ב'", color: "#0e8a80", tint: "rgba(14,138,128,0.12)", strong: "#0a655e", Icon: StackSimple },
];

export function mixTypeMeta(value?: string): MixType | undefined {
  return MIX_TYPES.find((t) => t.value === value);
}

import type { ComponentType } from "react";
import { Calculator, Equal, Globe, Landmark, Mail, Phone, Repeat2, Scale, Zap } from "lucide-react";
import { WhatsappIcon } from "./icons";

/** Canonical address of this card — what the QR code and the share sheet hand out. */
export const CARD_URL = "https://morg-orcin.vercel.app/card_guy_cohen_test";

export const person = {
  first: "גיא",
  last: "כהן",
  full: "גיא כהן",
  role: "יועץ משכנתאות",
  org: "החכם",
  phone: "0549668335",
  phoneIntl: "+972549668335",
  phonePretty: "054-966-8335",
  email: "guy@hachamm.com",
  website: "https://www.hachamm.co.il/",
  street: "דרך מנחם בגין 144",
  city: "תל אביב",
  country: "ישראל",
  logo: "/hachamm/logo.svg",
  /**
   * A 384×384 / 18 KB crop of /assets/images/imgFiles/my_image.jpg (2495×2416,
   * 1 MB). The avatar renders at ~94 px, so serving it statically at the right
   * size beats routing a megabyte through the image optimizer on every cold hit.
   */
  avatar: "/hachamm/guy-cohen-portrait.jpg",
} as const;

export const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(
  `${person.street} ${person.city}`,
)}&navigate=yes`;

export type Glyph = ComponentType<{ className?: string }>;

export type Action = { label: string; href: string; icon: Glyph; external?: boolean };

export const contactActions: Action[] = [
  { label: "טלפון", href: `tel:${person.phone}`, icon: Phone },
  { label: "וואטסאפ", href: "https://wa.me/972549668335", icon: WhatsappIcon, external: true },
  { label: 'דוא"ל', href: `mailto:${person.email}`, icon: Mail },
  { label: "אתר", href: person.website, icon: Globe, external: true },
];

export type Tool = { label: string; href: string; icon: Glyph; hint: string };

export const tools: Tool[] = [
  {
    label: "מחשבון מהיר",
    hint: "החזר חודשי",
    href: "/hachamm/calculators/simple_calculator",
    icon: Zap,
  },
  {
    label: "מחשבון יכולות",
    hint: "כושר החזר",
    href: "/hachamm/calculators/mortgage_capability",
    icon: Scale,
  },
  {
    label: "מס רכישה",
    hint: "מדרגות מס",
    href: "/hachamm/calculators/purchase_tax_calculator",
    icon: Landmark,
  },
  {
    label: "מחשבון הפוכה",
    hint: "לגיל 60+",
    href: "/hachamm/calculators/reverse_calculator",
    icon: Repeat2,
  },
  {
    label: "קרן שווה",
    hint: "לוח סילוקין",
    href: "/hachamm/calculators/equal_principal",
    icon: Equal,
  },
  {
    label: "מחשבון משכנתא",
    hint: "תמהיל מלא",
    href: "/hachamm/calculators/mortgage_calculator",
    icon: Calculator,
  },
];

export const guideHref = "/hachamm/guide/mortgage_balance";

/** Built client-side so "save contact" always matches this file and works offline. */
export function buildVCard(): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${person.last};${person.first};;;`,
    `FN:${person.full}`,
    `ORG:${person.org}`,
    `TITLE:${person.role}`,
    `TEL;TYPE=CELL,VOICE:${person.phoneIntl}`,
    `EMAIL;TYPE=INTERNET,WORK:${person.email}`,
    `URL:${person.website}`,
    `ADR;TYPE=WORK:;;${person.street};${person.city};;;${person.country}`,
    "END:VCARD",
  ].join("\r\n");
}

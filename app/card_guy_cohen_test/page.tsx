import type { Metadata, Viewport } from "next";
import { Assistant, Frank_Ruhl_Libre } from "next/font/google";

import DigitalCard from "./DigitalCard";
import { CARD_URL, person } from "./data";
import "./card.css";

/* Self-hosted at build time by next/font — no runtime request to Google. */
const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--glc-font-display",
  display: "swap",
});

const sans = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--glc-font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${person.full} · ${person.role}`,
  description: `הכרטיס הדיגיטלי של ${person.full} — ${person.role}, ${person.org}`,
  openGraph: {
    title: `${person.full} · ${person.role}`,
    description: `${person.street}, ${person.city}`,
    url: CARD_URL,
    siteName: person.org,
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "https://morg-orcin.vercel.app/assets/images/imgFiles/my_image.jpg",
        width: 1200,
        height: 630,
        alt: person.full,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${person.full} · ${person.role}`,
    description: `הכרטיס הדיגיטלי של ${person.full}`,
    images: ["https://morg-orcin.vercel.app/assets/images/imgFiles/my_image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#6e6222",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function CardGuyCohenTestPage() {
  return <DigitalCard fontClass={`${display.variable} ${sans.variable}`} />;
}

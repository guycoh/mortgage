"use client"

import Link from "next/link";
import CalendarIcon from "@/public/assets/images/svg/contact/CalendarIcon";
import EmailIcon from "@/public/assets/images/svg/EmailIcon";
import PhoneIcon from "@/public/assets/images/svg/contact/PhoneIcon";
import WhatsappIcon from "@/public/assets/images/svg/whatsapp";
import ContactIcon from "@/public/assets/images/svg/contact/ContactIcon";

export type ContactBarProps = {
  phone?: string;
  whatsapp?: string;
  contactHref?: string;
  refinanceHref?: string;
  zoomHref?: string;
};

export default function ContactBar({
  phone = "tel:0500000000",
  whatsapp = "https://wa.me/972500000000",
  contactHref = "/contact",
  refinanceHref = "/refinance-check",
  zoomHref = "/zoom-consult",
}: ContactBarProps) {
  return (
    <nav aria-label="סרגל יצירת קשר" className="z-50">
      <div className="fixed bottom-4 top-1 right-4 md:bottom-auto md:left-auto md:right-4 md:top-1/2 md:transform md:-translate-y-1/2 flex md:flex-col gap-2">
        {[
          { href: phone, icon: <PhoneIcon />, label: "חייג" },
          { href: whatsapp, icon: <WhatsappIcon />, label: "ווצאפ", target: "_blank" },
          { href: contactHref, icon: <ContactIcon />, label: "צור קשר" },
          { href: refinanceHref, icon: <CalendarIcon />, label: "בדיקת מחזור" },
          { href: zoomHref, icon: <EmailIcon />, label: "זום עם יועץ" },
        ].map((btn, idx) => (
          <Link
            key={idx}
            href={btn.href}
            target={btn.target}
            rel={btn.target ? "noopener noreferrer" : undefined}
            className="flex items-center justify-center rounded-full w-12 h-12 bg-[#1d75a1] text-white shadow-lg hover:opacity-95 transition"
            aria-label={btn.label}
          >
            {btn.icon}
          </Link>
        ))}
      </div>
    </nav>
  );
}
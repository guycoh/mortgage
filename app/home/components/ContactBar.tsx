"use client";

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
      {/* Mobile: sticky bottom */}
      <div className="fixed bottom-4 left-4 right-4 md:bottom-auto md:left-auto md:right-4 md:top-1/2 md:transform md:-translate-y-1/2 flex md:flex-col gap-2">
        <Link href={phone} className="flex items-center justify-center rounded-full w-12 h-12 bg-orange-500 text-white shadow-lg hover:opacity-95 transition" aria-label="חייג">
          <PhoneIcon />
        </Link>

        <Link href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-full w-12 h-12 bg-emerald-600 text-white shadow-lg hover:opacity-95 transition" aria-label="ווצאפ">
          <WhatsappIcon />
        </Link>

        <Link href={contactHref} className="flex items-center justify-center rounded-full w-12 h-12 bg-sky-600 text-white shadow-lg hover:opacity-95 transition" aria-label="צור קשר">
          <ContactIcon />
        </Link>

        <Link href={refinanceHref} className="flex items-center justify-center rounded-full w-12 h-12 bg-violet-600 text-white shadow-lg hover:opacity-95 transition" aria-label="בדיקת מחזור">
          <CalendarIcon />
        </Link>

        <Link href={zoomHref} className="flex items-center justify-center rounded-full w-12 h-12 bg-red-600 text-white shadow-lg hover:opacity-95 transition" aria-label="זום עם יועץ">
          <EmailIcon />
        </Link>
      </div>
    </nav>
  );
}

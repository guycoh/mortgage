import Link from "next/link";
import WhatsappIcon from "@/public/assets/images/svg/contact/WhatsappIcon";
import PhoneIcon from "@/public/assets/images/svg/contact/PhoneIcon";
import CalendarIcon from "@/public/assets/images/svg/contact/CalendarIcon";
import ContactIcon from "@/public/assets/images/svg/contact/ContactIcon";
import HomeIcon from "@/public/assets/images/svg/general/HomeIcon";

const buttonsData = [
  {
    id: "home",
    label: "דף הבית",
    Icon: HomeIcon,
    type: "link",
    href: "/muhni",
  },
  {
    id: "call",
    label: "טלפן ליועץ",
    Icon: PhoneIcon,
    type: "a",
    href: "tel:0523684844",
  },
  {
    id: "meeting",
    label: "קבע פגישה",
    Icon: CalendarIcon,
    type: "link",
    href: "/muhni/schedule",
  },
  {
    id: "whatsapp",
    label: "הודעת וואטסאפ",
    Icon: WhatsappIcon,
    type: "a",
    href: "https://wa.me/972523684844",
  },
  {
    id: "contact",
    label: "יצירת קשר",
    Icon: ContactIcon,
    type: "link",
    href: "/muhni/contact",
  },
];

export default function MobileFooter() {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-main py-3 z-50 md:hidden">
      <nav className="flex justify-around items-center" role="navigation" aria-label="סרגל ניווט תחתון">
        {buttonsData.map(({ id, label, Icon, type, href }) => {
          const content = (
            <>
              <div
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md"
                aria-hidden="true"
              >
                <Icon className="w-6 h-6 text-main" color="#6929AC" />
              </div>
              <span className="text-white text-xs mt-1">{label}</span>
            </>
          );

          if (type === "link") {
            return (
              <Link
                key={id}
                href={href}
                className="flex flex-col items-center justify-center"
                aria-label={label}
              >
                {content}
              </Link>
            );
          }

          if (type === "a") {
            return (
              <a
                key={id}
                href={href}
                className="flex flex-col items-center justify-center"
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={label}
              >
                {content}
              </a>
            );
          }

          return null;
        })}
      </nav>
    </footer>
  );
}

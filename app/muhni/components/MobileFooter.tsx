// app/components/MobileFooter.tsx

import EmailIcon from "@/public/assets/images/svg/contact/EmailIcon";
import WhatsappIcon from "@/public/assets/images/svg/contact/WhatsappIcon";
import PhoneIcon from "@/public/assets/images/svg/contact/PhoneIcon";
import CalendarIcon from "@/public/assets/images/svg/contact/CalendarIcon";
import ContactIcon from "@/public/assets/images/svg/contact/ContactIcon"; 



export default function MobileFooter() {
  const buttonsData = [
    {
      id: "contact",
      label: "יצירת קשר",
      Icon: ContactIcon,
    },
    {
      id: "call",
      label: "טלפן ליועץ",
      Icon: PhoneIcon,
    },
    {
      id: "meeting",
      label: "קבע פגישה",
      Icon: CalendarIcon,
    },
    {
      id: "whatsapp",
      label: "הודעת וואטסאפ",
      Icon: WhatsappIcon,
    },
    {
      id: "email",
      label: "שלח מייל",
      Icon:EmailIcon,
    },
  ];

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-main py-3 z-50 md:hidden">
      <div className="flex justify-around items-center">
        {buttonsData.map(({ id, label, Icon }) => (
          <button
            key={id}
            className="flex flex-col items-center justify-center"
            aria-label={label}
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
              <Icon className="w-6 h-6 text-main" color="#6929AC" />
            </div>
            <span className="text-white text-xs mt-1">{label}</span>
          </button>
        ))}
      </div>
    </footer>
  );
}

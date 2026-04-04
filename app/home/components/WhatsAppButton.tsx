import WhatsappIcon from "@/public/assets/images/svg/whatsapp";

export default function WhatsAppButton() {
  return (
    <div >
    <a
      href="https://wa.me/972502453345"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="פתח שיחת WhatsApp"
      className="inline-flex items-center justify-center  rounded-full bg-white hover:bg-green-50 transition"
    >
     <WhatsappIcon color="green" size={60} />



    </a>
   </div>

  );
}

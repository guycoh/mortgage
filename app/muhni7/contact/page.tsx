"use client"

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ContactPage = () => {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<"idle" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ⏳ אחרי הצלחה – מציג את ההודעה ל‑5 ש׳ ואז מעביר לעמוד ‎/muhni
  useEffect(() => {
    if (sent === "success") {
      const timer = setTimeout(() => {
        router.push("/muhni7");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sent, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setSent(res.ok ? "success" : "error");
      if (res.ok) setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setSent("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-galbg py-16 px-4">
      <div className="max-w-4xl mx-auto bg-gray-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row-reverse relative">
        {/* שכבת טעינה */}
        {sending && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur flex flex-col items-center justify-center z-10">
            <span className="loader mb-4" />
            <p className="text-main text-lg font-semibold">שולח הודעה...</p>
          </div>
        )}

        {/* תמונה בצד שמאל */}
        <div className="hidden md:block md:w-1/2 relative rounded-l-3xl overflow-hidden">
          <Image
            src="/assets/images/imgFiles/contactus.jpg"
            alt="צור קשר"
            fill
            className="object-cover w-full h-full"
          />
        </div>

        {/* טופס בצד ימין */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center rounded-r-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-main mb-4 text-center md:text-right">צור קשר</h1>
          <p className="text-gray-700 text-md md:text-lg mb-6 text-center md:text-right leading-relaxed">
            אנחנו כאן כדי להקשיב, לייעץ וללוות אותך בדרך לחופש פיננסי...
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4 w-full max-w-md mx-auto">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="שם מלא"
              required
              className="h-11 md:h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="אימייל"
              required
              className="h-11 md:h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="טלפון"
              required
              className="h-11 md:h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="איך נוכל לעזור לך?"
              rows={4}
              required
              className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />

            <button
              type="submit"
              disabled={sending}
              className="bg-main text-white font-semibold py-3 rounded-xl hover:bg-[#155a81] disabled:opacity-50"
            >
              {sending ? "שולח..." : "שלח הודעה"}
            </button>

            {sent === "success" && (
              <p className="text-green-700 text-center">ההודעה נשלחה – מעביר לדף הבית...</p>
            )}
            {sent === "error" && (
              <p className="text-red-700 text-center">אירעה שגיאה, נסה שוב או התקשר אלינו</p>
            )}
          </form>
        </div>
      </div>
      <style jsx>{`
        .loader {
          width: 48px;
          height: 48px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #f57c00;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ContactPage;








import Link from "next/link";
import Image from "next/image";
const ContactPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg overflow-hidden flex flex-col md:flex-row">
        {/* Left Section: SVG Illustration */}
        <div className="bg-[#1d75a1] p-8 md:w-1/2 flex items-center justify-center">
         <Image
                  src="/assets/images/imgFiles/contactus.jpg"
                  alt="ביטוח חיים ומבנה למשכנתא"
                  width={400}
                  height={200}
                 
                />
        </div>

        {/* Right Section: Contact Form */}
        <div className="p-8 md:w-1/2">
          <h2 className="text-3xl font-extrabold text-gray-800 mb-4">
            צור קשר
          </h2>
          <p className="text-gray-600 mb-8">
            השאירו פרטים ונחזור אליכם בהקדם האפשרי להתייעצות בנושאי משכנתאות
            ופיננסים.
          </p>
          <form>
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                שם מלא
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="הזינו את שמכם המלא"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                טלפון
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="הזינו את מספר הטלפון"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700"
              >
                הודעה
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="כתבו הודעה..."
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors"
            >
              שליחה
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

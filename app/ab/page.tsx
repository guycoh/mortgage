'use client';

export default function BackgroundVideoPage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* וידאו ברקע */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="assets/video/background.mp4" type="video/mp4" />
        הדפדפן שלך לא תומך בווידאו.
      </video>

      {/* תוכן מעל הווידאו */}
      <div className="relative z-10 flex items-center justify-center h-full bg-black/50 text-white text-center px-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            ברוכים הבאים לאתר שלנו
          </h1>
          <p className="text-xl md:text-2xl mb-6">
            רקע וידאו מרשים שמושך תשומת לב
          </p>
          <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition">
            קבלו הצעה
          </button>
        </div>
      </div>
    </div>
  );
}

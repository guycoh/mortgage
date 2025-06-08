'use client';

import React from 'react';

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* רקע וידאו */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/video/hero-bg.mp4" type="video/mp4" />
        הדפדפן שלך לא תומך בווידאו.
      </video>

      {/* שכבת החושך/צבע חצי שקופה מעל הווידאו */}
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 z-10"></div>

      {/* תוכן על הווידאו */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center h-full text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">ברוכים הבאים למורגי</h1>
        <p className="text-lg md:text-2xl mb-6">העתיד של המשכנתאות מתחיל כאן</p>
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-full transition duration-300">
          התחילו עכשיו
        </button>
      </div>
    </main>
  );
}

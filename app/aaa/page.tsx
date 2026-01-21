"use client";

import { useState } from "react";

const items = [
  { title: "סימולטור משכנתא", subtitle: "חישוב חכם" },
  { title: "בדיקת זכאות", subtitle: "משרד השיכון" },
  { title: "הוצאות נלוות", subtitle: "תמונה מלאה" },
  { title: "ליווי אישי", subtitle: "יועץ פרטי" },
  { title: "אודות מורגי", subtitle: "מי אנחנו" },
];

export default function Circular3DCarousel() {
  const [active, setActive] = useState(0);
  const radius = 380;

  return (
   <>
   
   <section className="relative w-full py-28 bg-gradient-to-b from-white to-gray-100 overflow-hidden">
      <div className="relative mx-auto h-[420px] max-w-6xl perspective-[1600px]">
        <div className="absolute inset-0 flex items-center justify-center">
          {items.map((item, i) => {
            const angle = ((i - active) * 360) / items.length;
            const isActive = i === active;

            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="absolute focus:outline-none"
                style={{
                  transform: `
                    rotateY(${angle}deg)
                    translateZ(${radius}px)
                  `,
                  transition: "transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <div
                  className={`w-52 h-52 rounded-full bg-white border border-gray-200
                    flex flex-col items-center justify-center text-center
                    shadow-[0_25px_70px_rgba(0,0,0,0.12)]
                    transition-all duration-700
                    ${isActive ? "scale-110 shadow-[0_35px_90px_rgba(0,0,0,0.18)]" : "scale-95 opacity-80"}
                  `}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.subtitle}
                  </p>

                  {isActive && (
                    <span className="mt-4 text-sm font-medium text-orange-500">
                      כניסה →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-6">
          <button
            onClick={() => setActive((prev) => (prev - 1 + items.length) % items.length)}
            className="px-5 py-2 rounded-full bg-white border border-gray-300 shadow hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => setActive((prev) => (prev + 1) % items.length)}
            className="px-5 py-2 rounded-full bg-white border border-gray-300 shadow hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>
    </section>







</>



  );
}

"use client";

import { useState } from "react";

export default function Coverflow() {
  const cards = [
    "מחשבון משכנתא",
    "מחשבון זכאות",
    "מחשבון החזר",
    "מחשבון ריבית",
    "מחשבון מיחזור",
    "איחוד הלוואות",
    "הון עצמי",
    "יכולת החזר",
  ];

  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="w-full h-[500px] flex items-center justify-center bg-white overflow-hidden">
      <div className="relative w-full flex items-center justify-center">
        {cards.map((title, i) => {
          const center = cards.length / 2;
          const offset = i - center;

          return (
            <div
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="absolute w-[160px] h-[200px] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300"
              style={{
                transform: `
                  translateX(${offset * 120}px)
                  translateZ(${active === i ? 80 : -Math.abs(offset) * 20}px)
                  scale(${active === i ? 1.15 : 1 - Math.abs(offset) * 0.1})
                  rotateY(${offset * 25}deg)
                `,
                zIndex: active === i ? 50 : 10 - Math.abs(offset),
                background: "linear-gradient(135deg,#1f77b4,#4aa3df)",
                color: "white",
                boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              }}
            >
              <div className="text-center text-sm font-bold px-2">
                {title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
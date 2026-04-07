"use client";

export default function RotatingCylinder() {
  const cards = [
    "29, 117, 161",
    "40, 130, 175",
    "55, 145, 190",
    "70, 160, 205",
    "90, 175, 220",
    "110, 190, 235",
    "130, 200, 245",
    "100, 170, 210",
    "70, 140, 180",
    "45, 120, 160",
  ];

  const quantity = cards.length;

  return (
    <div className="w-full h-[500px] flex items-center justify-center overflow-hidden relative">
      
      <div
        className="absolute"
        style={{
          width: "110px",
          height: "160px",
          transformStyle: "preserve-3d",
          animation: "spin3d 40s linear infinite", // 🐢 איטי יותר
        }}
      >
        {cards.map((color, index) => (
          <div
            key={index}
            className="absolute inset-0 rounded-xl overflow-hidden border-2"
            style={{
              borderColor: `rgba(${color})`,
              transform: `
                rotateY(${(360 / quantity) * index}deg)
                translateZ(260px)
              `,
            }}
          >
            <div
              className="w-full h-full"
              style={{
                background: `radial-gradient(
                  circle,
                  rgba(${color}, 0.25) 0%,
                  rgba(${color}, 0.6) 70%,
                  rgba(${color}, 0.95) 100%
                )`,
              }}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes spin3d {
          from {
            transform: perspective(1000px) rotateX(-15deg) rotateY(0deg);
          }
          to {
            transform: perspective(1000px) rotateX(-15deg)
              rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
}
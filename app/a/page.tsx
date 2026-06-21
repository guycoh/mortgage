"use client";

export default function RotatingCylinder() {
  // const cards = [
  //   "29, 117, 161",
  //   "40, 130, 175",
  //   "55, 145, 190",
  //   "70, 160, 205",
  //   "90, 175, 220",
  //   "110, 190, 235",
  //   "130, 200, 245",
  //   "100, 170, 210",
  //   "70, 140, 180",
  //   "45, 120, 160",
  // ];


const cards = [
  { color: "29, 117, 161", title: "מחשבון משכנתא" },
  { color: "40, 130, 175", title: "מחשבון זכאות" },
  { color: "55, 145, 190", title: "מחשבון החזר חודשי" },
  { color: "70, 160, 205", title: "מחשבון ריבית" },
  { color: "90, 175, 220", title: "מחשבון מיחזור" },
  { color: "110, 190, 235", title: "מחשבון איחוד הלוואות" },
  { color: "130, 200, 245", title: "מחשבון הון עצמי" },
  { color: "100, 170, 210", title: "מחשבון יכולת החזר" },
  { color: "70, 140, 180", title: "מחשבון עלויות נלוות" },
  { color: "45, 120, 160", title: "מדריך משכנתא" },
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
        {/* {cards.map((color, index) => (
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
        ))} */}
    
    
    {cards.map((item, index) => (
  <div
    key={index}
    className="absolute inset-0 rounded-xl overflow-hidden border-2 flex items-center justify-center"
    style={{
      borderColor: `rgba(${item.color})`,
      transform: `
        rotateY(${(360 / quantity) * index}deg)
        translateZ(260px)
      `,
    }}
  >
    {/* רקע גרדיאנט */}
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(
          circle,
          rgba(${item.color}, 0.25) 0%,
          rgba(${item.color}, 0.6) 70%,
          rgba(${item.color}, 0.95) 100%
        )`,
      }}
    />

    {/* טקסט מחשבון */}
    <div className="relative z-10 text-white text-center px-2">
      <div className="text-sm font-semibold leading-tight">
        {item.title}
      </div>
    </div>
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
"use client";

import React from "react";

export default function Header3DClean() {
  return (
    <header className="bg-white flex justify-center items-center py-2">
      <div
        dir="rtl"
        className="w-[95%] h-14 bg-[#1d75a1] text-white rounded-md shadow-[0_4px_15px_rgba(0,0,0,0.25)] relative overflow-hidden"
        style={{
          transform: "translateZ(0)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 3px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {/* שכבת הדמיה של תלת מימד עדין */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#166083] to-[#1d75a1] opacity-90"></div>

        {/* תוכן התפריט */}
        <div className="relative z-10 flex justify-between items-center h-full px-6 font-semibold text-sm">
          {/* תפריט בצד ימין */}
          <nav className="flex gap-6">
            <a href="#" className="hover:text-cyan-200 transition">
              דף הבית
            </a>
            <a href="#" className="hover:text-cyan-200 transition">
              מחשבון זכאות
            </a>
            <a href="#" className="hover:text-cyan-200 transition">
              סימולטור משכנתא
            </a>
            <a href="#" className="hover:text-cyan-200 transition">
              צור קשר
            </a>
          </nav>

          {/* לוגו בצד שמאל */}
          <span className="text-lg font-bold tracking-wide">MORGI</span>
        </div>

        {/* אפקט תלת מימד קטן מתחת */}
        <div className="absolute bottom-0 left-0 w-full h-[6px] bg-gradient-to-b from-[#134d6d] to-[#0b2f42]" />
      </div>
    </header>
  );
}


// // MortgageHeroNoLibs.tsx
// "use client"

// import React, { useEffect, useRef } from "react";

// type Props = { className?: string };

// export default function MortgageHeroNoLibs({ className = "h-[520px] w-full" }: Props) {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const wrapperRef = useRef<HTMLDivElement | null>(null);
//   const pointerRef = useRef({ x: 0, y: 0 });

//   // Particles on canvas (no libs)
//   useEffect(() => {
//     const canvas = canvasRef.current!;
//     const ctx = canvas.getContext("2d")!;
//     let w = (canvas.width = canvas.clientWidth * devicePixelRatio);
//     let h = (canvas.height = canvas.clientHeight * devicePixelRatio);
//     ctx.scale(devicePixelRatio, devicePixelRatio);

//     const DPR = devicePixelRatio || 1;
//     let particles: {
//       x: number;
//       y: number;
//       vx: number;
//       vy: number;
//       r: number;
//       alpha: number;
//       life: number;
//       maxLife: number;
//     }[] = [];

//     const spawn = (n = 1) => {
//       for (let i = 0; i < n; i++) {
//         const r = 1 + Math.random() * 3.8;
//         particles.push({
//           x: Math.random() * canvas.clientWidth,
//           y: canvas.clientHeight + 10 + Math.random() * 40,
//           vx: (Math.random() - 0.5) * 0.4,
//           vy: -0.3 - Math.random() * 0.9,
//           r,
//           alpha: 0.04 + Math.random() * 0.18,
//           life: 0,
//           maxLife: 120 + Math.random() * 240,
//         });
//       }
//     };

//     // initial burst
//     spawn(80);

//     let raf = 0;
//     function onResize() {
//       w = (canvas.width = canvas.clientWidth * DPR);
//       h = (canvas.height = canvas.clientHeight * DPR);
//       ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
//     }
//     window.addEventListener("resize", onResize);

//     function frame() {
//       raf = requestAnimationFrame(frame);
//       ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

//       // subtle background radial gradient (drawn in canvas for perf)
//       const g = ctx.createRadialGradient(canvas.clientWidth * 0.5, canvas.clientHeight * 0.45, 10,
//         canvas.clientWidth * 0.5, canvas.clientHeight * 0.45, canvas.clientWidth * 0.9);
//       g.addColorStop(0, "rgba(10,18,30,0.85)");
//       g.addColorStop(1, "rgba(2,6,12,0.95)");
//       ctx.fillStyle = g;
//       ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

//       // spawn occasionally
//       if (particles.length < 220 && Math.random() < 0.6) spawn(2);

//       // draw particles
//       for (let i = particles.length - 1; i >= 0; i--) {
//         const p = particles[i];
//         p.x += p.vx + (pointerRef.current.x * 0.2);
//         p.y += p.vy + (pointerRef.current.y * 0.2);
//         p.life++;
//         // fade in/out
//         const lifeRatio = p.life / p.maxLife;
//         const a = p.alpha * Math.max(0, 1 - lifeRatio);
//         ctx.globalAlpha = a;

//         // soft glow using radial gradient
//         const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
//         grad.addColorStop(0, "rgba(255,240,220,0.9)");
//         grad.addColorStop(0.2, "rgba(255,200,120,0.55)");
//         grad.addColorStop(1, "rgba(255,120,80,0)");
//         ctx.fillStyle = grad;
//         ctx.beginPath();
//         ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
//         ctx.fill();

//         // remove dead
//         if (p.life > p.maxLife || p.y < -40 || p.x < -60 || p.x > canvas.clientWidth + 60) {
//           particles.splice(i, 1);
//         }
//       }

//       ctx.globalAlpha = 1;
//     }
//     raf = requestAnimationFrame(frame);

//     return () => {
//       cancelAnimationFrame(raf);
//       window.removeEventListener("resize", onResize);
//     };
//   }, []);

//   // pointer parallax
//   useEffect(() => {
//     const onMove = (e: PointerEvent) => {
//       const rect = wrapperRef.current!.getBoundingClientRect();
//       const x = (e.clientX - rect.left) / rect.width; // 0..1
//       const y = (e.clientY - rect.top) / rect.height; // 0..1
//       // center -0.5..0.5
//       pointerRef.current.x = (x - 0.5) * 2;
//       pointerRef.current.y = (y - 0.5) * 2;
//     };
//     const node = wrapperRef.current!;
//     node.addEventListener("pointermove", onMove);
//     node.addEventListener("pointerleave", () => { pointerRef.current.x = 0; pointerRef.current.y = 0; });
//     return () => {
//       node.removeEventListener("pointermove", onMove);
//     };
//   }, []);

//   return (
//     <div
//       ref={wrapperRef}
//       className={`relative overflow-hidden rounded-2xl ${className} bg-gradient-to-b from-[#061026] via-[#08112a] to-[#021018]`}
//     >
//       {/* canvas background particles */}
//       <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block" }} />

//       {/* floating orbs (pure DOM + CSS transforms) */}
//       <div
//         aria-hidden
//         className="absolute inset-0 pointer-events-none"
//         style={{
//           transformStyle: "preserve-3d",
//         }}
//       >
//         {/* large holo orb - uses CSS animations only */}
//         <div
//           className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
//           style={{
//             width: 420,
//             height: 420,
//             borderRadius: "50%",
//             filter: "blur(28px) saturate(120%)",
//             background: "radial-gradient(circle at 30% 30%, rgba(255,190,120,0.16), rgba(120,140,255,0.08) 35%, transparent 60%)",
//             mixBlendMode: "screen",
//             transform: "translateZ(0)",
//             animation: "floatSlow 12s ease-in-out infinite",
//           }}
//         />
//         {/* medium orb */}
//         <div
//           style={{
//             position: "absolute",
//             right: "8%",
//             top: "18%",
//             width: 160,
//             height: 160,
//             borderRadius: "50%",
//             background: "linear-gradient(135deg, rgba(255,220,180,0.25), rgba(80,120,255,0.12))",
//             filter: "blur(10px)",
//             mixBlendMode: "screen",
//             animation: "float 8s ease-in-out infinite",
//             transform: "translateZ(80px)",
//           }}
//         />
//         {/* small sparkle group */}
//         <div style={{ position: "absolute", left: "12%", bottom: "24%", width: 240, height: 240, perspective: 600 }}>
//           <div
//             style={{
//               width: "100%",
//               height: "100%",
//               transformStyle: "preserve-3d",
//               animation: "spinY 22s linear infinite",
//             }}
//           >
//             {Array.from({ length: 10 }).map((_, i) => {
//               const size = 6 + Math.random() * 10;
//               const left = Math.random() * 100;
//               const top = Math.random() * 100;
//               const z = (Math.random() - 0.5) * 300;
//               const delay = Math.random() * 4;
//               return (
//                 <div
//                   key={i}
//                   style={{
//                     position: "absolute",
//                     left: `${left}%`,
//                     top: `${top}%`,
//                     width: size,
//                     height: size,
//                     borderRadius: 9999,
//                     background: "rgba(255,245,220,0.95)",
//                     boxShadow: "0 0 10px 6px rgba(255,200,120,0.14)",
//                     transform: `translateZ(${z}px)`,
//                     opacity: 0.9,
//                     animation: `pulse ${3 + Math.random() * 3}s ease-in-out ${delay}s infinite`,
//                   }}
//                 />
//               );
//             })}
//           </div>
//         </div>

//         {/* stylized mortgage object (SVG stack) */}
//         <div
//           style={{
//             position: "absolute",
//             left: "50%",
//             bottom: "8%",
//             transform: `translateX(-50%) translateZ(120px)`,
//             width: 320,
//             maxWidth: "48%",
//             pointerEvents: "auto",
//           }}
//           className="backdrop-blur-md"
//         >
//           <div
//             style={{
//               padding: 18,
//               borderRadius: 18,
//               background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(8,12,20,0.12))",
//               border: "1px solid rgba(255,255,255,0.04)",
//               boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
//               transform: "translateZ(40px) rotateX(6deg)",
//             }}
//           >
//             <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
//               <svg width="64" height="64" viewBox="0 0 48 48" fill="none" aria-hidden>
//                 <rect x="6" y="12" width="36" height="24" rx="3" fill="rgba(255,255,255,0.06)" />
//                 <path d="M8 28h32" stroke="rgba(255,255,255,0.08)" strokeWidth="1.4" />
//                 <path d="M16 18h16" stroke="rgba(255,255,255,0.18)" strokeWidth="1.6" strokeLinecap="round" />
//               </svg>
//               <div style={{ color: "white" }}>
//                 <div style={{ fontSize: 13, opacity: 0.86 }}>מחשבון משכנתא חכם</div>
//                 <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>בדוק אפשרויות מימון</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* overlay CTA */}
//       <div className="absolute z-30 left-6 top-6 text-white/90">
//         <div className="text-xs uppercase tracking-wide">Morgi</div>
//         <div className="text-2xl font-semibold mt-1">כלי חכם למשכנתאות</div>
//       </div>

//       <style jsx>{`
//         @keyframes float {
//           0% { transform: translateY(0) translateZ(0); }
//           50% { transform: translateY(-18px) translateZ(12px); }
//           100% { transform: translateY(0) translateZ(0); }
//         }
//         @keyframes floatSlow {
//           0% { transform: translateY(0) rotate(0deg); }
//           50% { transform: translateY(-28px) rotate(8deg); }
//           100% { transform: translateY(0) rotate(0deg); }
//         }
//         @keyframes spinY {
//           from { transform: rotateY(0deg); }
//           to { transform: rotateY(360deg); }
//         }
//         @keyframes pulse {
//           0% { transform: scale(0.85); opacity: 0.7; }
//           50% { transform: scale(1.25); opacity: 1; }
//           100% { transform: scale(0.85); opacity: 0.7; }
//         }
//       `}</style>
//     </div>
//   );
// }

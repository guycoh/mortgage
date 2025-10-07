"use client"

export default function Mortgage3DBoxFlatFront() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e6eff3]">
      <div className="relative">
        {/* גוף התיבה */}
        <div
          className="relative w-[360px] h-[240px] rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #1d75a1 0%, #15516f 100%)",
            boxShadow:
              "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
          }}
        >
          {/* קצה עליון - כאילו השכבה העליונה מוארת */}
          <div className="absolute top-0 left-0 w-full h-[10px] bg-white/20"></div>

          {/* תוכן המחשבון */}
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-white">
            <h2 className="text-xl font-bold tracking-wide">מחשבון משכנתא</h2>
            <div className="w-3/4 space-y-2">
              <input
                placeholder="גובה המשכנתא"
                className="w-full rounded-md p-2 text-gray-900 text-sm bg-white/95 shadow-inner focus:outline-none"
              />
              <input
                placeholder="ריבית שנתית (%)"
                className="w-full rounded-md p-2 text-gray-900 text-sm bg-white/95 shadow-inner focus:outline-none"
              />
              <input
                placeholder="מספר חודשים"
                className="w-full rounded-md p-2 text-gray-900 text-sm bg-white/95 shadow-inner focus:outline-none"
              />
            </div>
          </div>

          {/* קצה תחתון עם הצללה עדינה */}
        <div className="absolute bottom-0 left-0 w-full h-[14px] bg-black/20 blur-[2px]"></div>
        </div>

        {/* בסיס/שולחן */}
        <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 w-[360px] h-[10px] bg-gradient-to-b from-[#a9b7bf] to-[#6c7b84] rounded-b-xl shadow-md"></div>

        {/* צל רך מתחת */}
        <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 w-[300px] h-[20px] bg-black/20 blur-2xl rounded-full"></div>
      </div>
    </div>
  );
}



// // MortgageHeroUltraNoLibs.tsx
// "use client";
// import React, { useEffect, useRef, useState } from "react";

// /**
//  * MortgageHeroUltraNoLibs
//  * - No external libs
//  * - Canvas for particles
//  * - DOM + SVG for layered "3D" orb + glow
//  * - Parallax by pointer/touch
//  *
//  * Props:
//  *  - className?: string (tailwind allowed)
//  *  - height?: number | string (e.g. 560 or '60vh')
//  *  - primary?: string (hex) main brand glow
//  *  - accent?: string (hex) secondary glow
//  *  - showCTA?: boolean
//  *  - onCTAClick?: () => void
//  */
// type Props = {
//   className?: string;
//   height?: number | string;
//   primary?: string;
//   accent?: string;
//   showCTA?: boolean;
//   onCTAClick?: () => void;
// };

// export default function MortgageHeroUltraNoLibs({
//   className = "",
//   height = 560,
//   primary = "#ffb86b",
//   accent = "#7cc1ff",
//   showCTA = true,
//   onCTAClick,
// }: Props) {
//   const wrapperRef = useRef<HTMLDivElement | null>(null);
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 }); // tx/ty are smoothed
//   const rafRef = useRef<number | null>(null);
//   const [reduced, setReduced] = useState(false);
//   const [perfMode, setPerfMode] = useState(false);

//   // particles state stored outside React to avoid rerenders
//   const particlesRef = useRef<
//     {
//       x: number;
//       y: number;
//       vx: number;
//       vy: number;
//       r: number;
//       life: number;
//       maxLife: number;
//       hue: number;
//     }[]
//   >([]);

//   // utility: clamp
//   const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

//   // responsiveness & reduced-motion check
//   useEffect(() => {
//     const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
//     setReduced(mq.matches);
//     const onChange = () => setReduced(mq.matches);
//     mq.addEventListener?.("change", onChange);
//     // performance heuristics (low-end devices -> perfMode)
//     const cores = (navigator as any).hardwareConcurrency || 4;
//     const mem = (navigator as any).deviceMemory || 4;
//     if (cores <= 2 || mem <= 2) setPerfMode(true);
//     return () => mq.removeEventListener?.("change", onChange);
//   }, []);

//   // Initialize canvas size + devicePixelRatio scaling
//   useEffect(() => {
//     const canvas = canvasRef.current!;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d")!;
//     const DPR = Math.max(1, window.devicePixelRatio || 1);

//     function resize() {
//       const rect = canvas.getBoundingClientRect();
//       canvas.width = Math.floor(rect.width * DPR);
//       canvas.height = Math.floor(rect.height * DPR);
//       ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
//     }
//     resize();
//     const ro = new ResizeObserver(resize);
//     ro.observe(canvas);
//     return () => ro.disconnect();
//   }, []);

//   // spawn particles helper
//   function spawnParticles(n = 1) {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const W = canvas.clientWidth;
//     const H = canvas.clientHeight;
//     for (let i = 0; i < n; i++) {
//       const r = 0.6 + Math.random() * 3.6;
//       particlesRef.current.push({
//         x: Math.random() * W,
//         y: H + 10 + Math.random() * 60,
//         vx: (Math.random() - 0.5) * 0.6,
//         vy: -0.6 - Math.random() * 1.4,
//         r,
//         life: 0,
//         maxLife: 100 + Math.random() * 220,
//         hue: Math.random() * 60 - 10, // for warm palette shift
//       });
//     }
//   }

//   // Canvas draw loop
//   useEffect(() => {
//     if (reduced) return; // if reduced motion, skip heavy animation
//     const canvas = canvasRef.current!;
//     const ctx = canvas.getContext("2d")!;
//     let last = performance.now();

//     // initial burst
//     spawnParticles(perfMode ? 50 : 110);

//     function frame(t: number) {
//       rafRef.current = requestAnimationFrame(frame);
//       const dt = clamp((t - last) / 16.67, 0.25, 4); // normalize to ~60fps
//       last = t;

//       const W = canvas.clientWidth;
//       const H = canvas.clientHeight;

//       // fade background slightly (creates trailing glow)
//       ctx.clearRect(0, 0, W, H);
//       // background radial soft vignette
//       const bg = ctx.createLinearGradient(0, 0, 0, H);
//       bg.addColorStop(0, "rgba(3,7,14,0.9)");
//       bg.addColorStop(1, "rgba(2,6,10,0.95)");
//       ctx.fillStyle = bg;
//       ctx.fillRect(0, 0, W, H);

//       // occasionally spawn
//       if (particlesRef.current.length < (perfMode ? 180 : 420) && Math.random() < (perfMode ? 0.35 : 0.9)) {
//         spawnParticles(perfMode ? 2 : 6);
//       }

//       // smooth pointer (tx/ty)
//       pointer.current.tx += (pointer.current.x - pointer.current.tx) * 0.12;
//       pointer.current.ty += (pointer.current.y - pointer.current.ty) * 0.12;

//       // draw particles (glowing)
//       for (let i = particlesRef.current.length - 1; i >= 0; i--) {
//         const p = particlesRef.current[i];
//         p.x += (p.vx + (pointer.current.tx * 0.5)) * dt;
//         p.y += (p.vy + (pointer.current.ty * 0.5)) * dt;
//         p.life += dt;

//         const lifeRatio = p.life / p.maxLife;
//         const alpha = Math.max(0, 1 - lifeRatio);

//         // glow radial gradient for each particle
//         const rad = p.r * (1 + 0.9 * (1 - lifeRatio));
//         const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 8);
//         // color balance between primary and accent with tiny hue shift
//         grad.addColorStop(0, `rgba(255,235,200,${0.85 * alpha})`);
//         grad.addColorStop(0.2, `rgba(255,180,110,${0.45 * alpha})`);
//         grad.addColorStop(1, `rgba(40,70,120,0)`);
//         ctx.globalCompositeOperation = "screen";
//         ctx.fillStyle = grad;
//         ctx.beginPath();
//         ctx.arc(p.x, p.y, rad * 6, 0, Math.PI * 2);
//         ctx.fill();

//         // soft center dot
//         ctx.globalCompositeOperation = "lighter";
//         ctx.fillStyle = `rgba(255,255,255,${0.04 * alpha})`;
//         ctx.beginPath();
//         ctx.arc(p.x, p.y, p.r * 1.2, 0, Math.PI * 2);
//         ctx.fill();

//         // cleanup
//         if (p.life > p.maxLife || p.y < -80 || p.x < -80 || p.x > W + 80) {
//           particlesRef.current.splice(i, 1);
//         }
//       }
//       ctx.globalCompositeOperation = "source-over";
//     }

//     rafRef.current = requestAnimationFrame(frame);
//     return () => {
//       if (rafRef.current) cancelAnimationFrame(rafRef.current);
//       rafRef.current = null;
//       particlesRef.current.length = 0;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [reduced, perfMode]);

//   // Pointer handling - update pointer.x/y relative centered -1..1
//   useEffect(() => {
//     const node = wrapperRef.current!;
//     if (!node) return;

//     function onPointer(e: PointerEvent) {
//       const rect = node.getBoundingClientRect();
//       const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
//       const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
//       pointer.current.x = clamp(x, -1, 1);
//       pointer.current.y = clamp(y, -1, 1);
//     }
//     function onTouch(e: TouchEvent) {
//       const t = e.touches[0];
//       if (!t) return;
//       const rect = node.getBoundingClientRect();
//       const x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
//       const y = -(((t.clientY - rect.top) / rect.height) * 2 - 1);
//       pointer.current.x = clamp(x, -1, 1);
//       pointer.current.y = clamp(y, -1, 1);
//     }
//     function onLeave() {
//       pointer.current.x = 0;
//       pointer.current.y = 0;
//     }

//     node.addEventListener("pointermove", onPointer);
//     node.addEventListener("pointerleave", onLeave);
//     node.addEventListener("touchmove", onTouch, { passive: true });
//     node.addEventListener("touchend", onLeave);
//     return () => {
//       node.removeEventListener("pointermove", onPointer);
//       node.removeEventListener("pointerleave", onLeave);
//       node.removeEventListener("touchmove", onTouch);
//       node.removeEventListener("touchend", onLeave);
//     };
//   }, []);

//   // CSS variables for brand colors (used by SVG layers)
//   const customStyle: React.CSSProperties = {
//     ["--mh-primary" as any]: primary,
//     ["--mh-accent" as any]: accent,
//   };

//   // Render
//   return (
//     <div
//       ref={wrapperRef}
//       className={`relative overflow-hidden rounded-2xl ${className}`}
//       style={{
//         height: typeof height === "number" ? `${height}px` : height,
//         background: "linear-gradient(180deg,#04101a,#061226 40%,#021016)",
//         ...customStyle,
//       }}
//       aria-hidden={reduced ? "true" : undefined}
//     >
//       {/* Canvas layer (particles) */}
//       <canvas
//         ref={canvasRef}
//         className="absolute inset-0 w-full h-full"
//         style={{ display: reduced ? "none" : undefined }}
//       />

//       {/* Center 3D-like orb stack (SVG + CSS layers) */}
//       <div
//         className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
//         style={{
//           width: "44vmin",
//           maxWidth: 540,
//           minWidth: 260,
//           transformStyle: "preserve-3d",
//           perspective: 1200,
//         }}
//       >
//         {/* container that will slightly rotate / parallax based on pointer */}
//         <div
//           className="relative"
//           style={{
//             transform: `translateZ(0) rotateX(${pointer.current.ty * 8}deg) rotateY(${pointer.current.tx * -10}deg)`,
//             transition: reduced ? "none" : "transform 240ms linear",
//           }}
//         >
//           {/* soft back glow */}
//           <div
//             style={{
//               position: "absolute",
//               left: "50%",
//               top: "50%",
//               transform: "translate(-50%,-50%)",
//               width: "76%",
//               height: "76%",
//               borderRadius: "50%",
//               filter: "blur(40px) saturate(140%)",
//               background: `radial-gradient(circle at 40% 30%, ${primary}22, ${accent}11 30%, transparent 65%)`,
//               mixBlendMode: "screen",
//               pointerEvents: "none",
//             }}
//           />

//           {/* layered SVG disc for structure */}
//           <svg
//             viewBox="0 0 400 400"
//             width="100%"
//             height="100%"
//             style={{
//               display: "block",
//               borderRadius: "50%",
//               transform: "translateZ(80px) scale(1)",
//               willChange: "transform",
//               pointerEvents: "none",
//             }}
//           >
//             <defs>
//               <radialGradient id="mh-core" cx="40%" cy="38%">
//                 <stop offset="0%" stopColor="white" stopOpacity="0.95" />
//                 <stop offset="18%" stopColor={primary} stopOpacity="0.65" />
//                 <stop offset="45%" stopColor={accent} stopOpacity="0.25" />
//                 <stop offset="100%" stopColor="#000000" stopOpacity="0" />
//               </radialGradient>

//               <filter id="mh-ring-blur" x="-50%" y="-50%" width="200%" height="200%">
//                 <feGaussianBlur stdDeviation="10" result="b" />
//                 <feBlend in="SourceGraphic" in2="b" mode="screen" />
//               </filter>

//               <linearGradient id="mh-sheen" x1="0" x2="1">
//                 <stop offset="0" stopColor="#ffffff22" />
//                 <stop offset="1" stopColor="#ffffff00" />
//               </linearGradient>

//               <filter id="mh-shadow" x="-50%" y="-50%" width="200%" height="200%">
//                 <feDropShadow dx="0" dy="8" stdDeviation="22" floodColor="#000" floodOpacity="0.45" />
//               </filter>
//             </defs>

//             {/* outer subtle rings */}
//             <g filter="url(#mh-ring-blur)">
//               <circle cx="200" cy="200" r="160" fill="none" stroke={accent} strokeOpacity="0.06" strokeWidth="2" />
//               <circle cx="200" cy="200" r="120" fill="none" stroke={primary} strokeOpacity="0.07" strokeWidth="1.8" />
//             </g>

//             {/* central core */}
//             <circle cx="200" cy="200" r="70" fill="url(#mh-core)" filter="url(#mh-shadow)" />

//             {/* glossy sheen */}
//             <ellipse cx="150" cy="115" rx="70" ry="26" fill="url(#mh-sheen)" opacity="0.45" />

//             {/* animated orbit lines (CSS animation below will rotate this group) */}
//             <g id="orbits" style={{ transformOrigin: "200px 200px" }}>
//               <ellipse cx="200" cy="200" rx="160" ry="36" fill="none" stroke={accent} strokeOpacity="0.06" strokeWidth="1.4" />
//               <ellipse cx="200" cy="200" rx="130" ry="22" fill="none" stroke={primary} strokeOpacity="0.06" strokeWidth="1.1" />
//             </g>

//             {/* little sparks around core */}
//             {Array.from({ length: 8 }).map((_, i) => {
//               const angle = (i / 8) * Math.PI * 2;
//               const x = 200 + Math.cos(angle) * (110 + (i % 2 ? 6 : -6));
//               const y = 200 + Math.sin(angle) * (40 + (i % 3 ? 6 : -6));
//               return <circle key={i} cx={x} cy={y} r={2 + (i % 3)} fill="#fff" opacity={0.9} />;
//             })}
//           </svg>

//           {/* foreground glass plate with CTA (lifted) */}
//           <div
//             style={{
//               position: "absolute",
//               left: "50%",
//               bottom: "-6%",
//               transform: "translateX(-50%) translateZ(140px) rotateX(6deg)",
//               width: "54%",
//               maxWidth: 360,
//               padding: "14px 18px",
//               borderRadius: 14,
//               background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(8,12,20,0.08))",
//               boxShadow: "0 18px 40px rgba(2,6,12,0.65)",
//               border: "1px solid rgba(255,255,255,0.03)",
//               textAlign: "center",
//               pointerEvents: showCTA ? "auto" : "none",
//             }}
//           >
//             <div style={{ color: "#ffffffcc", fontSize: 13 }}>מחשבון משכנתא חכם</div>
//             <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 6 }}>בדוק זכאות עכשיו</div>
//             {showCTA && (
//               <button
//                 onClick={onCTAClick}
//                 className="mt-3 px-4 py-2 rounded-md"
//                 style={{
//                   background: `linear-gradient(90deg, ${primary}, ${accent})`,
//                   border: "none",
//                   color: "#081018",
//                   fontWeight: 700,
//                   cursor: "pointer",
//                 }}
//                 aria-label="בדוק זכאות"
//               >
//                 התחל סימולציה
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* small top-left branding */}
//       <div style={{ position: "absolute", left: 18, top: 18, color: "rgba(255,255,255,0.9)" }}>
//         <div style={{ fontSize: 11, letterSpacing: 1 }}>Morgi</div>
//         <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>כלי חכם למשכנתאות</div>
//       </div>

//       {/* decorative bottom gradient */}
//       <div
//         aria-hidden
//         style={{
//           position: "absolute",
//           left: 0,
//           right: 0,
//           bottom: "-8%",
//           height: "30%",
//           background: `linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.5))`,
//           pointerEvents: "none",
//         }}
//       />

//       {/* Inline CSS animations (kept local) */}
//       <style jsx>{`
//         /* rotate orbits slowly - pauses in reduced-motion */
//         #orbits {
//           animation: orbits-rot 18s linear infinite;
//           transform-origin: 200px 200px;
//         }
//         @keyframes orbits-rot {
//           from {
//             transform: rotate(0deg);
//           }
//           to {
//             transform: rotate(360deg);
//           }
//         }
//         /* subtle bob of the whole orb container */
//         .orb-bob {
//           animation: bob 8s ease-in-out infinite;
//         }
//         @keyframes bob {
//           0% {
//             transform: translateY(0);
//           }
//           50% {
//             transform: translateY(-12px);
//           }
//           100% {
//             transform: translateY(0);
//           }
//         }
//         /* small pulse on CTA on hover */
//         button:hover {
//           transform: translateY(-2px);
//         }

//         /* reduce motion: stop animations */
//         @media (prefers-reduced-motion: reduce) {
//           #orbits {
//             animation: none !important;
//           }
//           button {
//             transition: none !important;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

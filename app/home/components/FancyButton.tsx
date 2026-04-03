import Link from "next/link";

type Props = {
  text?: string;
  hoverText?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export default function FancyButton({
  text = "הצטרף עכשיו",
  hoverText = "בוא נתחיל",
  href,
  onClick,
  className = "",
}: Props) {
  const content = (
    <button
      onClick={onClick}
      className={`cta-btn group ${className}`}
    >
      <div className="cta-bg" />

      <div className="cta-wrap">
        <div className="cta-content">
          {/* טקסט ראשי */}
          <span className="cta-text cta-text-main">
            {text.split("").map((char, i) => (
              <span key={i} style={{ ["--i" as any]: i }}>
                {char}
              </span>
            ))}
          </span>

          {/* אייקון */}
          <div className="cta-icon">
            <div />
          </div>

          {/* טקסט הובר */}
          <span className="cta-text cta-text-hover">
            {hoverText.split("").map((char, i) => (
              <span key={i} style={{ ["--i" as any]: i }}>
                {char}
              </span>
            ))}
          </span>
        </div>
      </div>
    </button>
  );

  // אם יש לינק → עוטף ב-Link
  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}






// export default function FancyButton() {
//   return (
//     <button className="fancy-btn group">
//       <div className="fancy-bg"></div>

//       {/* splash */}
//       <svg viewBox="0 0 342 208" className="fancy-splash">
//         <path d="M54 99s-14-9-27-2S1.5 97 1.5 97" />
//         <path d="M285 99s14-9 27-2 14-2 27-4" />
//       </svg>

//       <div className="fancy-wrap">
//         <svg viewBox="0 0 221 42" className="fancy-path">
//           <path d="M182 2H203a16 16 0 0116 16v6a16 16 0 01-16 16H18A16 16 0 012 24v-6A16 16 0 0118 2H48" />
//         </svg>

//         <div className="fancy-outline"></div>

//         <div className="fancy-content">
//           <span className="fancy-text fancy-text-1">
//             {"JoinToday".split("").map((l, i) => (
//               <span key={i} style={{ ["--i" as any]: i + 1 }}>
//                 {l}
//               </span>
//             ))}
//           </span>

//           <div className="fancy-icon">
//             <div></div>
//           </div>

//           <span className="fancy-text fancy-text-2">
//             {"JoinNow".split("").map((l, i) => (
//               <span key={i} style={{ ["--i" as any]: i + 1 }}>
//                 {l}
//               </span>
//             ))}
//           </span>
//         </div>
//       </div>
//     </button>
//   );
// }
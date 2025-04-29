import React from "react";
type Props = {
  size?: number;
  color?: string;
  className?: string;
};

const ReverseIcon = ({ size = 64, color = "#0f172a", className = "" }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    className={className}
  >
    {/* בית בסיסי */}
    <path
      d="M12 28L32 12L52 28V52H36V36H28V52H12V28Z"
      fill="url(#roofGradient)"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* חץ מתעקל פנימה (משדר כסף שחוזר לבית) */}
    <path
      d="M42 20C42 14 36 10 30 10H28M28 10L32 6M28 10L32 14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* גרדיאנט גג הבית */}
    <defs>
      <linearGradient id="roofGradient" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#facc15" />
        <stop offset="1" stopColor="#fde68a" />
      </linearGradient>
    </defs>
  </svg>
);

export default ReverseIcon;

import React from "react";

type Props = {
  size?: number;
  color?: string;
  className?: string;
};

const LoanIcon = ({ size = 64, color = "#0f172a", className = "" }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    className={className}
  >
    {/* מסגרת כספית עם עיגולים דקורטיביים */}
    <rect
      x="8"
      y="16"
      width="48"
      height="32"
      rx="6"
      fill="url(#loanGradient)"
      stroke={color}
      strokeWidth="2"
    />

    {/* ₪ — סמל כסף דינמי */}
    <path
      d="M24 26H40M24 32H36C38 32 40 34 40 36C40 38 38 40 36 40H28"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* עיטורים פיננסיים חכמים */}
    <circle cx="12" cy="20" r="2" fill={color} />
    <circle cx="52" cy="20" r="2" fill={color} />
    <circle cx="12" cy="44" r="2" fill={color} />
    <circle cx="52" cy="44" r="2" fill={color} />

    {/* גרדיאנט יוקרתי */}
    <defs>
      <linearGradient id="loanGradient" x1="8" y1="16" x2="56" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#d1d5db" />
        <stop offset="1" stopColor="#f9fafb" />
      </linearGradient>
    </defs>
  </svg>
);

export default LoanIcon;

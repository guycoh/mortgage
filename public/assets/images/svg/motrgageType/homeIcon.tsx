import React from "react";

type Props = {
  size?: number;
  color?: string;
  className?: string;
};

const HomeIcon = ({ size = 64, color = "#1D4ED8", className = "" }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 28L32 8L56 28V56H36V40H28V56H8V28Z" />
  </svg>
);

export default HomeIcon;

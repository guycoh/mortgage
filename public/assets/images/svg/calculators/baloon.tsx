import React from 'react';

interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

const BaloonIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M188.354 359C192.365 322.046 194.618 294.781 195.113 277.205C195.856 250.842 196.355 242.18 192.156 224.071C187.957 205.962 140 142.122 140 110.389C140 78.6569 144.904 41.0005 195.113 41C245.321 40.9995 260 59.2601 260 98.2035C260 124.166 239.734 160.085 199.202 205.962C189.557 218.245 184.734 225.751 184.734 228.479C184.734 231.206 189.522 234.053 199.099 237.021"
        stroke={color}
        strokeOpacity="0.9"
        strokeWidth="9.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BaloonIcon;

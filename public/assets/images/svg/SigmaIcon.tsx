import React from 'react';

interface SigmaIconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

const SigmaIcon: React.FC<SigmaIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
}) => (
  <svg
    fill={color}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M20,21H3a1,1,0,0,1-.93-.64,1,1,0,0,1,.27-1.11L10.5,12,2.34,4.75a1,1,0,0,1-.27-1.11A1,1,0,0,1,3,3H20a2,2,0,0,1,2,2V6a1,1,0,0,1-2,0V5H5.63l7,6.25a1,1,0,0,1,0,1.5L5.63,19H20V18a1,1,0,0,1,2,0v1A2,2,0,0,1,20,21Z"
      fill={color}
    />
  </svg>
);

export default SigmaIcon;

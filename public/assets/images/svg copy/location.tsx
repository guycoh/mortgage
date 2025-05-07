import React from "react";

interface LocationIconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

const LocationIcon: React.FC<LocationIconProps> = ({
  size = 24,
  color = "currentColor",
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      fill={color}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Location Icon</title>
      <g id="location">
        <path d="M16,1A11,11,0,0,0,5,12C5,23.24,15,30.51,15.42,30.81a1,1,0,0,0,1.16,0C17,30.51,27,23.24,27,12A11,11,0,0,0,16,1Zm0,16a5,5,0,1,1,5-5A5,5,0,0,1,16,17Z" />
      </g>
    </svg>
  );
};

export default LocationIcon;

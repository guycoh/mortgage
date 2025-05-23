import React from "react";

type SvgIconProps = {
  size?: number | string;
  color?: string;
  className?: string;
};

const RefusedIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = "currentColor",
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1920 1920"
      xmlns="http://www.w3.org/2000/svg"
      fill={color}
      className={className}
    >
      <g fillRule="evenodd" clipRule="evenodd" stroke="none" strokeWidth="1">
        <path d="M517.334 0V638.23H624.001V106.372H1493.33V638.23L1493.33 640L1497.99 639.557L1600 640V638.23V0H517.334Z" />
        <path d="M0 212.743H410.667V319.447H107V1759.94C107 1789.39 131.074 1813.3 160.499 1813.3H1552.99C1578.35 1813.3 1600.39 1795.26 1605.42 1770.4L1789.35 852.965H595.872L340.25 1669.14L238.065 1637.34L517.334 746.261H1920L1710.39 1791.32C1695.41 1865.9 1629.18 1920 1552.99 1920H160.499C72.0107 1920 0 1848.19 0 1759.94V212.743Z" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M693.333 425.486C693.333 337.365 764.968 265.929 853.333 265.929C941.699 265.929 1013.33 337.365 1013.33 425.486C1013.33 513.607 941.699 585.044 853.333 585.044C764.968 585.044 693.333 513.607 693.333 425.486ZM853.333 372.301C823.878 372.301 800 396.113 800 425.486C800 454.86 823.878 478.672 853.333 478.672C882.788 478.672 906.667 454.86 906.667 425.486C906.667 396.113 882.788 372.301 853.333 372.301Z"
        />
        <path d="M1386.67 372.301H1120V478.672H1386.67V372.301Z" />
      </g>
    </svg>
  );
};

export default RefusedIcon;

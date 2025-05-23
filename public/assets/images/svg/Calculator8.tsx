import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  color?: string;
}





export default function Calculator4({
  className,
  size = 24,
  color = 'currentColor',

}: IconProps) {
  return (
    <svg
      fill={color}
      version="1.1"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
   >
    <title>calculator</title>
          <path d="M24 5h-16c-0.553 0-1 0.447-1 1v21c0 0.552 0.447 1 1 1h16c0.552 0 1-0.448 1-1v-21c0-0.553-0.448-1-1-1zM9 15h2v2h-2v-2zM9 18h2v2h-2v-2zM9 21h2v2h-2v-2zM14 26h-5v-2h5v2zM14 23h-2v-2h2v2zM14 20h-2v-2h2v2zM14 17h-2v-2h2v2zM17 26h-2v-2h2v2zM17 23h-2v-2h2v2zM17 20h-2v-2h2v2zM17 17h-2v-2h2v2zM20 26h-2v-2h2v2zM20 23h-2v-2h2v2zM20 20h-2v-2h2v2zM20 17h-2v-2h2v2zM23 26h-2v-5h2v5zM23 20h-2v-2h2v2zM23 17h-2v-2h2v2zM23 13h-14v-6h14v6z"></path>

    </svg>
  );
}

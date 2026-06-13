import React from "react";

type Props = {
  size?: number | string;
  color?: string;
  className?: string;
};

export default function ReverseIcon({
  size = 40,
  color = "#000000",
  className = "",
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-13.11 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      fill={color}
      className={className}
    >
      <g
        id="_18"
        data-name="18"
        transform="translate(-178.105 -605.5)"
      >
        <path
          d="M208.9,605.5h-.148v29.037H181.237V605.5H181.1a2.966,2.966,0,0,0-2.991,2.94v54.119A2.966,2.966,0,0,0,181.1,665.5H208.9a2.965,2.965,0,0,0,2.99-2.941V608.44A2.964,2.964,0,0,0,208.9,605.5Z"
        />

        <rect
          width="23.357"
          height="6.239"
          transform="translate(183.398 625.659)"
        />

        <rect
          width="23.357"
          height="6.24"
          transform="translate(183.398 616.699)"
        />

        <path d="M183.517,605.5v4.558l2.126-4.558Z" />

        <path d="M187.2,614.339l4.122-8.838H188.4l-4.121,8.838Z" />

        <path d="M192.875,614.339,197,605.5h-2.92l-4.122,8.838Z" />

        <path d="M198.556,614.339l4.122-8.838h-2.92l-4.12,8.838Z" />

        <path d="M204.235,614.339l2.988-6.405V605.5h-1.786l-4.122,8.838Z" />
      </g>
    </svg>
  );
}
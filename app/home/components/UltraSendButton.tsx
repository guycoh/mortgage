"use client";

import { useState } from "react";

export default function UltraSendButton({
  text = "SendMessage",
  sentText = "Sent",
  icon,
  sentIcon,
}: {
  text?: string;
  sentText?: string;
  icon?: React.ReactNode;
  sentIcon?: React.ReactNode;
}) {
  const [sent, setSent] = useState(false);

  const handleClick = () => {
    setSent(true);
    setTimeout(() => setSent(false), 2200);
  };

  const renderText = (str: string) =>
    str.split("").map((char, i) => (
      <span key={i} style={{ "--i": i } as React.CSSProperties}>
        {char}
      </span>
    ));

  return (
    <button
      onClick={handleClick}
      className="relative group rounded-full px-7 py-3 overflow-hidden bg-white border border-gray-300 shadow-sm"
    >
      {/* outline */}
      <div className="absolute inset-0 rounded-full border border-gray-400 opacity-0 group-hover:opacity-100 transition duration-300" />

      {/* DEFAULT */}
      <div
        className={`flex items-center gap-2 transition-all duration-500 ${
          sent
            ? "translate-y-[150%] opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="icon">
          {icon || (
            <svg width="20" height="20" fill="currentColor">
              <path d="M2 12L22 2L13 21L11 13L2 12Z" />
            </svg>
          )}
        </div>

        <p className="text">
          {renderText(text)}
        </p>
      </div>

      {/* SENT */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-500 ${
          sent
            ? "translate-y-0 opacity-100"
            : "-translate-y-[150%] opacity-0"
        }`}
      >
        <div className="icon">
          {sentIcon || (
            <svg width="20" height="20" fill="green">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <p className="text">
          {renderText(sentText)}
        </p>
      </div>
    </button>
  );
}
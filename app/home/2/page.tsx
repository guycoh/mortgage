"use client";

import React from "react";

interface HouseCardProps {
  size?: number | string;
  className?: string;
}

export default function HouseCard({ size = 200, className = "" }: HouseCardProps) {
  const numericSize = typeof size === "number" ? size : parseInt(String(size), 10) || 200;
  const width = numericSize;
  const height = numericSize * 0.9;
  const depth = numericSize * 0.4;

  return (
    <div className={`flex justify-center items-center min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e6eff3] ${className}`}>
      <div className="relative" style={{ perspective: "1000px" }}>
        {/* Simplified 3D House - cleaner */}
        <div
          className="relative"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transformStyle: "preserve-3d",
            transform: "rotateY(-15deg) rotateX(6deg)",
          }}
        >
          {/* Front Wall */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#fffdf8",
              borderRadius: "8px",
              boxShadow: "6px 6px 18px rgba(0,0,0,0.2)",
              transform: `translateZ(${depth / 2}px)`,
              position: "absolute",
            }}
          />

          {/* Right Wall */}
          <div
            style={{
              width: `${depth}px`,
              height: "100%",
              background: "#e6e6e6",
              position: "absolute",
              top: 0,
              right: 0,
              transform: `rotateY(-90deg) translateZ(${width / 2}px) translateX(${depth / 2}px)`,
              transformOrigin: "left center",
              borderRadius: "0 8px 8px 0",
            }}
          />

          {/* Roof */}
          <div
            style={{
              width: `${width}px`,
              height: `${depth}px`,
              background: "linear-gradient(145deg, #ff914d, #ff6500)",
              clipPath: "polygon(50% 0%, 100% 100%, 0 100%)",
              position: "absolute",
              top: `-${depth}px`,
              left: `0px`,
              transform: `translateZ(${depth / 2}px)`,
              boxShadow: "4px 6px 12px rgba(0,0,0,0.25)",
            }}
          />

          {/* Roof Side Right */}
          <div
            style={{
              width: `${depth}px`,
              height: `${depth}px`,
              background: "linear-gradient(145deg, #ff7b00, #e96c00)",
              position: "absolute",
              top: `-${depth}px`,
              right: 0,
              transform: `rotateY(-90deg) translateZ(${width}px)`,
              transformOrigin: "left top",
              clipPath: "polygon(0 0, 100% 0, 100% 100%)",
            }}
          />

          {/* Ground Shadow */}
          <div
            style={{
              position: "absolute",
              bottom: `-${depth / 3}px`,
              left: `-${width * 0.1}px`,
              width: `${width * 1.4}px`,
              height: `${depth / 5}px`,
              background: "rgba(0,0,0,0.12)",
              filter: "blur(8px)",
              borderRadius: "50%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

"use client";
import React from "react";

export default function StaticCube3D() {
  const size = 150; // גודל הפאה הקדמית
  const depth = 13; // עומק מצומצם (1/3 מהקודם)

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="relative" style={{ width: size + depth, height: size + depth }}>
        {/* פאה קדמית - ישרה מול הצופה */}
        <div
          className="absolute bg-teal-400 border border-teal-600"
          style={{
            width: size,
            height: size,
            top: depth,
            left: 0,
            zIndex: 3,
          }}
        />

        {/* פאה ימנית - מדמה עומק */}
        <div
          className="absolute bg-teal-500 border border-teal-700"
          style={{
            width: depth,
            height: size,
            top: depth,
            left: size,
            transform: "skewY(-45deg)",
            transformOrigin: "top left",
            zIndex: 2,
          }}
        />

        {/* פאה עליונה - מדמה עומק */}
        <div
          className="absolute bg-teal-300 border border-teal-500"
          style={{
            width: size,
            height: depth,
            top: 0,
            left: 0,
            transform: "skewX(-45deg)",
            transformOrigin: "bottom left",
            zIndex: 1,
          }}
        />
      </div>
    </div>
  );
}

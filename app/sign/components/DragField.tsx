// app/sign/components/DragField.tsx
"use client"

import { useState } from "react";

type DragFieldProps = {
  label: string;
  isDragEnabled: boolean;
};

export default function DragField({ label, isDragEnabled }: DragFieldProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (!isDragEnabled) return;

    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !isDragEnabled) return;

    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      className="absolute inset-0"
    >
      <div
        onMouseDown={onMouseDown}
        className={`absolute px-3 py-2 border rounded cursor-${
          isDragEnabled ? "move" : "default"
        } bg-white shadow`}
        style={{ left: position.x, top: position.y }}
      >
        {label}
      </div>
    </div>
  );
}

"use client";

import React from 'react'

// הגדרת המאפיינים (Props) שהכפתור יקבל
interface CustomButtonProps {
  text: string;                             // הטקסט שיוצג בכפתור
  onClick?: () => void;                     // הפונקציה שתופעל בלחיצה
  type?: 'button' | 'submit' | 'reset';     // סוג הכפתור (ברירת מחדל: button)
  size?: 'sm' | 'md' | 'lg';                // שליטה בגודל (ברירת מחדל: md)
  disabled?: boolean;                       // אפשרות לביטול הכפתור
}

export default function CustomButton({
  text,
  onClick,
  type = 'button',
  size = 'md',
  disabled = false,
}: CustomButtonProps) {
  
  // מיפוי הגדלים השונים כדי לשמור על פרופורציות מושלמות של הכפתור והטקסט
  const sizeStyles = {
    sm: "h-[40px] w-[130px] text-[14px]",
    md: "h-[50px] w-[160px] text-[16px]", // הגודל המקורי שלך
    lg: "h-[60px] w-[200px] text-[18px]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative top-0 left-0 m-0 flex items-center justify-center bg-white rounded-[30px] group cursor-pointer border-none p-0 select-none outline-none disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]}`}
    >
      {/* הדיב הפנימי עם האפקטים השקופים והטקסט המודגש */}
      <div className="flex h-full w-full items-center justify-center rounded-[30px] border-b border-t border-white/10 bg-transparent text-[#1d75a1] tracking-[1px] font-bold z-1 transition-all duration-600 ease-in-out
        shadow-[4px_4px_6px_0_rgba(255,255,255,0.5),-4px_-4px_6px_0_rgba(116,125,136,0.5),inset_-4px_-4px_6px_0_rgba(255,255,255,0.2),inset_4px_4px_6px_0_rgba(0,0,0,0.4)]
        group-hover:tracking-[4px] group-hover:text-[#4a4a4a] group-hover:bg-[#FFFFF0]
        group-disabled:hover:tracking-[1px] group-disabled:hover:text-[#1d75a1] group-disabled:hover:bg-transparent">
        {text}
      </div>
    </button>
  );
}
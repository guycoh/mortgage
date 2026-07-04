"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ isOpen, onClose, children }: ModalProps) {

  // חסימת גלילה של דף הרקע כשהמודל פתוח
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 🟢 שינוי כאן: הרקע שקוף לחלוטין (bg-transparent) וללא טשטוש מסך */}
      <div 
        className="fixed inset-0 bg-transparent transition-opacity" 
        onClick={onClose} 
      />

      {/* תיבת המודל - מתאימה את עצמה לרוחב הילד, עם הגבלת גובה וגלילה פנימית במידת הצורך */}
      <div className="relative w-auto max-w-full max-h-[90vh] overflow-y-auto rounded-xl z-10 custom-scrollbar focus:outline-none animate-in fade-in zoom-in-95 duration-200">
        
        {/* כפתור סגירה (X) צף בצד שמאל למעלה */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors focus:outline-none cursor-pointer"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* כאן מוזרק האובייקט/המחשבון שאתה מעביר פנימה */}
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
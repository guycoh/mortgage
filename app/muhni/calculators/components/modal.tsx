'use client'
import { ReactNode, useEffect } from 'react'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto w-full max-w-3xl">
        {/* כפתור סגירה */}
         {/* כפתור סגירה */}
         <button
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-red-100 text-red-600 text-3xl font-bold flex items-center justify-center hover:bg-red-200 hover:scale-110 transition-all"
          aria-label="סגור"
        >
          ×
        </button>

        <div>{children}</div>
      </div>
    </div>
  )
}

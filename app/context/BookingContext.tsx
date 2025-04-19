'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type BookingInfo = {
  name: string
  phone: string
  email: string
  date: string
  hour: string
}

type BookingContextType = {
  booking: BookingInfo | null
  setBooking: (info: BookingInfo) => void
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [booking, setBookingState] = useState<BookingInfo | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('booking')
    if (stored) setBookingState(JSON.parse(stored))
  }, [])

  const setBooking = (info: BookingInfo) => {
    setBookingState(info)
    localStorage.setItem('booking', JSON.stringify(info))
  }

  return (
    <BookingContext.Provider value={{ booking, setBooking }}>
      {children}
    </BookingContext.Provider>
  )
}

export const useBooking = () => {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking חייב להיות בתוך <BookingProvider>')
  }
  return context
}

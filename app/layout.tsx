
import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";

import { BookingProvider } from "./context/BookingContext";

//import { AuthProvider } from "./context/AuthContext";


const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "משכנתא",
  description: "משכנתאות",
  url: "https://morg-orcin.vercel.app/card",
  icons: {
    icon: '/assets/images/svg/muhni_logo.svg',
  },
  //נוסף להציג תמונה בשליחה
  images: [
    {
      url: "https://morg-orcin.vercel.app/assets/images/imgFiles/my_image.jpg", // כאן התמונה שתרצה שתוצג
      width: 1200,
      height: 630,
      alt: "תיאור אלטרנטיבי של התמונה",
    },
  ],

 



};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="rtl" className={geistSans.className} suppressHydrationWarning>
      <body>
          <div>
          <BookingProvider>
                {children}
          </BookingProvider>
         </div>
      
      
      
       
      </body>
    </html>
  );
}
//מקורי


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;






//תיקון 02/08/2025 בעיית canva
// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   webpack: (config, { isServer }) => {
//     if (!isServer) {
//       // למנוע מ־pdfjs-dist לנסות לפתור את המודול native 'canvas' בצד קליינט
//       config.resolve.fallback = {
//         ...config.resolve.fallback,
//         canvas: false,
//       };
//     }
//     return config;
//   },
//   // אם אתה משתמש ב־app directory (Next.js 13+), אין צורך לשנות פה משהו נוסף בהקשר הזה
// };

// export default nextConfig;








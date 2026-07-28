//מקורי


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  async headers() {
    return [
      {
        // A Fireberry deep link carries a client's account GUID in the path,
        // and that GUID is the only thing guarding the board. Referer would
        // hand the whole URL to the next site the user clicks through to, so
        // these routes send none. Scoped deliberately: the rest of the app is
        // left exactly as it was.
        source: "/simulator/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          // nor should it end up in a shared cache or a search index
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
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








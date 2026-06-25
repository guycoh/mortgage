"use client";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] to-[#e6eef5] px-6">

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-10 text-center relative overflow-hidden">

        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-200/40 rounded-full blur-3xl" />


        {/* SVG */}
        <div className="relative flex justify-center mb-8">

          <svg
            width="180"
            height="180"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >

            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="#0078BE"
              strokeWidth="8"
              strokeDasharray="10 12"
              className="animate-spin origin-center"
            />

            {/* Gear */}
            <path
              d="M100 55
              C75 55 55 75 55 100
              C55 125 75 145 100 145
              C125 145 145 125 145 100
              C145 75 125 55 100 55Z"
              fill="#f97316"
              opacity="0.15"
            />

            <path
              d="M100 70
              A30 30 0 1 0 100.1 70"
              stroke="#f97316"
              strokeWidth="10"
              strokeLinecap="round"
            />

            <path
              d="M100 35V20M100 180V165M35 100H20M180 100H165"
              stroke="#0078BE"
              strokeWidth="8"
              strokeLinecap="round"
            />

            <path
              d="M55 55L43 43M157 157L145 145M145 55L157 43M43 157L55 145"
              stroke="#0078BE"
              strokeWidth="8"
              strokeLinecap="round"
            />

          </svg>

        </div>


        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          האתר בתחזוקה
        </h1>

    <div className="relative top-0 left-0 m-0 flex h-[50px] w-[160px] items-center justify-center group">
      <div className="flex h-full w-full items-center justify-center rounded-[30px] border-b border-t border-white/10 bg-transparent text-[#FFFFF0] filter drop-shadow-[0_0_2px_rgba(0,0,0,0.5)] tracking-[1px] text-[16px] font-medium z-[1] transition-all duration-600 ease-in-out
        shadow-[4px_4px_6px_0_rgba(255,255,255,0.5),-4px,-4px_6px_0_rgba(116,125,136,0.5),inset_-4px_-4px_6px_0_rgba(255,255,255,0.2),inset_4px_4px_6px_0_rgba(0,0,0,0.4)]
        group-hover:tracking-[4px] group-hover:text-[#4a4a40] group-hover:bg-[#FFFFF0]">
        חשב
      </div>
    </div>
 

        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          אנחנו מבצעים כרגע שדרוגים ושיפורים
          <br />
          כדי להעניק לכם חוויה טובה יותר.
        </p>


        <div className="inline-flex items-center gap-3 bg-orange-50 text-orange-600 px-6 py-3 rounded-full font-semibold">

          <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />

          נחזור לפעילות בקרוב

        </div>


      </div>

    </main>
  );
}



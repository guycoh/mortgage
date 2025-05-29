// app/mortgage-types/page.tsx

'use client';

export default function MortgageTypesPage() {
  const cards = [
    { title: 'לכל מטרה', icon: '💰' },
    { title: 'משכנתא לדירה', icon: '🏢' },
    { title: 'משכנתא הפוכה', icon: '📥' },
    { title: 'איחוד הלוואות', icon: '🔄' },
    { title: 'משכנתא פנסיונית', icon: '👴' },
    { title: 'משכנתא לשיפוץ', icon: '🛠️' },
    { title: 'בנייה עצמית', icon: '✏️' },
    { title: 'משכנתא עסקית', icon: '💼' },
    { title: 'משכנתא לנכסים מסחריים', icon: '🏬' },
  ];

  return (
    <main dir="rtl" className="min-h-screen bg-white px-4 py-8 text-purple-800">
      {/* כותרת כללית */}
      <section className="flex flex-col items-end max-w-6xl mx-auto mb-8">
        <h2 className="text-red-600 text-xl font-bold leading-tight">
          להוריד פנסיונית<br />
          להוסיף משכנתא למורכבים
        </h2>
      </section>

      {/* גריד הכרטיסים */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {cards.map((card) => (
          <div
            key={card.title}
            className="border border-purple-300 rounded-xl shadow-md hover:shadow-lg p-4 flex flex-col items-center text-center transition"
          >
            <button className="bg-purple-600 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
              {card.title}
            </button>

            <div className="text-6xl mb-4">{card.icon}</div>

            <a href="#" className="text-purple-700 underline font-semibold text-sm hover:text-purple-500">
              למידע נוסף
            </a>
          </div>
        ))}
      </section>
    </main>
  );
}

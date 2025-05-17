// app/data-repositories/page.tsx

export default function DataRepositoriesPage() {
    const repositories = [
      { name: "מאגר שמאים", description: "שמאים", href: "/muhni7/repositories/appraisers" },
      { name: "מתחמים בהתחדשות עירונית", description: "מתחמים להתחדשות עירונית", href: "/muhni7/repositories/urban_renewal" },
      { name: "מאגר מסלולים", description: "סוגי מסלולי משכנתא", href: "/repositories/routes" },
      { name: "מאגר טפסים", description: "טפסים חשובים להורדה וחתימה", href: "/repositories/forms" },
      { name: "מאגר מילון מונחים", description: "מושגים מעולם המשכנתאות", href: "/repositories/glossary" },
    ];
  
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-200 py-12 px-4 sm:px-8 lg:px-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-6">מאגרי מידע באתר</h1>
          <p className="text-gray-600 text-lg mb-12">
            כאן תוכלו למצוא את כל המאגרים החשובים שיעזרו לכם להבין, להשוות ולבחור משכנתא בצורה חכמה.
          </p>
  
          <div className="space-y-4">
            {repositories.map((repo, index) => (
              <a
                key={index}
                href={repo.href}
                className="flex items-center justify-between bg-white rounded-xl p-5 shadow hover:shadow-md border border-purple-100 hover:border-purple-300 transition duration-200"
              >
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xl font-bold">
                    {repo.name[0]}
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-semibold text-gray-800">{repo.name}</h2>
                    <p className="text-sm text-gray-600">{repo.description}</p>
                  </div>
                </div>
                <span className="text-purple-500 font-bold text-xl">&rarr;</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
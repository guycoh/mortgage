import Link from "next/link";

const MenuPage = () => {
  return (
    <main className="bg-galbg text-gray-700 leading-relaxed">
    <div className=" from-white to-[#f8f8f8] min-h-screen flex flex-col justify-center items-center py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg w-11/12 md:w-1/2 lg:w-1/3 text-center space-y-6 border border-gray-200">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
          מדריכים להוצאת יתרת סילוק
        </h1>
        <div className="space-y-4 mt-6">
          <Link
            href="/muhni/bb/mizrachi"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-orange-400 to-orange-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק מזרחי
          </Link>
          <Link
            href="/muhni/bb/leumi"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-sky-400 to-blue-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק לאומי
          </Link>
          <Link
            href="/muhni/bb/hapoalim"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-red-500 to-red-700 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק פועלים
          </Link>
          <Link
            href="/muhni/bb/discount"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-green-500 to-green-700 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק דיסקונט
          </Link>
          <Link
            href="/muhni/bb/benleumi"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק בינלאומי
          </Link>
         

        </div>
      </div>
    </div>
    </main>

  );
};

export default MenuPage;

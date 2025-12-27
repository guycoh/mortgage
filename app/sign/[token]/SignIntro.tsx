export default function SignIntro({ onStart, doc }: any) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 text-center">
      <img src="/logo.svg" className="h-14 mb-6" />

      <h1 className="text-2xl font-bold mb-2">
        חתימה דיגיטלית על מסמכים
      </h1>

      <p className="text-gray-600 mb-6">
        המסמך נשלח אליך לצורך חתימה דיגיטלית מאובטחת
      </p>

      <button
        onClick={onStart}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg"
      >
        התחל חתימה
      </button>
    </div>
  );
}

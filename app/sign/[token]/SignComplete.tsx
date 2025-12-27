// app/sign/[token]/SignComplete.tsx
"use client";

export default function SignComplete() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 text-center">
      <img src="/logo.svg" className="h-16 mb-6" />

      <h1 className="text-2xl font-bold mb-2">החתימה הושלמה!</h1>
      <p className="text-gray-600 mb-6">
        תודה! המסמך נחתם בהצלחה ונשלח למערכת.
      </p>

      <button
        onClick={() => window.close()}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl"
      >
        סגור חלון
      </button>
    </div>
  );
}

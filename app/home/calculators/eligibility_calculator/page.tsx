"use client"
import { useState } from "react";

const EligibilityCalculator = () => {
  const [yearsMarried, setYearsMarried] = useState<number>(0);
  const [numChildren, setNumChildren] = useState<number>(0);
  const [militaryService, setMilitaryService] = useState<boolean>(false);
  const [preferredArea, setPreferredArea] = useState<boolean>(false);
  const [age, setAge] = useState<number>(0);
  const [disabilityPercentage, setDisabilityPercentage] = useState<number>(0);
  const [husbandSiblings, setHusbandSiblings] = useState<number>(0);
  const [wifeSiblings, setWifeSiblings] = useState<number>(0);
  const [eligibilityScore, setEligibilityScore] = useState<number | null>(null);
  const [loanAmount, setLoanAmount] = useState<number | null>(null);

  const calculateEligibility = () => {
    let score = 0;

    // ניקוד שנות נישואין
    score += Math.min(yearsMarried, 15) * 20;

    // ניקוד מספר ילדים
    score += numChildren * 50;

    // ניקוד שירות צבאי/לאומי
    if (militaryService) {
      score += 100;
    }

    // ניקוד אזור מועדף
    if (preferredArea) {
      score += 50;
    }

    // ניקוד גיל
    if (age >= 21 && age <= 30) {
      score += 30;
    } else if (age > 30 && age <= 40) {
      score += 20;
    }

    // ניקוד נכות
    if (disabilityPercentage > 0) {
      score += Math.min(disabilityPercentage, 100) * 2;
    }

    // ניקוד אחים ואחיות
    score += husbandSiblings * 30; // ניקוד עבור אחים של הבעל
    score += wifeSiblings * 30; // ניקוד עבור אחים של האישה

    // תוכנית 10+
    if (yearsMarried >= 10 && numChildren >= 3) {
      score += 100;
    }

    // חישוב סכום ההלוואה
    const loanBaseAmount = 500000; // בסיס להלוואה (לדוגמה)
    const loan = loanBaseAmount + score * 1000;

    setEligibilityScore(score);
    setLoanAmount(loan);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">
          מחשבון זכאות משכנתא
        </h1>

        {/* שנות נישואין */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            שנות נישואין:
          </label>
          <input
            type="number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={yearsMarried}
            onChange={(e) => setYearsMarried(Number(e.target.value))}
          />
        </div>

        {/* מספר ילדים */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            מספר ילדים:
          </label>
          <input
            type="number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={numChildren}
            onChange={(e) => setNumChildren(Number(e.target.value))}
          />
        </div>

        {/* שירות צבאי/לאומי */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            האם שירתת בצבא/שירות לאומי?
          </label>
          <input
            type="checkbox"
            checked={militaryService}
            onChange={(e) => setMilitaryService(e.target.checked)}
            className="mr-2"
          />
        </div>

        {/* אזור מועדף */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            האם מדובר באזור מגורים מועדף?
          </label>
          <input
            type="checkbox"
            checked={preferredArea}
            onChange={(e) => setPreferredArea(e.target.checked)}
            className="mr-2"
          />
        </div>

        {/* גיל */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            גיל:
          </label>
          <input
            type="number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
          />
        </div>

        {/* אחוזי נכות */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            אחוזי נכות (אם קיימים):
          </label>
          <input
            type="number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={disabilityPercentage}
            onChange={(e) => setDisabilityPercentage(Number(e.target.value))}
          />
        </div>

        {/* מספר אחים של הבעל */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            מספר אחים של הבעל:
          </label>
          <input
            type="number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={husbandSiblings}
            onChange={(e) => setHusbandSiblings(Number(e.target.value))}
          />
        </div>

        {/* מספר אחים של האישה */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            מספר אחים של האישה:
          </label>
          <input
            type="number"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={wifeSiblings}
            onChange={(e) => setWifeSiblings(Number(e.target.value))}
          />
        </div>

        <button
          onClick={calculateEligibility}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          חשב זכאות
        </button>

        {eligibilityScore !== null && loanAmount !== null && (
          <div className="mt-4 p-4 bg-gray-100 rounded shadow">
            <h2 className="text-lg font-bold text-gray-700">
              ניקוד הזכאות שלך:
            </h2>
            <p className="text-gray-900 text-xl">{eligibilityScore} נקודות</p>
            <h2 className="text-lg font-bold text-gray-700 mt-4">
              סכום הלוואה משוער:
            </h2>
            <p className="text-gray-900 text-xl">
              {loanAmount.toLocaleString()} ש"ח
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EligibilityCalculator;

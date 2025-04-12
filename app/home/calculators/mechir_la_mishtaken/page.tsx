"use client"

import React, { useState } from "react";

const MortgageForm = () => {
  const [propertyValue, setPropertyValue] = useState(""); // שווי דירה
  const [contractAmount, setContractAmount] = useState(""); // סכום חתימת חוזה
  const [errorMessage, setErrorMessage] = useState(""); // הודעת שגיאה

  const MAX_PROPERTY_VALUE = 1800000; // תקרת שווי נכס לחישוב

  // פונקציה להסרת מפרידי אלפים
  const removeSeparators = (value: string) => value.replace(/,/g, "");

  // פונקציה להוספת מפרידי אלפים
  const formatWithSeparators = (value: string | number) =>
    Number(value).toLocaleString("he-IL");

  // חישוב תקרת נכס קובעת
  const calculateDecidingPropertyCap = () => {
    const numericPropertyValue = Number(removeSeparators(propertyValue)) || 0;
    const numericContractAmount = Number(removeSeparators(contractAmount)) || 0;

    if (numericPropertyValue < MAX_PROPERTY_VALUE) {
      // אם שווי הדירה קטן מ-1,800,000
      return Math.max(
        numericPropertyValue,
        numericContractAmount,
        MAX_PROPERTY_VALUE
      );
    } else {
      // אם שווי הדירה גדול או שווה ל-1,800,000
      return Math.max(MAX_PROPERTY_VALUE, numericContractAmount);
    }
  };

  const decidingPropertyCap = calculateDecidingPropertyCap();

  // עדכון שווי הדירה
  const handlePropertyValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeSeparators(e.target.value);
    if (!isNaN(Number(rawValue))) {
      setPropertyValue(formatWithSeparators(rawValue));
      setErrorMessage(""); // מנקה שגיאות במידת הצורך
    }
  };

  // עדכון סכום חתימת חוזה
  const handleContractAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeSeparators(e.target.value);
    if (!isNaN(Number(rawValue))) {
      const numericPropertyValue = Number(removeSeparators(propertyValue));
      const numericContractAmount = Number(rawValue);

      if (numericContractAmount > numericPropertyValue) {
        setErrorMessage(
          "שגיאה: סכום חתימת החוזה לא יכול להיות גבוה משווי הדירה! השדה אופס."
        );
        setContractAmount(""); // איפוס סכום חתימת החוזה
      } else {
        setContractAmount(formatWithSeparators(rawValue));
        setErrorMessage(""); // ניקוי שגיאות
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">
          טופס משכנתא - שווי דירה וסכום חתימת חוזה
        </h1>

        {/* שווי דירה */}
        <div className="mb-4">
          <label
            htmlFor="propertyValue"
            className="block text-gray-700 font-medium mb-2"
          >
            שווי דירה (₪):
          </label>
          <input
            type="text"
            id="propertyValue"
            className="w-full border rounded px-3 py-2"
            placeholder="הזן את שווי הדירה"
            value={propertyValue}
            onChange={handlePropertyValueChange}
          />
          <p className="text-sm text-gray-500 mt-1">
            תקרת שווי נכס לחישוב: {formatWithSeparators(MAX_PROPERTY_VALUE)} ₪
          </p>
        </div>

        {/* סכום חתימת חוזה */}
        <div className="mb-4">
          <label
            htmlFor="contractAmount"
            className="block text-gray-700 font-medium mb-2"
          >
            סכום חתימת חוזה (₪):
          </label>
          <input
            type="text"
            id="contractAmount"
            className="w-full border rounded px-3 py-2"
            placeholder="הזן את סכום חתימת החוזה"
            value={contractAmount}
            onChange={handleContractAmountChange}
          />
        </div>

        {/* תקרת נכס קובעת */}
        <div className="mb-4">
          <label
            htmlFor="decidingPropertyCap"
            className="block text-gray-700 font-medium mb-2"
          >
            תקרת נכס קובעת (₪):
          </label>
          <input
            type="text"
            id="decidingPropertyCap"
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={formatWithSeparators(decidingPropertyCap)}
            readOnly
          />
        </div>

        {/* הודעת שגיאה */}
        {errorMessage && (
          <div className="mt-4 text-red-500 font-medium">{errorMessage}</div>
        )}
      </div>
    </div>
  );
};

export default MortgageForm;

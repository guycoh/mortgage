//  /app/private/crm/leads/import/utils/leadFields

export const leadFields = [
  // 🧍 פרטים בסיסיים
  { key: "name", label: "שם" },
  { key: "email", label: "אימייל" },
  { key: "cell", label: "טלפון" },
  { key: "id_num", label: "תעודת זהות" },

  // 🏠 כתובת
  { key: "address", label: "כתובת" },

  // 💑 בן/בת זוג
  { key: "spouse_name", label: "שם בן/בת זוג" },
  { key: "spouse_phone", label: "טלפון בן/בת זוג" },

  // 📊 נתוני ליד
  { key: "data_source", label: "מקור ליד" },
  { key: "intrested_in", label: "מתעניין ב" },
  { key: "lead_first_status", label: "סטטוס ראשוני" },

  // 📞 ניהול שיחות
  { key: "last_call", label: "שיחה אחרונה" },
  { key: "status_call_id", label: "סטטוס שיחה" },
  { key: "reason_not_intrested_id", label: "סיבת חוסר עניין" },

  // 📅 פולואפ
  { key: "follow_up_date", label: "תאריך מעקב" },
  { key: "follow_up_hour", label: "שעת מעקב" },

  // 🧠 הערות
  { key: "comment", label: "הערות" },

  // 🎥 זום
  { key: "zoom", label: "קישור זום" },
  { key: "hour_zoom", label: "שעת זום" },

  // 🚫 רשימות
  { key: "black_list", label: "רשימה שחורה" },
  { key: "mailing_list", label: "רשימת תפוצה" },
  { key: "investors_list", label: "רשימת משקיעים" },

  // 🏢 גורמים חיצוניים
  { key: "realtor", label: "מתווך" },

  // 🏦 בנק
  { key: "bank_id", label: "בנק" },

  // 📄 מסמכים
  { key: "balance_statement", label: "דוח יתרות" },

  // 👤 מערכת
  { key: "profile_id", label: "משתמש משויך" },

  // ⛔ לא מומלץ למיפוי (אבל אפשר אם אתה רוצה)
  { key: "created_at", label: "תאריך יצירה" },
  { key: "id", label: "מזהה מערכת" },
];



// export const leadFields = [
//   { key: "name", label: "שם" },
//   { key: "email", label: "אימייל" },
//   { key: "cell", label: "טלפון" },
//   { key: "address", label: "כתובת" },
//   { key: "spouse_name", label: "שם בן/בת זוג" },
//   { key: "spouse_phone", label: "טלפון בן/בת זוג" },
//   { key: "comment", label: "הערות" },
//   { key: "investors_list", label: "משקיעים" },
// ];


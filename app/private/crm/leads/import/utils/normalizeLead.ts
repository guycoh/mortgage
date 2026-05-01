//   /app/private/crm/leads/import/utils/normalizeLead


export function normalizeLead(lead: any) {
  return {
    ...lead,

    // 📞 ניקוי טלפון
    cell: lead.cell?.toString().replace(/\D/g, "").slice(0, 10),

    // 📧 אימייל
    email: lead.email?.toLowerCase(),

    // 🧠 המרות בוליאן → מספרים (CRITICAL FIX)
    black_list: toSmallInt(lead.black_list),
    mailing_list: toSmallInt(lead.mailing_list),
    investors_list: toSmallInt(lead.investors_list),

    // 🏦 שדות מספריים
    bank_id: toNumber(lead.bank_id),
    status_call_id: toNumber(lead.status_call_id),
    reason_not_intrested_id: toNumber(lead.reason_not_intrested_id),
  };
}

function toSmallInt(value: any) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return 1;
  }
  if (value === false || value === "false" || value === 0 || value === "0") {
    return 0;
  }
  return null;
}

function toNumber(value: any) {
  const num = Number(value);
  return isNaN(num) ? null : num;
}
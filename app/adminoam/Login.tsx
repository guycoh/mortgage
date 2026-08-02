// The login card. Server-rendered, zero client JS — a plain form POST is the
// whole protocol, and the page carries no hint of what lives behind it.

import "./admin.css";

const MESSAGES: Record<string, string> = {
  bad: "שם משתמש או סיסמה שגויים",
  wait: "יותר מדי ניסיונות — נסו שוב בעוד חצי דקה",
  cfg: "הפאנל אינו מוגדר בסביבה הזו",
};

export default function Login({ error }: { error?: string }) {
  const msg = error ? (MESSAGES[error] ?? MESSAGES.bad) : null;
  return (
    <div className="adm adm-login-wrap" dir="rtl">
      <form className="adm-login" method="post" action="/adminoam/auth">
        <div className="adm-kicker">RESTRICTED</div>
        <h1>כניסה</h1>
        <label>
          <span>שם משתמש</span>
          <input name="user" type="text" autoComplete="username" required autoFocus />
        </label>
        <label>
          <span>סיסמה</span>
          <input name="pass" type="password" autoComplete="current-password" required />
        </label>
        {msg ? <div className="adm-login-err">{msg}</div> : null}
        <button type="submit">כניסה</button>
      </form>
    </div>
  );
}

// The gate. Server-rendered, no client JavaScript at all — a form POST is the
// entire protocol, which is also why there is nothing here for a script to
// probe. The card says what it is and nothing about what is behind it.

import "@fontsource/ibm-plex-sans-hebrew/400.css";
import "@fontsource/ibm-plex-sans-hebrew/500.css";
import "@fontsource/ibm-plex-sans-hebrew/600.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-400.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-500.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./console.css";

const MESSAGES: Record<string, string> = {
  bad: "שם משתמש או סיסמה שגויים",
  wait: "יותר מדי ניסיונות — נסו שוב בעוד חצי דקה",
  cfg: "המוקד אינו מוגדר בסביבה הזו",
};

export default function Login({ error }: { error?: string }) {
  const msg = error ? (MESSAGES[error] ?? MESSAGES.bad) : null;

  return (
    <div className="cns" dir="rtl">
      <div className="cns-gate">
        <div className="cns-gate-card">
          <div className="cns-gate-mark" aria-hidden>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 17.5 8.5 11l4 4.2L21 6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="11" r="1.6" fill="currentColor" stroke="none" />
              <circle cx="12.5" cy="15.2" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </div>

          <h1>מוקד הסימולטור</h1>
          <p className="cns-gate-sub">הכניסה מוגבלת לצוות המערכת.</p>

          <form method="post" action="/console/auth">
            <label>
              <span>שם משתמש</span>
              <input name="user" type="text" autoComplete="username" required autoFocus spellCheck={false} />
            </label>
            <label>
              <span>סיסמה</span>
              <input name="pass" type="password" autoComplete="current-password" required />
            </label>

            {msg ? (
              <div className="cns-gate-err">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5M12 16.2v.2" strokeLinecap="round" />
                </svg>
                {msg}
              </div>
            ) : null}

            <button type="submit">כניסה</button>
          </form>

          <p className="cns-gate-foot">RESTRICTED · MONITORING</p>
        </div>
      </div>
    </div>
  );
}

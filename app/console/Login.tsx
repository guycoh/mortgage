// The gate. Server-rendered, zero client JavaScript — a form POST is the whole
// protocol, which is also why there is nothing here for a script to probe. The
// card says what it is and nothing about what is behind it.

import { Scope } from "./ui/marks";

import "@fontsource-variable/rubik";
import "@fontsource-variable/jetbrains-mono";
import "./theme.css";
import "./console.css";

const MESSAGES: Record<string, string> = {
  bad: "שם משתמש או סיסמה שגויים",
  wait: "יותר מדי ניסיונות — נסו שוב בעוד חצי דקה",
  cfg: "המוקד אינו מוגדר בסביבה הזו",
};

export default function Login({ error }: { error?: string }) {
  const msg = error ? (MESSAGES[error] ?? MESSAGES.bad) : null;

  return (
    <div className="cns cns-plane grid min-h-screen place-items-center px-5 py-[8vh]" dir="rtl">
      <div className="w-[372px] overflow-hidden rounded-2xl border border-cns-line bg-cns-card px-8 pt-8 pb-7 shadow-[0_28px_60px_-32px_rgba(12,22,34,0.45)]">
        <div className="mb-4 grid size-9 place-items-center rounded-[11px] bg-cns-primary text-white">
          <Scope size={19} />
        </div>

        <h1 className="text-[21px] font-semibold tracking-tight">מוקד הסימולטור</h1>
        <p className="mt-0.5 mb-6 text-[12.5px] text-cns-mutedfg">
          הכניסה מוגבלת לצוות המערכת.
        </p>

        <form method="post" action="/console/auth" className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-cns-fg2">
              שם משתמש
            </span>
            <input
              name="user"
              type="text"
              autoComplete="username"
              required
              autoFocus
              spellCheck={false}
              className="h-[42px] rounded-[10px] border border-cns-line2 bg-cns-muted px-3.5 text-[14px] text-cns-fg transition-[background-color,border-color,box-shadow] outline-none focus-visible:border-cns-ring focus-visible:bg-cns-card focus-visible:ring-[3px] focus-visible:ring-cns-ring/20"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-cns-fg2">
              סיסמה
            </span>
            <input
              name="pass"
              type="password"
              autoComplete="current-password"
              required
              className="h-[42px] rounded-[10px] border border-cns-line2 bg-cns-muted px-3.5 text-[14px] text-cns-fg transition-[background-color,border-color,box-shadow] outline-none focus-visible:border-cns-ring focus-visible:bg-cns-card focus-visible:ring-[3px] focus-visible:ring-cns-ring/20"
            />
          </label>

          {msg ? (
            <div className="flex items-center gap-2 rounded-[10px] bg-cns-bad/10 px-3 py-2.5 text-[12.5px] font-medium text-cns-bad">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5M12 16.2v.2" strokeLinecap="round" />
              </svg>
              {msg}
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-1 h-11 rounded-[11px] bg-cns-primary text-[14px] font-semibold text-white transition-[background-color,transform] hover:bg-cns-primary/90 active:translate-y-px"
          >
            כניסה
          </button>
        </form>

        <p className="mt-5 border-t border-cns-line pt-3.5 text-center text-[11.5px] text-cns-mutedfg">
          מסך ניטור פנימי — הכניסה לצוות בלבד
        </p>
      </div>
    </div>
  );
}

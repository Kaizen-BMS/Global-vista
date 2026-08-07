"use client";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/**
 * Visually complete, functionally honest — OAuth is not wired to any
 * provider yet. Clicking tells the user that plainly instead of doing
 * nothing (dead click) or pretending to authenticate. Ready to become
 * real the moment OAuth is actually configured, without redesigning
 * anything here.
 */
export default function OAuthButtons() {
  function notReady(provider) {
    toast.info(`${provider} sign-in isn't enabled yet — contact your administrator.`);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => notReady("Google")}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 text-sm font-medium cursor-pointer transition-all hover:border-white/25 hover:bg-white/[0.06] hover:-translate-y-0.5 active:translate-y-0"
      >
        <GoogleIcon /> Google
      </button>
      <button
        type="button"
        onClick={() => notReady("Microsoft")}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 text-sm font-medium cursor-pointer transition-all hover:border-white/25 hover:bg-white/[0.06] hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg className="h-4 w-4" viewBox="0 0 23 23">
          <path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
        Microsoft
      </button>
    </div>
  );
}

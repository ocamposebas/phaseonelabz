import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("lab_auth_token") || "";
}

function saveAuthToken(token = "") {
  if (!token || typeof window === "undefined") return;
  window.localStorage.setItem("lab_auth_token", token);
}

function getTokenFromResponse(data = {}) {
  return data?.token || data?.auth_token || data?.access_token || data?.jwt || data?.session_token || "";
}

export default function MemberAccessGate({ initialHasSession = false }) {
  const [status, setStatus] = useState(
    initialHasSession ? "authenticated" : "checking"
  );
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const gateWasShownRef = useRef(!initialHasSession);
  const exitTimerRef = useRef(0);

  const finishAuthentication = () => {
    window.dispatchEvent(new Event("lab-auth-updated"));

    if (!gateWasShownRef.current) {
      setStatus("authenticated");
      return;
    }

    window.clearTimeout(exitTimerRef.current);
    setStatus("leaving");
    exitTimerRef.current = window.setTimeout(() => {
      setStatus("authenticated");
    }, 280);
  };

  const verifySession = async () => {
    const token = getSavedAuthToken();
    const hadSavedSession = initialHasSession || Boolean(token);

    try {
      const response = await fetch(`/api/account/me?ts=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.authenticated && data?.user) {
        finishAuthentication();
        return true;
      }

      // A temporary API/WordPress outage must not discard a session that the
      // browser still has. Invalid or expired tokens are returned as a normal
      // authenticated:false response and still lead to the sign-in form.
      if (!response.ok && hadSavedSession) {
        finishAuthentication();
        return true;
      }
    } catch {
      if (hadSavedSession) {
        finishAuthentication();
        return true;
      }
    }

    setStatus("unauthenticated");
    return false;
  };

  useEffect(() => {
    verifySession();

    return () => window.clearTimeout(exitTimerRef.current);
  }, []);

  const gateIsOpen = status !== "authenticated";

  useEffect(() => {
    if (!gateIsOpen) return undefined;

    gateWasShownRef.current = true;

    const lockedScrollY = window.scrollY || window.pageYOffset || 0;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverflowX = document.documentElement.style.overflowX;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverflowX = document.body.style.overflowX;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.classList.add("phase-member-gate-open");
    document.body.classList.add("phase-member-gate-open");
    document.documentElement.style.setProperty("overflow", "hidden", "important");
    document.documentElement.style.setProperty("overflow-x", "hidden", "important");
    document.body.style.setProperty("overflow", "hidden", "important");
    document.body.style.setProperty("overflow-x", "hidden", "important");
    document.body.style.setProperty("position", "fixed", "important");
    document.body.style.setProperty("top", `-${lockedScrollY}px`, "important");
    document.body.style.setProperty("left", "0", "important");
    document.body.style.setProperty("right", "0", "important");
    document.body.style.setProperty("width", "100%", "important");

    return () => {
      document.documentElement.classList.remove("phase-member-gate-open");
      document.body.classList.remove("phase-member-gate-open");
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overflowX = previousHtmlOverflowX;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overflowX = previousBodyOverflowX;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, 0);
    };
  }, [gateIsOpen]);

  useEffect(() => {
    if (status !== "authenticated" || !gateWasShownRef.current) {
      return undefined;
    }

    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLElement &&
      activeElement !== document.body
    ) {
      activeElement.blur();
    }

    const resetToTop = () => {
      const scrollingElement = document.scrollingElement;

      if (scrollingElement) scrollingElement.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    resetToTop();

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      resetToTop();
      secondFrame = window.requestAnimationFrame(resetToTop);
    });
    const afterKeyboard = window.setTimeout(resetToTop, 350);

    gateWasShownRef.current = false;

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(afterKeyboard);
    };
  }, [status]);

  const switchMode = (nextMode) => {
    setError("");
    setShowPassword(false);
    setMode(nextMode);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!ageConfirmed) {
      setError("Please confirm that you are 21 or older to continue.");
      return;
    }

    try {
      setStatus("submitting");
      setError("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "We could not verify those credentials.");
        setStatus("unauthenticated");
        return;
      }

      saveAuthToken(getTokenFromResponse(data));
      setLoginForm({ email: "", password: "" });
      await verifySession();
    } catch {
      setError("Secure sign in is unavailable right now. Please try again.");
      setStatus("unauthenticated");
    }
  };

  const handleRegistration = async (event) => {
    event.preventDefault();

    if (!ageConfirmed) {
      setError("Please confirm that you are 21 or older to continue.");
      return;
    }

    try {
      setStatus("submitting");
      setError("");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(registerForm),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "We could not create your account.");
        setStatus("unauthenticated");
        return;
      }

      setRegisterForm({ first_name: "", last_name: "", email: "", password: "" });
      await verifySession();
    } catch {
      setError("Account creation is unavailable right now. Please try again.");
      setStatus("unauthenticated");
    }
  };

  if (status === "authenticated") return null;

  const isWorking =
    status === "checking" || status === "submitting" || status === "leaving";
  const isRegistering = mode === "register";

  return (
    <section className={`phase-member-gate${status === "leaving" ? " is-leaving" : ""}`} role="dialog" aria-modal="true" aria-label="Client account access required">
      <div className="phase-member-gate__aurora phase-member-gate__aurora--left" />
      <div className="phase-member-gate__aurora phase-member-gate__aurora--right" />

      <div className="phase-member-gate__shell">
        <aside className="phase-member-gate__story">
          <div className="phase-member-gate__brand">
            <img src="/TRANSPARENCIA-03.webp" alt="Phase One Labz" />
            <span>Phase One Labz</span>
          </div>

          <div className="phase-member-gate__story-copy">
            <div className="phase-member-gate__overline">
              <LockKeyhole size={13} /> Verified client portal
            </div>
            <h1>Research,<br /><em>without compromise.</em></h1>
            <p>
              Access is reserved for registered clients. Your profile keeps every
              order, reward, and secure checkout detail in one place.
            </p>
          </div>

          <div className="phase-member-gate__proof">
            <span><Check size={14} /> Verified checkout</span>
            <span><Check size={14} /> Order history</span>
            <span><Check size={14} /> Client rewards</span>
          </div>
        </aside>

        <div className="phase-member-gate__panel">
          {status === "checking" && (
            <div className="phase-member-gate__checking" role="status">
              <div className="phase-member-gate__checking-icon">
                <Loader2 size={22} className="phase-member-gate__spin" />
              </div>
              <strong>Checking secure access</strong>
              <span>Restoring your client session.</span>
            </div>
          )}

          <div className={`phase-member-gate__panel-content${status === "checking" ? " is-checking" : ""}`}>
          <div className="phase-member-gate__panel-header">
            <span className="phase-member-gate__panel-kicker">Client access</span>
            <ShieldCheck size={18} />
          </div>

          <div className="phase-member-gate__form-copy">
            <h2>{isRegistering ? "Create your profile" : "Welcome back"}</h2>
            <p>{isRegistering ? "Your account is ready in less than a minute." : "Sign in to continue to the private catalog."}</p>
          </div>

          <div className="phase-member-gate__tabs" role="tablist" aria-label="Account access">
            <button type="button" className={!isRegistering ? "is-active" : ""} onClick={() => switchMode("login")}>Sign in</button>
            <button type="button" className={isRegistering ? "is-active" : ""} onClick={() => switchMode("register")}>Create account</button>
          </div>

          {isRegistering ? (
            <form className="phase-member-gate__form" onSubmit={handleRegistration}>
              <div className="phase-member-gate__name-grid">
                <label>First name<input type="text" value={registerForm.first_name} onChange={(event) => setRegisterForm((current) => ({ ...current, first_name: event.target.value }))} autoComplete="given-name" required /></label>
                <label>Last name<input type="text" value={registerForm.last_name} onChange={(event) => setRegisterForm((current) => ({ ...current, last_name: event.target.value }))} autoComplete="family-name" required /></label>
              </div>
              <label>Email address<input type="email" value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" required /></label>
              <label>
                Password
                <span className="phase-member-gate__password-field">
                  <input type={showPassword ? "text" : "password"} value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} autoComplete="new-password" minLength={8} required />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              <p className="phase-member-gate__hint"><Sparkles size={14} /> Use 8 or more characters to protect your account.</p>
              <label className="phase-member-gate__age-confirmation"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /> <span>I confirm that I am 21 or older.</span></label>
              {error && <p className="phase-member-gate__error">{error}</p>}
              <button type="submit" className="phase-member-gate__submit" disabled={isWorking}>
                {isWorking ? <Loader2 size={17} className="phase-member-gate__spin" /> : <Sparkles size={17} />}
                {isWorking ? "Creating secure profile" : "Create and enter"}
              </button>
            </form>
          ) : (
            <form className="phase-member-gate__form" onSubmit={handleLogin}>
              <label>Email address<input type="email" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" autoCapitalize="none" spellCheck="false" required /></label>
              <label>
                Password
                <span className="phase-member-gate__password-field">
                  <input type={showPassword ? "text" : "password"} value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              <div className="phase-member-gate__forgot"><a href="/forgot-password">Forgot your password?</a></div>
              <label className="phase-member-gate__age-confirmation"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /> <span>I confirm that I am 21 or older.</span></label>
              {error && <p className="phase-member-gate__error">{error}</p>}
              <button type="submit" className="phase-member-gate__submit" disabled={isWorking}>
                {isWorking ? <Loader2 size={17} className="phase-member-gate__spin" /> : <LockKeyhole size={17} />}
                {isWorking ? "Verifying secure access" : "Enter private catalog"}
              </button>
            </form>
          )}

          <p className="phase-member-gate__legal">By continuing, you confirm you are 21+ and agree to our client access requirements.</p>
          </div>
        </div>
      </div>

      <style>{`
        html.phase-member-gate-open, body.phase-member-gate-open { width: 100% !important; height: 100% !important; overflow: hidden !important; overscroll-behavior: none; }
        .phase-member-gate { position: fixed !important; inset: 0 !important; z-index: 2147483646; display: grid; box-sizing: border-box; width: 100vw !important; min-width: 100vw; max-width: none; height: 100vh; min-height: 100vh; place-items: center; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 28px; background: #030711; color: #f8fafc; isolation: isolate; animation: phase-member-gate-in .32s cubic-bezier(.22, 1, .36, 1) both; }
        @supports (height: 100dvh) { .phase-member-gate { height: 100dvh; min-height: 100dvh; } }
        .phase-member-gate.is-leaving { pointer-events: none; animation: phase-member-gate-out .28s ease both; }
        .phase-member-gate::before { content: ""; position: absolute; inset: 0; opacity: .35; background-image: linear-gradient(rgba(125, 211, 252, .045) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, .045) 1px, transparent 1px); background-size: 64px 64px; mask-image: radial-gradient(ellipse at center, black, transparent 75%); }
        .phase-member-gate__aurora { position: absolute; width: 68vw; aspect-ratio: 1; border-radius: 50%; filter: blur(38px); pointer-events: none; }
        .phase-member-gate__aurora--left { left: -38vw; top: -35vw; background: radial-gradient(circle, rgba(14, 116, 144, .36), transparent 67%); }
        .phase-member-gate__aurora--right { right: -36vw; bottom: -38vw; background: radial-gradient(circle, rgba(8, 145, 178, .23), transparent 66%); }
        .phase-member-gate__shell { position: relative; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(390px, .92fr); box-sizing: border-box; width: min(100%, 1020px); min-height: 590px; overflow: hidden; border: 1px solid rgba(186, 230, 253, .19); border-radius: 28px; background: rgba(5, 13, 28, .88); box-shadow: 0 36px 130px rgba(0, 0, 0, .56), inset 0 1px rgba(255, 255, 255, .08); backdrop-filter: blur(28px); }
        .phase-member-gate__story { position: relative; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; padding: 38px 46px; overflow: hidden; background: linear-gradient(145deg, rgba(10, 33, 59, .97), rgba(4, 14, 30, .96)); }
        .phase-member-gate__story::after { content: ""; position: absolute; width: 330px; height: 330px; right: -155px; bottom: -142px; border: 1px solid rgba(103, 232, 249, .25); border-radius: 50%; box-shadow: 0 0 0 34px rgba(103, 232, 249, .035), 0 0 0 69px rgba(103, 232, 249, .025); }
        .phase-member-gate__brand, .phase-member-gate__story-copy, .phase-member-gate__proof { position: relative; z-index: 1; }
        .phase-member-gate__brand { display: inline-flex; align-items: center; gap: 11px; color: rgba(224, 242, 254, .88); font-size: 11px; font-weight: 900; letter-spacing: .17em; text-transform: uppercase; }
        .phase-member-gate__brand img { width: 48px; height: 38px; object-fit: contain; filter: drop-shadow(0 0 15px rgba(165, 243, 252, .35)); }
        .phase-member-gate__overline { display: inline-flex; align-items: center; gap: 8px; color: #67e8f9; font-size: 10px; font-weight: 900; letter-spacing: .17em; text-transform: uppercase; }
        .phase-member-gate h1 { max-width: 430px; margin: 20px 0 16px; font-size: clamp(43px, 5vw, 68px); font-weight: 650; line-height: .92; letter-spacing: -.07em; }
        .phase-member-gate h1 em { color: #a5f3fc; font-style: normal; }
        .phase-member-gate__story-copy > p { max-width: 420px; margin: 0; color: rgba(203, 213, 225, .71); font-size: 14px; line-height: 1.8; }
        .phase-member-gate__proof { display: flex; flex-wrap: wrap; gap: 10px 18px; color: rgba(224, 242, 254, .76); font-size: 11px; font-weight: 750; }
        .phase-member-gate__proof span { display: inline-flex; align-items: center; gap: 6px; }
        .phase-member-gate__proof svg { color: #67e8f9; }
        .phase-member-gate__panel { position: relative; display: flex; flex-direction: column; padding: 38px 42px 30px; background: linear-gradient(180deg, rgba(10, 20, 37, .93), rgba(3, 9, 20, .98)); }
        .phase-member-gate__panel-content { display: flex; min-height: 100%; flex: 1; flex-direction: column; transition: opacity .18s ease; }
        .phase-member-gate__panel-content.is-checking { visibility: hidden; opacity: 0; }
        .phase-member-gate__checking { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 9px; padding: 30px; text-align: center; }
        .phase-member-gate__checking-icon { display: grid; width: 52px; height: 52px; margin-bottom: 7px; place-items: center; border: 1px solid rgba(103, 232, 249, .2); border-radius: 16px; background: rgba(34, 211, 238, .08); color: #a5f3fc; }
        .phase-member-gate__checking strong { color: #f8fafc; font-size: 16px; letter-spacing: -.02em; }
        .phase-member-gate__checking span { color: rgba(148, 163, 184, .86); font-size: 12px; }
        .phase-member-gate__panel-header { display: flex; align-items: center; justify-content: space-between; color: #a5f3fc; }
        .phase-member-gate__panel-kicker { font-size: 10px; font-weight: 900; letter-spacing: .19em; text-transform: uppercase; }
        .phase-member-gate__form-copy { margin: 36px 0 23px; }
        .phase-member-gate__form-copy h2 { margin: 0; color: white; font-size: 30px; font-weight: 650; letter-spacing: -.05em; }
        .phase-member-gate__form-copy p { margin: 8px 0 0; color: rgba(148, 163, 184, .9); font-size: 13px; line-height: 1.55; }
        .phase-member-gate__tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 22px; border: 1px solid rgba(186, 230, 253, .1); border-radius: 13px; padding: 3px; background: rgba(2, 6, 23, .47); }
        .phase-member-gate__tabs button { min-height: 37px; border: 0; border-radius: 9px; background: transparent; color: rgba(148, 163, 184, .88); font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
        .phase-member-gate__tabs button.is-active { background: rgba(103, 232, 249, .13); color: #cffafe; box-shadow: inset 0 0 0 1px rgba(103, 232, 249, .16); }
        .phase-member-gate__form { display: grid; gap: 13px; }
        .phase-member-gate__name-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
        .phase-member-gate__form label { display: grid; gap: 7px; color: rgba(186, 230, 253, .72); font-size: 9px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
        .phase-member-gate__form input { box-sizing: border-box; width: 100%; min-height: 47px; border: 1px solid rgba(186, 230, 253, .14); border-radius: 11px; background: rgba(2, 6, 23, .56); padding: 0 13px; color: #f8fafc; font-size: 14px; letter-spacing: normal; outline: none; transition: border-color .2s ease, box-shadow .2s ease; }
        .phase-member-gate__form input:focus { border-color: rgba(103, 232, 249, .72); box-shadow: 0 0 0 3px rgba(34, 211, 238, .09); }
        .phase-member-gate__password-field { position: relative; display: block; }
        .phase-member-gate__password-field input { padding-right: 46px; }
        .phase-member-gate__password-field button { position: absolute; top: 50%; right: 7px; display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 9px; background: transparent; color: rgba(165, 243, 252, .7); cursor: pointer; transform: translateY(-50%); }
        .phase-member-gate__password-field button:hover { background: rgba(103, 232, 249, .08); color: #e0f2fe; }
        .phase-member-gate__forgot { margin-top: -1px; text-align: right; }
        .phase-member-gate__forgot a { color: rgba(165, 243, 252, .83); font-size: 11px; text-decoration: none; }
        .phase-member-gate__hint { display: flex; align-items: center; gap: 7px; margin: -2px 0 0; color: rgba(148, 163, 184, .82); font-size: 11px; }
        .phase-member-gate__hint svg { color: #67e8f9; }
        .phase-member-gate__age-confirmation { display: flex !important; grid-template-columns: none !important; align-items: flex-start; gap: 9px !important; color: rgba(226, 232, 240, .8) !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: normal !important; line-height: 1.45; text-transform: none !important; cursor: pointer; }
        .phase-member-gate__age-confirmation input { width: 16px !important; min-width: 16px; min-height: 16px !important; height: 16px; margin: 0; accent-color: #67e8f9; cursor: pointer; }
        .phase-member-gate__error { margin: 0; border: 1px solid rgba(251, 113, 133, .24); border-radius: 10px; background: rgba(159, 18, 57, .17); padding: 10px 11px; color: #fecdd3; font-size: 11px; line-height: 1.5; }
        .phase-member-gate__submit { display: inline-flex; min-height: 52px; align-items: center; justify-content: center; gap: 9px; margin-top: 3px; border: 0; border-radius: 12px; background: linear-gradient(105deg, #a5f3fc, #67e8f9); color: #062039; font-size: 10px; font-weight: 950; letter-spacing: .13em; text-transform: uppercase; box-shadow: 0 13px 30px rgba(34, 211, 238, .17); cursor: pointer; transition: transform .2s ease, filter .2s ease; }
        .phase-member-gate__submit:hover { filter: brightness(1.07); transform: translateY(-1px); }
        .phase-member-gate__submit:disabled { cursor: wait; opacity: .72; transform: none; }
        .phase-member-gate__legal { margin: auto 0 0; padding-top: 20px; color: rgba(100, 116, 139, .85); font-size: 10px; line-height: 1.55; text-align: center; }
        .phase-member-gate__spin { animation: phase-member-gate-spin .8s linear infinite; }
        @keyframes phase-member-gate-spin { to { transform: rotate(360deg); } }
        @keyframes phase-member-gate-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes phase-member-gate-out { from { opacity: 1; } to { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .phase-member-gate, .phase-member-gate.is-leaving { animation-duration: .01ms; } }
        @media (max-width: 790px) { .phase-member-gate { display: block; padding: 14px 14px calc(22px + env(safe-area-inset-bottom)); } .phase-member-gate__shell { display: block; min-height: 0; margin: 0 auto; } .phase-member-gate__story { min-height: 0; padding: 17px 22px; } .phase-member-gate__story-copy, .phase-member-gate__proof { display: none; } .phase-member-gate__panel { padding: 23px 22px 22px; } .phase-member-gate__form-copy { margin: 22px 0 18px; } .phase-member-gate__form-copy h2 { font-size: 27px; } .phase-member-gate__form input { font-size: 16px; } .phase-member-gate__legal { margin-top: 18px; padding-top: 0; } }
        @media (max-width: 420px) { .phase-member-gate { padding: 10px 10px calc(18px + env(safe-area-inset-bottom)); } .phase-member-gate__name-grid { grid-template-columns: 1fr; } .phase-member-gate__story { padding: 18px; } .phase-member-gate__panel { padding: 20px 18px; } .phase-member-gate__brand span { font-size: 9px; } }
      `}</style>
    </section>
  );
}

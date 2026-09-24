import "./MemberAccessGate.styles.css";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem("lab_auth_token") || "";
  } catch {
    return "";
  }
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
    const hasSavedSession = initialHasSession || Boolean(getSavedAuthToken());

    if (hasSavedSession) {
      verifySession();
    } else {
      setStatus("unauthenticated");
    }

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
      <div className="phase-member-gate__shell">
        <aside className="phase-member-gate__story">
          <div className="phase-member-gate__brand">
            <img src="/TRANSPARENCIA-03.webp" alt="Phase One Labz" />
            <span>Client portal</span>
          </div>

          <div className="phase-member-gate__story-copy">
            <div className="phase-member-gate__overline">
              Private research catalog
            </div>
            <h1>Access your research account.</h1>
            <p>
              Sign in to review orders, rewards, and batch documentation in one
              secure place.
            </p>
          </div>

          <div className="phase-member-gate__proof">
            <span>21+ access</span>
            <span>Research use only</span>
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
            <span className="phase-member-gate__panel-kicker">Account access</span>
            <span className="phase-member-gate__secure-status"><i /> Secure session</span>
          </div>

          <div className="phase-member-gate__form-copy">
            <h2>{isRegistering ? "Create your profile" : "Welcome back"}</h2>
            <p>{isRegistering ? "Create an account to continue." : "Sign in to continue to the catalog."}</p>
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
              <p className="phase-member-gate__hint">Use at least 8 characters.</p>
              <label className="phase-member-gate__age-confirmation"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /> <span>I confirm that I am 21 or older.</span></label>
              {error && <p className="phase-member-gate__error">{error}</p>}
              <button type="submit" className="phase-member-gate__submit" disabled={isWorking}>
                {isWorking ? <Loader2 size={17} className="phase-member-gate__spin" /> : <LockKeyhole size={17} />}
                {isWorking ? "Creating account" : "Create account"}
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
                {isWorking ? "Signing in" : "Sign in"}
              </button>
            </form>
          )}

          <p className="phase-member-gate__legal">Access is limited to clients aged 21 or older. Products are for research use only.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

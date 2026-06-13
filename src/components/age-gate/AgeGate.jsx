import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import "./age-gate.css";

const AGE_GATE_KEY = "phase_age_verified";
const AGE_GATE_UNTIL_KEY = "phase_age_verified_until";
const AGE_GATE_TERMS_KEY = "phase_terms_accepted";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_MS = 12 * 60 * 60 * 1000;

function hasValidAgeGate() {
  try {
    const verified = window.localStorage.getItem(AGE_GATE_KEY);
    const validUntil = Number(window.localStorage.getItem(AGE_GATE_UNTIL_KEY));

    if (verified !== "yes") return false;
    if (!validUntil || Number.isNaN(validUntil)) return false;

    return Date.now() < validUntil;
  } catch {
    return false;
  }
}

function lockPage(scrollYRef) {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  scrollYRef.current = scrollY;

  document.documentElement.classList.add("phase-age-lock");
  document.body.classList.add("phase-age-lock");

  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPage(scrollYRef) {
  const scrollY = scrollYRef.current || 0;

  document.documentElement.classList.remove("phase-age-lock");
  document.body.classList.remove("phase-age-lock");

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";

  window.scrollTo(0, scrollY);
}

function getRegisterError(data = {}) {
  return (
    data?.error ||
    data?.message ||
    data?.data?.error ||
    data?.data?.message ||
    "We could not create your account."
  );
}

function saveAuthData(data = {}, form = {}) {
  try {
    const token =
      data?.token ||
      data?.authToken ||
      data?.auth_token ||
      data?.accessToken ||
      data?.access_token ||
      data?.data?.token ||
      data?.data?.authToken ||
      data?.data?.auth_token ||
      "";

    const account =
      data?.user ||
      data?.account ||
      data?.customer ||
      data?.data?.user ||
      data?.data?.account ||
      data?.data?.customer ||
      null;

    if (token) {
      window.localStorage.setItem("lab_auth_token", token);
    }

    const fallbackAccount = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      name: `${form.first_name} ${form.last_name}`.trim(),
    };

    window.localStorage.setItem(
      "phaseone_account",
      JSON.stringify(account || fallbackAccount)
    );

    window.localStorage.setItem("customer_email", form.email);
    window.localStorage.setItem(
      "customer_name",
      `${form.first_name} ${form.last_name}`.trim()
    );
    window.localStorage.setItem("billing_first_name", form.first_name);
    window.localStorage.setItem("billing_last_name", form.last_name);

    window.dispatchEvent(new Event("lab-auth-updated"));
    window.dispatchEvent(new Event("phaseone:account-updated"));
    window.dispatchEvent(new Event("phaseone:customer-updated"));
  } catch {
    // Account was created; storage is only a convenience.
  }
}

export default function AgeGate({
  logoSrc = "/TRANSPARENCIA-03.webp",
  minAge = 21,
  registerEndpoint = "/api/auth/register",
  termsUrl = "/terms-and-conditions",
  privacyUrl = "/privacy-policy",
  disclaimerUrl = "/disclaimer",
  underAgeRedirectUrl = "https://www.google.com",
}) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState("verify");
  const [remember, setRemember] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [denied, setDenied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [registerStatus, setRegisterStatus] = useState("idle");
  const [registerError, setRegisterError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  const scrollYRef = useRef(0);

  useEffect(() => {
    const isVerified = hasValidAgeGate();

    if (!isVerified) {
      setVisible(true);
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    lockPage(scrollYRef);

    const preventKeys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const preventBackgroundTouch = (event) => {
      const shell = event.target.closest(".phase-age-gate__shell");

      if (!shell) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const preventWheelBehind = (event) => {
      const shell = event.target.closest(".phase-age-gate__shell");

      if (!shell) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", preventKeys, true);
    document.addEventListener("touchmove", preventBackgroundTouch, {
      passive: false,
      capture: true,
    });
    document.addEventListener("wheel", preventWheelBehind, {
      passive: false,
      capture: true,
    });

    return () => {
      window.removeEventListener("keydown", preventKeys, true);
      document.removeEventListener("touchmove", preventBackgroundTouch, true);
      document.removeEventListener("wheel", preventWheelBehind, true);

      unlockPage(scrollYRef);
    };
  }, [visible]);

  const saveVerification = () => {
    try {
      const expiresAt = remember
        ? Date.now() + THIRTY_DAYS_MS
        : Date.now() + SESSION_MS;

      window.localStorage.setItem(AGE_GATE_KEY, "yes");
      window.localStorage.setItem(AGE_GATE_UNTIL_KEY, String(expiresAt));
      window.localStorage.setItem(AGE_GATE_TERMS_KEY, "yes");
    } catch {
      // If storage fails, allow this visual session.
    }
  };

  const requireTerms = () => {
    if (acceptedTerms) return true;

    setTermsError(true);
    return false;
  };

  const handleEnter = () => {
    if (!requireTerms()) return;

    saveVerification();
    setVisible(false);
  };

  const openRegister = () => {
    if (!requireTerms()) return;

    setDenied(false);
    setRegisterError("");
    setMode("register");
  };

  const handleUnderAge = () => {
    setDenied(true);
    setRedirecting(true);

    try {
      window.localStorage.removeItem(AGE_GATE_KEY);
      window.localStorage.removeItem(AGE_GATE_UNTIL_KEY);
      window.localStorage.removeItem(AGE_GATE_TERMS_KEY);
      window.sessionStorage.removeItem(AGE_GATE_KEY);
      window.sessionStorage.removeItem(AGE_GATE_UNTIL_KEY);
      window.sessionStorage.removeItem(AGE_GATE_TERMS_KEY);
    } catch {
      // Ignore storage errors.
    }

    window.setTimeout(() => {
      window.location.replace(underAgeRedirectUrl);
    }, 900);
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;

    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (registerStatus !== "loading") {
      setRegisterStatus("idle");
      setRegisterError("");
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();

    if (!acceptedTerms) {
      setMode("verify");
      setTermsError(true);
      return;
    }

    try {
      setRegisterStatus("loading");
      setRegisterError("");

      const payload = {
        ...registerForm,
        email: registerForm.email.trim().toLowerCase(),
        accepted_terms: true,
        accepted_research_disclaimer: true,
      };

      const response = await fetch(registerEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        setRegisterStatus("error");
        setRegisterError(getRegisterError(data));
        return;
      }

      saveAuthData(data, payload);
      saveVerification();
      setRegisterStatus("success");

      window.setTimeout(() => {
        setVisible(false);
      }, 2400);
    } catch {
      setRegisterStatus("error");
      setRegisterError("Registration failed. Please try again.");
    }
  };

  if (!ready || !visible) return null;

  return (
    <div
      className="phase-age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase-age-title"
    >
      <div className="phase-age-gate__ambient" />
      <div className="phase-age-gate__mesh" />
      <div className="phase-age-gate__scanline" />

      <div className="phase-age-gate__shell">
        <div className="phase-age-gate__brandRail">
          <div className="phase-age-gate__logoBox">
            <img src={logoSrc} alt="Phase One Labz" />
          </div>

          <div className="phase-age-gate__brandText">
            <span>Phase One Labz</span>
            <strong>
              {mode === "register" ? "Create Account" : "Restricted Access"}
            </strong>
          </div>
        </div>

        {mode === "verify" ? (
          <div className="phase-age-gate__panel">
            <div className="phase-age-gate__left">
              <div className="phase-age-gate__badge">
                <LockKeyhole size={13} />
                Verification checkpoint
              </div>

              <h1 id="phase-age-title" className="phase-age-gate__title">
                Research catalog access requires age confirmation.
              </h1>

              <p className="phase-age-gate__text">
                This site contains products intended strictly for laboratory and
                research use. Confirm you are {minAge}+ to continue. Creating an
                account is optional for faster rewards and account access.
              </p>

              <div className="phase-age-gate__checks">
                <div>
                  <CheckCircle2 size={15} />
                  <span>Research-use-only catalog</span>
                </div>

                <div>
                  <CheckCircle2 size={15} />
                  <span>Age-restricted access</span>
                </div>

                <div>
                  <CheckCircle2 size={15} />
                  <span>Optional client account access</span>
                </div>
              </div>

              <div className="phase-age-gate__legalBox">
                <label
                  className={`phase-age-gate__terms ${
                    termsError && !acceptedTerms
                      ? "phase-age-gate__terms--error"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    disabled={redirecting}
                    onChange={(event) => {
                      setAcceptedTerms(event.target.checked);
                      if (event.target.checked) setTermsError(false);
                    }}
                  />

                  <span>
                    I confirm I am {minAge}+ and accept the{" "}
                    <a href={termsUrl} target="_blank" rel="noreferrer">
                      Terms
                    </a>
                    ,{" "}
                    <a href={privacyUrl} target="_blank" rel="noreferrer">
                      Privacy Policy
                    </a>
                    , and{" "}
                    <a href={disclaimerUrl} target="_blank" rel="noreferrer">
                      research-use disclaimers
                    </a>
                    . Products are not for human or animal consumption.
                  </span>
                </label>

                {termsError && !acceptedTerms && (
                  <p className="phase-age-gate__termsError">
                    Please accept the terms before continuing.
                  </p>
                )}
              </div>
            </div>

            <div className="phase-age-gate__right">
              <div className="phase-age-gate__ageMark">
                <span>{minAge}</span>
                <small>+</small>
              </div>

              <p className="phase-age-gate__confirm">
                Confirm that you meet the legal age requirement to enter this
                website.
              </p>

              {denied && (
                <div className="phase-age-gate__denied">
                  <AlertTriangle size={17} />
                  <span>
                    Access denied. You must be {minAge} or older to enter this
                    site. Redirecting...
                  </span>
                </div>
              )}

              <div className="phase-age-gate__actions">
                <button
                  type="button"
                  onClick={handleEnter}
                  disabled={redirecting || !acceptedTerms}
                  className="phase-age-gate__button phase-age-gate__button--primary"
                >
                  Confirm & enter
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={handleUnderAge}
                  disabled={redirecting}
                  className="phase-age-gate__button phase-age-gate__button--secondary"
                >
                  {redirecting ? "Redirecting..." : `I am under ${minAge}`}
                </button>
              </div>

              <button
                type="button"
                onClick={openRegister}
                disabled={redirecting || !acceptedTerms}
                className="phase-age-gate__createAccount"
              >
                <span className="phase-age-gate__createAccountMain">
                  <UserPlus size={15} />
                  Create account
                </span>

                <span className="phase-age-gate__createAccountBadge">
                  10% off
                </span>
              </button>

              <label className="phase-age-gate__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={redirecting}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="phase-age-gate__registerPanel">
            <div className="phase-age-gate__registerIntro">
              <button
                type="button"
                className="phase-age-gate__back"
                onClick={() => setMode("verify")}
                disabled={registerStatus === "loading"}
              >
                <ArrowLeft size={14} />
                Back to notice
              </button>

              <div className="phase-age-gate__registerBadge">
                <Sparkles size={13} />
                Client portal access
              </div>

              <h1 className="phase-age-gate__registerTitle">
                Create your optional client account.
              </h1>

              <p className="phase-age-gate__registerText">
                You can enter without an account, but creating one keeps rewards,
                restock notices, orders, and customer activity connected to your
                profile.
              </p>

              <div className="phase-age-gate__registerPerks">
                <div>
                  <BadgeCheck size={16} />
                  <span>Rewards-ready profile</span>
                </div>

                <div>
                  <ShieldCheck size={16} />
                  <span>Faster future checkout access</span>
                </div>

                <div>
                  <LockKeyhole size={16} />
                  <span>Secure customer session</span>
                </div>
              </div>
            </div>

            <form
              className="phase-age-gate__registerForm"
              onSubmit={handleRegisterSubmit}
            >
              {registerStatus === "success" ? (
                <div className="phase-age-gate__redirectState">
                  <div className="phase-age-gate__redirectRing">
                    <CheckCircle2 size={30} />
                  </div>

                  <span>Account created</span>

                  <h2>Redirecting to the research portal</h2>

                  <p>
                    Your profile is ready. We’re preparing your client session,
                    rewards access, and catalog experience.
                  </p>

                  <div className="phase-age-gate__redirectBar">
                    <i />
                  </div>

                  <div className="phase-age-gate__redirectMeta">
                    <Loader2 size={14} className="phase-age-gate__spin" />
                    Opening secure portal...
                  </div>
                </div>
              ) : (
                <>
                  <div className="phase-age-gate__registerIcon">
                    <UserPlus size={22} />
                  </div>

                  <h2>Create account</h2>

                  <p>
                    Use your real email so rewards, restock notices, and account
                    activity stay connected.
                  </p>

                  <div className="phase-age-gate__formGrid">
                    <label>
                      <span>First name</span>
                      <input
                        name="first_name"
                        type="text"
                        value={registerForm.first_name}
                        onChange={handleRegisterChange}
                        placeholder="NAME"
                        autoComplete="given-name"
                        required
                      />
                    </label>

                    <label>
                      <span>Last name</span>
                      <input
                        name="last_name"
                        type="text"
                        value={registerForm.last_name}
                        onChange={handleRegisterChange}
                        placeholder="LAST NAME"
                        autoComplete="family-name"
                        required
                      />
                    </label>
                  </div>

                  <label>
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      placeholder="customer@email.com"
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label>
                    <span>Password</span>

                    <div className="phase-age-gate__passwordWrap">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </label>

                  {registerError && (
                    <p className="phase-age-gate__registerError">
                      {registerError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={registerStatus === "loading"}
                    className="phase-age-gate__registerSubmit"
                  >
                    {registerStatus === "loading" ? (
                      <>
                        <Loader2 size={16} className="phase-age-gate__spin" />
                        Creating account
                      </>
                    ) : (
                      <>
                        Create account & continue
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        )}

        <div className="phase-age-gate__footer">
          <ShieldCheck size={15} />
          <span>
            Access is required before viewing any page content. By continuing,
            you confirm acceptance of all research-use disclaimers.
          </span>
        </div>
      </div>
    </div>
  );
}

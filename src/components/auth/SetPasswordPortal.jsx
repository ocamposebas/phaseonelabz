import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

function getQueryValue(key) {
  if (typeof window === "undefined") return "";

  return new URLSearchParams(window.location.search).get(key) || "";
}

function getPasswordScore(password = "") {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return score;
}

export default function SetPasswordPortal() {
  const [login] = useState(() => getQueryValue("login"));
  const [key] = useState(() => getQueryValue("key"));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [portalUrl, setPortalUrl] = useState("/account");

  const passwordScore = useMemo(() => getPasswordScore(password), [password]);

  const passwordLabel =
    passwordScore >= 5
      ? "Strong"
      : passwordScore >= 3
        ? "Good"
        : password
          ? "Weak"
          : "Required";

  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;

  const canSubmit =
    login &&
    key &&
    password.length >= 8 &&
    passwordsMatch &&
    status !== "loading";

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!login || !key) {
      setStatus("error");
      setMessage("This password link is missing required access details.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");

      const response = await fetch("/api/auth/set-password.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          login,
          key,
          password,
        }),
      });

      const rawText = await response.text();

      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            rawText ||
            `Password could not be created. HTTP ${response.status}`
        );
      }

      setStatus("success");
      setMessage(
        data?.message ||
          "Password created successfully. You can now access your account dashboard."
      );
      setPortalUrl(data?.portal_url || data?.portalUrl || "/account");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(error?.message || "Password could not be created.");
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden px-5 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[150px]" />
        <div className="absolute right-[-12%] top-[34%] h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto grid min-h-[70vh] max-w-6xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-cyan-200/12 bg-cyan-300/[0.035] px-4 py-2">
            <LockKeyhole size={14} className="text-cyan-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
              Secure Access
            </span>
          </div>

          <h1 className="max-w-2xl text-[42px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:text-[64px] lg:text-[76px]">
            Create your
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
              new password.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400 sm:text-[15px] sm:leading-8">
            Create a secure password to access your Phase One Labz account,
            dashboard, rewards, and affiliate portal if applicable.
          </p>

          <div className="mt-7 rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.022] p-4 backdrop-blur-xl">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200">
              <ShieldCheck size={18} />
            </div>

            <p className="text-sm font-semibold text-white">
              Secure password link
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              This link is generated securely and can expire. If it no longer
              works, request a new password reset link.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.025] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-[110px]" />

          <div className="relative z-10">
            {status === "success" ? (
              <div className="rounded-[1.6rem] border border-cyan-200/15 bg-cyan-300/[0.07] p-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.09] text-cyan-100">
                  <CheckCircle2 size={24} />
                </div>

                <p className="mt-5 text-xl font-semibold tracking-[-0.035em] text-white">
                  Password created
                </p>

                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-cyan-50/70">
                  {message}
                </p>

                <a
                  href={portalUrl}
                  className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white sm:w-auto"
                >
                  Open account dashboard
                  <ArrowRight size={16} />
                </a>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/60">
                    Secure password
                  </p>

                  <h2 className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.055em] text-white sm:text-[34px]">
                    Create a new password
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                    Enter a new secure password for your Phase One Labz account.
                    Use at least 8 characters; numbers and symbols are
                    recommended.
                  </p>
                </div>

                {!login || !key ? (
                  <div className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-4 text-sm leading-6 text-red-200">
                    This password link is missing required access details.
                    Please open the email link again or request a new password
                    reset link.
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                        Account
                      </p>
                      <p className="mt-2 break-all text-sm font-semibold text-white">
                        {decodeURIComponent(login)}
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                        New password
                      </span>

                      <div className="grid min-h-[54px] grid-cols-[1fr_auto] overflow-hidden rounded-2xl border border-cyan-200/10 bg-[#020617]/65 focus-within:border-cyan-200/35">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setMessage("");
                          }}
                          className="min-h-[54px] bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-600"
                          placeholder="Minimum 8 characters"
                          autoComplete="new-password"
                          required
                          minLength={8}
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="grid w-12 place-items-center text-slate-400 transition hover:text-cyan-200"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}
                        </button>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                        Confirm password
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setMessage("");
                        }}
                        className="min-h-[54px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                    </label>

                    <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/42 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                          Password strength
                        </span>

                        <strong className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                          {passwordLabel}
                        </strong>
                      </div>

                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <span
                            key={index}
                            className={`h-1.5 rounded-full ${
                              index < passwordScore
                                ? "bg-cyan-300"
                                : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {message && (
                      <p
                        className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                          status === "error"
                            ? "border-red-400/15 bg-red-400/10 text-red-200"
                            : "border-cyan-300/15 bg-cyan-400/10 text-cyan-100"
                        }`}
                      >
                        {message}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Creating password
                        </>
                      ) : (
                        <>
                          Create password
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
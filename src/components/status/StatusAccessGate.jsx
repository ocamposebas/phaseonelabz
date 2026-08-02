import { useId, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

function readErrorMessage(response, payload) {
  const code = String(payload?.code || payload?.errorCode || "").toLowerCase();

  if (
    response.status === 503 ||
    code === "not_configured" ||
    code === "configuration_missing" ||
    code === "status_access_not_configured"
  ) {
    return {
      type: "configuration",
      message:
        "Private status access has not been configured on this environment yet.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      type: "credentials",
      message: "The password is incorrect. Check it and try again.",
    };
  }

  if (response.status === 429) {
    return {
      type: "rate-limit",
      message: "Too many attempts. Wait a moment before trying again.",
    };
  }

  return {
    type: "server",
    message:
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : "We could not verify access right now. Please try again.",
  };
}

export default function StatusAccessGate({
  configured = true,
  configurationMissing = false,
}) {
  const passwordId = useId();
  const errorId = useId();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [configurationUnavailable, setConfigurationUnavailable] = useState(
    configurationMissing || configured === false
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (!password.trim() || submitting || configurationUnavailable) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/status/access", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (response.ok && payload?.ok !== false) {
        window.location.reload();
        return;
      }

      const accessError = readErrorMessage(response, payload);
      if (accessError.type === "configuration") {
        setConfigurationUnavailable(true);
      } else {
        setPassword("");
      }
      setError(accessError.message);
    } catch {
      setError(
        "The access service is not responding. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const disabled =
    submitting || configurationUnavailable || password.trim().length === 0;

  return (
    <main className="relative isolate flex min-h-[calc(100dvh-10.25rem)] items-center overflow-hidden px-5 py-14 sm:px-8 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-[#020617]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[-17rem] -z-10 h-[34rem] w-[48rem] max-w-[105vw] -translate-x-1/2 rounded-full bg-cyan-300/[0.075] blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-13rem] right-[-8rem] -z-10 h-[28rem] w-[28rem] rounded-full bg-blue-600/[0.07] blur-[120px]"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-[31rem]">
        <section
          className="relative overflow-hidden rounded-[1.65rem] border border-cyan-200/[0.12] bg-[#07101f]/85 p-5 shadow-[0_32px_110px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8"
          aria-labelledby="private-status-heading"
        >
          <div
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full bg-cyan-300/[0.065] blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-start justify-between gap-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/[0.16] bg-cyan-300/[0.075] text-cyan-100 shadow-[0_0_28px_rgba(103,232,249,0.06)]">
                <LockKeyhole size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.11] bg-cyan-300/[0.045] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.17em] text-cyan-100/70">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.7)]"
                  aria-hidden="true"
                />
                Restricted
              </span>
            </div>

            <p className="mt-7 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/50">
              Operations portal
            </p>
            <h1
              id="private-status-heading"
              className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.055em] text-white sm:text-[36px]"
            >
              Private system status
            </h1>
            <p className="mt-3 max-w-md text-[12px] leading-6 text-slate-400 sm:text-[13px]">
              Enter the operations password to review live service health,
              incidents, and scheduled maintenance.
            </p>

            {configurationUnavailable ? (
              <div
                className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-300/[0.16] bg-amber-300/[0.055] p-4"
                role="alert"
              >
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-200"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[12px] font-semibold text-amber-50">
                    Access configuration required
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-amber-100/60">
                    Private status access is unavailable until its server-side
                    access password is configured.
                  </p>
                </div>
              </div>
            ) : (
              <form className="mt-7" onSubmit={handleSubmit} noValidate>
                <label
                  htmlFor={passwordId}
                  className="text-[9px] font-black uppercase tracking-[0.19em] text-slate-400"
                >
                  Access password
                </label>

                <div className="relative mt-2.5">
                  <KeyRound
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/55"
                    aria-hidden="true"
                  />
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    spellCheck="false"
                    disabled={submitting}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    placeholder="Enter password"
                    className="h-14 w-full rounded-2xl border border-cyan-200/[0.12] bg-[#020617]/65 pl-12 pr-14 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-cyan-200/[0.2] focus:border-cyan-200/[0.34] focus:bg-[#020617]/82 focus:ring-4 focus:ring-cyan-300/[0.055] disabled:cursor-wait disabled:opacity-65"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={submitting}
                    className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-cyan-300/[0.07] hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35 disabled:cursor-wait"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div className="min-h-[3rem] pt-2.5">
                  {error && (
                    <p
                      id={errorId}
                      className="flex items-start gap-2 text-[11px] leading-5 text-rose-200/85"
                      role="alert"
                    >
                      <AlertTriangle
                        size={14}
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={disabled}
                  className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-cyan-100/[0.18] bg-cyan-200 px-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_12px_38px_rgba(103,232,249,0.12)] transition hover:bg-cyan-100 hover:shadow-[0_15px_46px_rgba(103,232,249,0.19)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/65 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07101f] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      Verifying access
                    </>
                  ) : (
                    <>
                      Open status portal
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 flex items-start gap-2.5 border-t border-white/[0.07] pt-5">
              <ShieldCheck
                size={15}
                className="mt-0.5 shrink-0 text-cyan-200/55"
                aria-hidden="true"
              />
              <p className="text-[10px] leading-5 text-slate-600">
                Access is limited to authorized operations personnel. Credentials
                are verified securely by the server.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

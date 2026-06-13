import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setStatus("loading");
      setMessage("");

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to process request.");
      }

      setStatus("success");
      setMessage(
        data.message ||
          "If an account exists for this email, reset instructions will be sent."
      );
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    }
  };

  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-24 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-12 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[140px]" />
        <div className="absolute right-[-10%] top-[28%] h-80 w-80 rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute left-[-10%] bottom-[-10%] h-80 w-80 rounded-full bg-cyan-300/6 blur-[140px]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-12rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-3">
            <span className="h-px w-8 bg-cyan-300/70" />
            <span className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/70">
              Secure Recovery
            </span>
          </div>

          <h1 className="max-w-2xl text-[38px] font-semibold leading-[1.03] tracking-[-0.06em] text-white sm:text-[54px] lg:text-[68px]">
            Reset your
            <span className="block text-cyan-200/85">account access.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-8 text-slate-300/65">
            Enter the email connected to your customer account. If the account
            exists, we’ll send secure reset instructions to that inbox.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl">
              <ShieldCheck size={18} className="mb-3 text-cyan-200" />
              <p className="text-sm font-semibold text-white">
                Private by design
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                We don’t reveal whether an email exists in our system.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl">
              <LockKeyhole size={18} className="mb-3 text-cyan-200" />
              <p className="text-sm font-semibold text-white">
                One-time reset
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Password reset links are generated securely by WordPress.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.025] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />

          <div className="relative z-10">
            <div className="mb-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200">
                <Mail size={21} />
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                Forgot password?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                We’ll send reset instructions if this email matches an account.
              </p>
            </div>

            {(isSuccess || isError) && message && (
              <div
                className={`mb-5 rounded-[1.4rem] border p-4 ${
                  isSuccess
                    ? "border-cyan-200/15 bg-cyan-300/[0.075]"
                    : "border-red-300/20 bg-red-500/[0.075]"
                }`}
              >
                <div className="flex gap-3">
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
                      isSuccess
                        ? "border-cyan-200/20 bg-cyan-300/[0.12] text-cyan-100"
                        : "border-red-300/20 bg-red-500/[0.12] text-red-100"
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <LockKeyhole size={20} />
                    )}
                  </div>

                  <div>
                    <p
                      className={`text-[15px] font-semibold tracking-[-0.025em] ${
                        isSuccess ? "text-cyan-50" : "text-red-50"
                      }`}
                    >
                      {isSuccess ? "Check your inbox" : "Request unavailable"}
                    </p>

                    <p
                      className={`mt-1 text-sm leading-6 ${
                        isSuccess
                          ? "text-cyan-100/75"
                          : "text-red-100/75"
                      }`}
                    >
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55">
                Account email
              </span>

              <div className="relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/50"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 py-4 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="customer@email.com"
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="mt-5 text-center text-xs leading-6 text-slate-500">
              Remember your password?{" "}
              <a href="/account" className="text-cyan-200 hover:text-white">
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
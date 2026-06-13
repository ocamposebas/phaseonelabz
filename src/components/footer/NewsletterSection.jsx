import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStatus("error");
      setMessage("Please enter your email.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");

      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to subscribe right now.");
      }

      setStatus("success");
      setMessage("You’re in. Check your email for WELCOME10.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <section className="relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16">
      <div className="relative mx-auto max-w-7xl">
        <div className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-[1.6rem] border border-cyan-200/12 bg-[#121E2E] px-5 py-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(103,232,249,0.10),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012),rgba(103,232,249,0.035))]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />

          <div className="relative grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/60">
                Subscribe to newsletter
              </p>

              <h2 className="mt-2 text-[24px] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[30px]">
                Get product and COA updates first.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                New releases, restocks, batch documentation updates, and
                research catalog announcements.
              </p>
            </div>

            <form className="w-full" onSubmit={handleSubmit}>
              <div className="flex flex-col overflow-hidden rounded-xl border border-cyan-200/18 bg-[#07111D]/80 shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (status !== "loading") {
                      setStatus("idle");
                      setMessage("");
                    }
                  }}
                  placeholder="Email Address *"
                  className="min-h-[48px] flex-1 bg-transparent px-5 text-sm font-medium text-white outline-none placeholder:text-slate-500"
                />

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2 bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[130px]"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Saving
                    </>
                  ) : status === "success" ? (
                    <>
                      Sent
                      <CheckCircle2 size={13} />
                    </>
                  ) : (
                    <>
                      Submit
                      <ArrowRight
                        size={13}
                        className="transition group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                Research-use-only catalog updates. No spam.
              </p>

              {message && (
                <p
                  className={`mt-3 rounded-xl border px-4 py-3 text-xs leading-5 ${
                    status === "success"
                      ? "border-cyan-200/15 bg-cyan-300/[0.07] text-cyan-100"
                      : "border-red-300/15 bg-red-500/[0.07] text-red-100"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
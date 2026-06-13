import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";

export default function RegisterForm() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setStatus("loading");
      setError("");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(data.error || "We could not create your account.");
        return;
      }

      setStatus("success");
      window.location.href = "/account";
    } catch (err) {
      setStatus("error");
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <section className="relative min-h-[75vh] overflow-hidden px-6 py-24 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[130px]" />
        <div className="absolute right-[-10%] top-[25%] h-72 w-72 rounded-full bg-blue-500/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-3">
            <span className="h-px w-8 bg-cyan-300/70" />
            <span className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/70">
              Create Account
            </span>
          </div>

          <h1 className="max-w-2xl text-[38px] font-semibold leading-[1.03] tracking-[-0.055em] text-white sm:text-[54px] lg:text-[68px]">
            Join the
            <span className="block text-cyan-200/85">
              client portal.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-8 text-slate-300/65">
            Create your account to access rewards points, recent orders, and
            account activity connected to your customer profile.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl">
              <Sparkles size={18} className="mb-3 text-cyan-200" />
              <p className="text-sm font-semibold text-white">
                Earn points
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Current rule: 1 USD = 1 point on eligible orders.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl">
              <BadgeCheck size={18} className="mb-3 text-cyan-200" />
              <p className="text-sm font-semibold text-white">
                Track activity
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Review recent orders and rewards balance.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-cyan-200" />
            <p className="text-xs leading-6 text-slate-400">
              Customer account access is used for rewards, order history, and
              account activity. Keep your login credentials private.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.025] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-8"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-[100px]" />

          <div className="relative z-10">
            <div className="mb-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200">
                <UserPlus size={21} />
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                Create your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Register to access your rewards dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55">
                  First name
                </span>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      first_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="Sebastian"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55">
                  Last name
                </span>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      last_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="Ocampo"
                  required
                />
              </label>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="customer@email.com"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55">
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="mt-5 text-center text-xs leading-6 text-slate-500">
              Already have an account?{" "}
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
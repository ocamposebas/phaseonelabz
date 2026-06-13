import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

const steps = [
  {
    label: "Create account",
    text: "Sign in before checkout.",
  },
  {
    label: "Place order",
    text: "Eligible orders earn points.",
  },
  {
    label: "Track rewards",
    text: "View everything in your portal.",
  },
];

export default function RewardsProgram() {
  return (
    <section className="relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-cyan-300/8 blur-[140px]" />
        <div className="absolute bottom-0 right-[-10%] h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Top editorial */}
        <div className="mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
            <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" />

                <span className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-200/65">
                Rewards Program
                </span>
            </div>

            <h2 className="mx-auto max-w-4xl text-[38px] font-semibold leading-[0.94] tracking-[-0.07em] text-white sm:text-[48px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]">
                Turn every eligible order
                <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
                into rewards.
                </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-[14px] leading-7 text-slate-300/65 md:mx-0">
                Customers who create an account before checkout can earn points,
                track recent orders, and manage rewards from one clean portal.
            </p>
        </div>
        {/* Main creative layout */}
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          {/* Left rewards card */}
          <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#05111d] p-5 shadow-[0_28px_110px_rgba(0,0,0,0.28)] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(103,232,249,0.16),transparent_34%),radial-gradient(circle_at_25%_85%,rgba(59,130,246,0.14),transparent_34%)]" />
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
              <div className="absolute -right-28 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-[110px]" />
            </div>

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/60">
                    Client Rewards
                  </p>

                  <h3 className="mt-3 max-w-sm text-[26px] font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-[34px]">
                    A cleaner way to reward returning customers.
                  </h3>
                </div>

                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100">
                  <Sparkles size={22} />
                </div>
              </div>

              {/* Floating card mockup */}
              <div className="relative mt-6 flex flex-1 items-center justify-center">
                <div className="absolute h-52 w-52 rounded-full bg-cyan-300/10 blur-[80px]" />

                <div className="rewards-float-wrap relative w-full max-w-[330px]">
                  <div className="rewards-float-card relative rotate-[-2deg] overflow-hidden rounded-[1.7rem] border border-cyan-200/15 bg-[linear-gradient(145deg,rgba(236,254,255,0.12),rgba(255,255,255,0.035),rgba(103,232,249,0.09))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-500 hover:rotate-0 hover:scale-[1.015]">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
                          <CreditCard size={18} />
                        </div>

                        <span className="rounded-full border border-cyan-200/15 bg-[#020617]/45 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100">
                          Active
                        </span>
                      </div>

                      <div className="mt-7">
                        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-100/60">
                          Rewards Balance
                        </p>

                        <div className="mt-2 flex items-end gap-2">
                          <span className="text-[50px] font-semibold leading-none tracking-[-0.08em] text-white">
                            1,240
                          </span>
                          <span className="pb-2 text-base font-semibold text-cyan-100/80">
                            pts
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/55 p-2.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Rule
                          </p>
                          <p className="mt-1 text-xs font-semibold text-white">
                            $1 = 1pt
                          </p>
                        </div>

                        <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/55 p-2.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Recent
                          </p>
                          <p className="mt-1 text-xs font-semibold text-white">
                            +30
                          </p>
                        </div>

                        <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/55 p-2.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Portal
                          </p>
                          <p className="mt-1 text-xs font-semibold text-cyan-100">
                            Ready
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="relative z-10 mt-5 text-[10px] font-bold uppercase leading-5 tracking-[0.16em] text-slate-500">
                Account required before checkout. Guest orders are not eligible
                for rewards after purchase.
              </p>
            </div>
          </div>

          {/* Right content */}
          <div className="grid gap-5">
            {/* Conversion card */}
            <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.018] p-6 backdrop-blur-xl sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-72 w-72 rounded-full bg-cyan-300/10 blur-[110px]" />

              <div className="relative z-10">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.06] text-cyan-200">
                  <UserRoundCheck size={22} />
                </div>

                <h3 className="max-w-2xl text-[28px] font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-[36px]">
                  Reward the customers who come back.
                </h3>

                <p className="mt-4 max-w-2xl text-[14px] leading-7 text-slate-300/65">
                  The rewards portal helps customers see their balance, recent
                  orders, and points activity without contacting support for
                  basic account questions.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/register"
                    className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan-200/20 bg-cyan-300 px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_28px_rgba(103,232,249,0.18)] transition hover:border-cyan-100/35 hover:bg-cyan-200 hover:shadow-[0_0_38px_rgba(103,232,249,0.28)]"
                  >
                    Create account
                    <ArrowRight
                      size={15}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </a>

                  <a
                    href="/account"
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/12 bg-white/[0.025] px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/75 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white"
                  >
                    View portal
                  </a>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#07111d]/80 p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />

              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/55">
                    How it works
                  </p>

                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                    Simple reward flow
                  </h3>
                </div>

                <div className="hidden items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:flex">
                  <Clock3 size={13} />
                  Before checkout
                </div>
              </div>

              <div className="relative grid gap-2.5">
                {steps.map((step, index) => (
                  <article
                    key={step.label}
                    className="group relative rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3.5 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]"
                  >
                    <div className="flex gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.055] text-[9px] font-black text-cyan-100">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold tracking-[-0.02em] text-white">
                          {step.label}
                        </h4>
                        <p className="mt-1 text-sm leading-5 text-slate-400">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-4 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3.5">
                <BadgeCheck
                  size={17}
                  className="mt-0.5 shrink-0 text-cyan-200"
                />
                <p className="text-xs leading-5 text-slate-400">
                  Eligible orders only. Rewards are calculated from completed or
                  processing orders connected to a customer account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .rewards-float-wrap {
          animation: rewardsFloat 4.6s ease-in-out infinite;
          transform-origin: center;
          will-change: transform;
        }

        .rewards-float-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(165, 243, 252, 0.2),
            transparent
          );
          opacity: 0;
          transform: translateX(-60%);
          animation: rewardsShine 5.8s ease-in-out infinite;
        }

        @keyframes rewardsFloat {
          0% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -14px, 0);
          }

          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes rewardsShine {
          0%,
          55% {
            opacity: 0;
            transform: translateX(-60%);
          }

          70% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: translateX(60%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rewards-float-wrap,
          .rewards-float-card::before {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
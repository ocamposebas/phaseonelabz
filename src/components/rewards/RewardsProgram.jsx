import { memo } from "react";
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

const StepCard = memo(function StepCard({ step, index }) {
  return (
    <article className="reward-step group relative rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3.5 transition-colors duration-200 hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]">
      <div className="flex gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.055] text-[9px] font-black text-cyan-100">
          {String(index + 1).padStart(2, "0")}
        </div>

        <div>
          <h4 className="text-sm font-semibold tracking-[-0.02em] text-white">
            {step.label}
          </h4>

          <p className="mt-1 text-sm leading-5 text-slate-400">{step.text}</p>
        </div>
      </div>
    </article>
  );
});

export default function RewardsProgram() {
  return (
    <section className="rewards-section relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16">
      <div className="rewards-bg" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10">
          <div className="mb-4 inline-flex items-center justify-center gap-3 md:justify-start">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.55)]" />

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

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          <div className="reward-main-card relative min-h-[390px] overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#05111d] p-5 sm:p-6 lg:p-7">
            <div className="reward-card-bg" aria-hidden="true" />

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
                  <Sparkles size={22} aria-hidden="true" />
                </div>
              </div>

              <div className="relative mt-6 flex flex-1 items-center justify-center">
                <div className="reward-card-orb" aria-hidden="true" />

                <div className="relative w-full max-w-[330px]">
                  <div className="rewards-float-card relative rotate-[-2deg] overflow-hidden rounded-[1.7rem] border border-cyan-200/15 bg-[linear-gradient(145deg,rgba(236,254,255,0.11),rgba(255,255,255,0.035),rgba(103,232,249,0.08))] p-4 transition-transform duration-200 hover:rotate-0 hover:scale-[1.01]">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
                          <CreditCard size={18} aria-hidden="true" />
                        </div>

                        <span className="rounded-full border border-cyan-200/15 bg-[#020617]/55 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100">
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

          <div className="grid gap-5">
            <div className="reward-side-card relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.018] p-6 sm:p-7 lg:p-8">
              <div className="reward-side-glow" aria-hidden="true" />

              <div className="relative z-10">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.06] text-cyan-200">
                  <UserRoundCheck size={22} aria-hidden="true" />
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
                    className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan-200/20 bg-cyan-300 px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 transition-colors duration-200 hover:border-cyan-100/35 hover:bg-cyan-200"
                  >
                    Create account
                    <ArrowRight
                      size={15}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </a>

                  <a
                    href="/account"
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/12 bg-white/[0.025] px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/75 transition-colors duration-200 hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white"
                  >
                    View portal
                  </a>
                </div>
              </div>
            </div>

            <div className="reward-timeline relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#07111d]/80 p-5 sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent"
              />

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
                  <Clock3 size={13} aria-hidden="true" />
                  Before checkout
                </div>
              </div>

              <div className="relative grid gap-2.5">
                {steps.map((step, index) => (
                  <StepCard key={step.label} step={step} index={index} />
                ))}
              </div>

              <div className="mt-4 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3.5">
                <BadgeCheck
                  size={17}
                  className="mt-0.5 shrink-0 text-cyan-200"
                  aria-hidden="true"
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
        .rewards-section {
          isolation: isolate;
        }

        .rewards-bg {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(circle at 50% 12%, rgba(103, 232, 249, 0.07), transparent 30%),
            radial-gradient(circle at 100% 92%, rgba(59, 130, 246, 0.075), transparent 32%);
        }

        .reward-main-card,
        .reward-side-card,
        .reward-timeline {
          transform: translate3d(0, 0, 0);
          contain: paint;
        }

        .reward-main-card {
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.2);
        }

        .reward-card-bg {
          pointer-events: none;
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 70% 20%, rgba(103, 232, 249, 0.13), transparent 34%),
            radial-gradient(circle at 25% 85%, rgba(59, 130, 246, 0.11), transparent 34%);
        }

        .reward-card-bg::after {
          content: "";
          position: absolute;
          inset-inline: 2rem;
          top: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(165, 243, 252, 0.3),
            transparent
          );
        }

        .reward-card-orb {
          pointer-events: none;
          position: absolute;
          height: 220px;
          width: 220px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(103, 232, 249, 0.1),
            transparent 68%
          );
        }

        .rewards-float-card {
          box-shadow: 0 22px 58px rgba(0, 0, 0, 0.28);
        }

        .reward-side-card {
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.14);
        }

        .reward-side-glow {
          pointer-events: none;
          position: absolute;
          right: -120px;
          top: -120px;
          height: 280px;
          width: 280px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(103, 232, 249, 0.09),
            transparent 68%
          );
        }

        .reward-step {
          content-visibility: auto;
          contain-intrinsic-size: 74px;
        }

        @media (max-width: 768px) {
          .rewards-bg {
            background:
              radial-gradient(circle at 50% 10%, rgba(103, 232, 249, 0.045), transparent 32%),
              radial-gradient(circle at 100% 92%, rgba(59, 130, 246, 0.055), transparent 34%);
          }

          .reward-main-card {
            min-height: auto;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
          }

          .reward-side-card {
            box-shadow: 0 12px 34px rgba(0, 0, 0, 0.12);
          }

          .reward-step {
            content-visibility: visible;
            contain-intrinsic-size: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rewards-section *,
          .rewards-section *::before,
          .rewards-section *::after {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
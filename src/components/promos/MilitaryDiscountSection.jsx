import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CopyCheck,
  ShieldCheck,
  Sparkles,
  TicketPercent,
} from "lucide-react";

const VERIFYPASS_URL = "https://verifypass.com/auth/b08f6507d1";

function openVerifyPass() {
  if (typeof window === "undefined") return;

  window.open(
    VERIFYPASS_URL,
    "VerifyPass",
    "width=475,height=700,noopener,noreferrer"
  );
}

const steps = [
  {
    icon: BadgeCheck,
    label: "Step 01",
    title: "Verify status",
    text: "Complete secure military or veteran verification through VerifyPass.",
  },
  {
    icon: CopyCheck,
    label: "Step 02",
    title: "Receive code",
    text: "After approval, VerifyPass generates a unique discount code.",
  },
  {
    icon: CheckCircle2,
    label: "Step 03",
    title: "Apply checkout",
    text: "Use your code before completing your Phase One Labz order.",
  },
];

const stars = Array.from({ length: 42 });

export default function MilitaryDiscountSection() {
  return (
    <section className="relative overflow-hidden bg-[#020617] px-5 py-14 text-white sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="relative mx-auto max-w-6xl">
        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-[1.7rem] border border-cyan-200/12 bg-[#0d1c2b]/88 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:rounded-[2.1rem]">
          {/* USA FLAG BACKGROUND */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 -top-24 h-[520px] w-[760px] rotate-[-10deg] opacity-[0.28] sm:-right-28 sm:h-[600px] sm:w-[900px] lg:-right-20 lg:-top-32">
              {/* Stripes */}
              <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(239,68,68,0.95)_0px,rgba(239,68,68,0.95)_28px,rgba(255,255,255,0.85)_28px,rgba(255,255,255,0.85)_56px)]" />

              {/* Blue canton */}
              <div className="absolute left-0 top-0 h-[300px] w-[360px] bg-[#1e3a8a]/95">
                <div className="grid grid-cols-7 gap-x-5 gap-y-4 p-7 text-[12px] text-white/80">
                  {stars.map((_, index) => (
                    <span key={index} className="leading-none">
                      ✦
                    </span>
                  ))}
                </div>
              </div>

              {/* Soft shine */}
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22),transparent_32%,rgba(103,232,249,0.16)_70%,transparent)]" />
            </div>

            {/* Dark readability overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.82)_44%,rgba(2,6,23,0.54)_100%)]" />

            {/* Bottom depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(59,130,246,0.20),transparent_38%),radial-gradient(circle_at_90%_78%,rgba(239,68,68,0.12),transparent_34%)]" />
          </div>

          {/* Radial SOLO dentro del banner */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.14),transparent_36%),radial-gradient(circle_at_100%_20%,rgba(59,130,246,0.10),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018),rgba(103,232,249,0.035))]" />

          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />

          <div className="relative z-10 grid gap-7 p-5 sm:p-7 lg:grid-cols-[1fr_320px] lg:items-center lg:gap-9 lg:p-10 xl:p-12">
            {/* LEFT */}
            <div className="text-center lg:text-left">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[1.2rem] border border-cyan-200/14 bg-cyan-300/[0.08] text-cyan-200 shadow-[0_18px_45px_rgba(34,211,238,0.08)] sm:h-16 sm:w-16 lg:mx-0">
                <ShieldCheck size={26} />
              </div>

              <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200/14 bg-cyan-300/[0.08] px-3.5 py-2 shadow-[0_12px_35px_rgba(0,0,0,0.18)] sm:px-4">
                <Sparkles size={13} className="shrink-0 text-cyan-200" />
                <span className="truncate text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/80 sm:text-[10px] sm:tracking-[0.22em]">
                  Military & Veteran Discount
                </span>
              </div>

              <h1 className="mx-auto max-w-4xl text-[38px] font-semibold leading-[0.92] tracking-[-0.07em] text-white sm:text-[60px] lg:mx-0 lg:text-[74px] xl:text-[80px]">
                Thank you for
                <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
                  your service.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-[13px] leading-7 text-slate-300/78 sm:text-[15px] sm:leading-8 lg:mx-0">
                Eligible active duty, veterans, reservists, and military members
                can verify securely with VerifyPass and receive a unique
                discount code for checkout.
              </p>

              <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={openVerifyPass}
                  className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-cyan-300 px-7 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-white sm:text-[11px]"
                >
                  Get Discount
                  <ArrowRight
                    size={16}
                    className="transition duration-300 group-hover:translate-x-1"
                  />
                </button>

                <a
                  href="/shop"
                  className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-cyan-200/18 bg-white/[0.035] px-6 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50 transition duration-300 hover:border-cyan-200/35 hover:bg-cyan-300/[0.08]"
                >
                  Shop Catalog
                </a>
              </div>

              <p className="mx-auto mt-4 max-w-lg text-[11px] leading-5 text-slate-400/70 lg:mx-0">
                A secure VerifyPass window will open. Please allow popups if
                your browser blocks it.
              </p>
            </div>

            {/* RIGHT CARD */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-[1.45rem] border border-cyan-200/12 bg-[#102133]/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-[1.7rem] sm:p-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(103,232,249,0.10),transparent_38%)]" />

                <div className="relative z-10">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-200/58">
                        Verified offer
                      </p>

                      <p className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.065em] text-white sm:text-[36px]">
                        Military
                      </p>

                      <p className="mt-1 text-sm font-semibold text-cyan-100/75">
                        discount access
                      </p>
                    </div>

                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.08] text-cyan-200 sm:h-12 sm:w-12">
                      <TicketPercent size={21} />
                    </div>
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-cyan-200/20 via-cyan-200/8 to-transparent" />

                  <div className="mt-5 grid gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-200/12 bg-white/[0.035] px-4 py-3">
                      <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Verification
                      </span>
                      <span className="text-xs font-semibold text-cyan-50">
                        VerifyPass
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-200/12 bg-white/[0.035] px-4 py-3">
                      <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Coupon
                      </span>
                      <span className="text-xs font-semibold text-cyan-50">
                        Unique code
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-200/12 bg-white/[0.035] px-4 py-3">
                      <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Checkout
                      </span>
                      <span className="text-xs font-semibold text-cyan-50">
                        Apply code
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.065] p-4">
                    <p className="text-xs leading-6 text-slate-300/80">
                      Verify once, receive your unique code, and apply it at
                      checkout before completing your order.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEPS */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="group rounded-[1.25rem] border border-cyan-200/12 bg-[#0d1c2b]/88 p-4 text-center shadow-[0_14px_45px_rgba(0,0,0,0.12)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/24 hover:bg-[#102133]/92 sm:rounded-[1.35rem] sm:p-5"
              >
                <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.07] text-cyan-200 transition group-hover:bg-cyan-300/[0.1]">
                  <Icon size={18} />
                </div>

                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                  {step.label}
                </p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {step.title}
                </p>

                <p className="mt-2 text-[13px] leading-6 text-slate-300/72">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* NOTE */}
        <div className="mx-auto mt-5 max-w-3xl rounded-[1.25rem] border border-cyan-200/12 bg-[#0d1c2b]/88 p-4 text-center shadow-[0_14px_45px_rgba(0,0,0,0.1)] sm:rounded-[1.35rem]">
          <p className="text-xs leading-6 text-slate-400">
            Discount eligibility and verification approval are handled by
            VerifyPass. Discount terms may vary and may not combine with other
            promotions. Phase One Labz products are for research use only and
            are not for human or animal consumption.
          </p>
        </div>
      </div>
    </section>
  );
}
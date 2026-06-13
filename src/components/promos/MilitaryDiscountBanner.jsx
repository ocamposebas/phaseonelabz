    import { ArrowRight, BadgeCheck, ShieldCheck } from "lucide-react";

    export default function MilitaryDiscountBanner() {
    return (
        <section className="relative overflow-hidden px-6 py-8 text-white sm:py-10">
        <div className="relative mx-auto max-w-6xl">
            <a
            href="/military-discount"
            className="group relative grid overflow-hidden rounded-[1.6rem] border border-cyan-200/12 bg-[#071421]/86 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/28 hover:bg-[#0a1b2b]/90 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6"
            >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(103,232,249,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012),rgba(103,232,249,0.035))]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />

            <div className="relative z-10 mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.07] text-cyan-200 lg:mb-0">
                <ShieldCheck size={24} />
            </div>

            <div className="relative z-10">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/[0.06] px-3 py-1">
                <BadgeCheck size={13} className="text-cyan-200" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/75">
                    Military & Veteran Discount
                </span>
                </div>

                <h2 className="text-[26px] font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-[34px]">
                Verify your service and unlock a special discount.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                Active duty, veterans, and eligible military members can verify
                securely through VerifyPass to receive a unique WooCommerce coupon.
                </p>
            </div>

            <div className="relative z-10 mt-5 inline-flex min-h-[48px] items-center justify-center gap-3 rounded-full bg-cyan-300 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 transition group-hover:bg-white lg:mt-0">
                Learn more
                <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </div>
            </a>
        </div>
        </section>
    );
    }
import { memo } from "react";
import {
  FileCheck2,
  FlaskConical,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

const items = [
  {
    icon: FileCheck2,
    title: "Batch records",
    text: "COA references and batch documentation kept easy to find.",
  },
  {
    icon: FlaskConical,
    title: "Scientific catalog",
    text: "Structured product discovery for laboratory research only.",
  },
  {
    icon: PackageCheck,
    title: "Clean fulfillment",
    text: "A smoother flow for browsing, pack building, and order handling.",
  },
];

const TrustItem = memo(function TrustItem({ item, index }) {
  const Icon = item.icon;

  return (
    <article className="trust-item group relative overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition-colors duration-200 hover:border-cyan-200/20 hover:bg-cyan-300/[0.035] sm:p-5 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-8">
      <div className="relative flex items-start gap-4 lg:contents">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.045] text-cyan-200 transition-colors duration-200 group-hover:border-cyan-200/25 group-hover:bg-cyan-300/[0.08] lg:h-12 lg:w-12">
          <Icon size={19} className="lg:hidden" aria-hidden="true" />
          <Icon size={20} className="hidden lg:block" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 lg:mb-2 lg:block">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/45 lg:text-[10px] lg:tracking-[0.24em]">
              0{index + 1}
            </p>

            <span className="h-px flex-1 bg-cyan-200/10 lg:hidden" />
          </div>

          <h3 className="text-[16px] font-semibold tracking-[-0.025em] text-white lg:text-lg">
            {item.title}
          </h3>

          <p className="mt-1.5 max-w-xl text-[12.5px] leading-6 text-slate-400 lg:mt-2 lg:text-sm lg:leading-7">
            {item.text}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="hidden h-px w-14 bg-gradient-to-r from-cyan-300/35 to-transparent lg:block"
        />
      </div>
    </article>
  );
});

export default function TrustSection() {
  return (
    <section className="relative py-10 text-white sm:py-14 lg:py-16 xl:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="trust-shell relative overflow-hidden border-cyan-200/10 bg-transparent lg:rounded-[2rem] lg:border lg:bg-white/[0.018]">
          <div
            aria-hidden="true"
            className="trust-glow trust-glow-main hidden lg:block"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent lg:block"
          />

          <div className="relative grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-0">
            <div className="trust-editorial relative overflow-hidden rounded-[1.6rem] border border-cyan-200/10 bg-white/[0.018] p-5 text-center sm:p-7 lg:rounded-none lg:border-0 lg:border-r lg:border-cyan-200/10 lg:bg-transparent lg:p-10 lg:text-left">
              <div
                aria-hidden="true"
                className="trust-glow trust-glow-mobile lg:hidden"
              />

              <div className="relative">
                <div className="mb-4 inline-flex items-center justify-center gap-3 lg:mb-5 lg:justify-start">
                  <span className="h-px w-7 bg-cyan-300/70 lg:w-8" />

                  <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-200/65 lg:text-[10px] lg:tracking-[0.3em]">
                    Research Standard
                  </span>

                  <span className="h-px w-7 bg-cyan-300/70 lg:hidden" />
                </div>

                <h2 className="mx-auto max-w-[360px] text-[35px] font-semibold leading-[0.95] tracking-[-0.065em] text-white sm:max-w-xl sm:text-[40px] lg:mx-0 lg:text-[48px] lg:leading-[1.08] lg:tracking-[-0.045em]">
                  Built for clarity,
                  <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85">
                    not for claims.
                  </span>
                </h2>

                <p className="mx-auto mt-4 max-w-[350px] text-[13.5px] leading-7 text-slate-300/68 sm:max-w-lg sm:text-[15px] sm:leading-8 lg:mx-0">
                  A cleaner catalog experience focused on documentation, batch
                  visibility, and responsible scientific presentation.
                </p>

                <div className="mx-auto mt-5 max-w-[370px] rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left lg:mx-0 lg:mt-8 lg:max-w-none">
                  <div className="flex gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200 lg:h-auto lg:w-auto lg:border-0 lg:bg-transparent">
                      <ShieldCheck size={18} aria-hidden="true" />
                    </div>

                    <p className="text-[9.5px] font-bold uppercase leading-5 tracking-[0.11em] text-slate-400 sm:text-xs sm:leading-6 sm:tracking-[0.16em]">
                      Laboratory research use only. Not for human use, animal
                      use, diagnostic use, therapeutic use, or clinical
                      application.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:divide-y lg:divide-cyan-200/10 lg:gap-0">
              {items.map((item, index) => (
                <TrustItem key={item.title} item={item} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .trust-shell,
        .trust-editorial,
        .trust-item {
          transform: translate3d(0, 0, 0);
        }

        .trust-shell {
          contain: paint;
        }

        .trust-item {
          content-visibility: auto;
          contain-intrinsic-size: 150px;
        }

        .trust-glow {
          pointer-events: none;
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(103, 232, 249, 0.1),
            rgba(103, 232, 249, 0.035) 38%,
            transparent 70%
          );
        }

        .trust-glow-main {
          right: -120px;
          top: -120px;
          height: 320px;
          width: 320px;
        }

        .trust-glow-mobile {
          right: -90px;
          top: -90px;
          height: 220px;
          width: 220px;
        }

        @media (max-width: 768px) {
          .trust-item {
            content-visibility: visible;
            contain-intrinsic-size: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .trust-item,
          .trust-item * {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
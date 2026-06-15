import { memo, useEffect, useState } from "react";
import { ArrowRight, FileCheck2, PackageCheck, ShieldCheck } from "lucide-react";

const featureCards = [
  {
    icon: ShieldCheck,
    title: "Verified",
    text: "Quality-focused product presentation.",
  },
  {
    icon: FileCheck2,
    title: "COA Access",
    text: "Certificate flow that feels simple.",
  },
  {
    icon: PackageCheck,
    title: "Pack Ready",
    text: "Made for bundles and discovery.",
  },
];

const FeatureCard = memo(function FeatureCard({ item }) {
  const Icon = item.icon;

  return (
    <div className="hero-feature-card group relative overflow-hidden border border-cyan-200/14 bg-slate-950/30 p-5 text-center transition-colors duration-200 hover:border-cyan-200/30 hover:bg-slate-950/42">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.08]">
        <Icon size={18} className="text-cyan-200" aria-hidden="true" />
      </div>

      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-white">
        {item.title}
      </p>

      <p className="mx-auto mt-2 max-w-[210px] text-xs leading-5 text-slate-100/80">
        {item.text}
      </p>
    </div>
  );
});

export default function Hero({
  videoSrc = "/prueba.mp4",
  posterSrc = "",
}) {
  const [canPlayVideo, setCanPlayVideo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

    const saveData =
      navigator.connection?.saveData ||
      navigator.mozConnection?.saveData ||
      navigator.webkitConnection?.saveData;

    if (reducedMotion || saveData) {
      setCanPlayVideo(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setCanPlayVideo(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="hero-section relative isolate min-h-screen overflow-hidden bg-[#020617] text-white">
      {canPlayVideo ? (
        <video
          className="hero-bg-video absolute inset-0 z-0 h-full w-full object-cover"
          src={videoSrc}
          poster={posterSrc || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          aria-hidden="true"
        />
      ) : (
        <div className="hero-video-fallback absolute inset-0 z-0" />
      )}

      <div className="hero-overlay absolute inset-0 z-10" aria-hidden="true" />

      <div className="hero-inner relative z-20 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-5 pb-14 pt-[136px] text-center sm:px-6 lg:px-8 lg:pb-16 lg:pt-[144px]">
        <div className="hero-content w-full">
          <div className="hero-eyebrow mb-5 inline-flex items-center justify-center gap-3 rounded-full border border-cyan-200/18 bg-slate-950/30 px-4 py-2">
            <span className="h-px w-8 bg-cyan-300/70 sm:w-10" />

            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-100 sm:text-[10px] sm:tracking-[0.34em]">
              Research Use Only
            </span>

            <span className="h-px w-8 bg-cyan-300/70 sm:w-10" />
          </div>

          <h1 className="hero-title mx-auto max-w-[1040px] text-center text-[46px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:text-[66px] lg:text-[88px] lg:leading-[0.88]">
            <span className="block">Research compounds,</span>
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
              presented with clarity.
            </span>
          </h1>

          <p className="hero-copy mx-auto mt-5 max-w-[700px] text-center text-[14px] leading-7 text-slate-100/90 sm:text-base sm:leading-8">
            A refined catalog experience for research-focused products, built
            around clean browsing, batch transparency, COA access, and a more
            confident buying flow.
          </p>

          <div className="hero-actions mt-7 flex w-full max-w-[430px] flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
            <a
              href="/shop"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-cyan-300 px-7 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 transition-colors duration-200 hover:bg-cyan-200"
            >
              Shop Catalog
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>

            <a
              href="/coa"
              className="inline-flex items-center justify-center rounded-full border border-cyan-200/25 bg-slate-950/30 px-7 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 transition-colors duration-200 hover:border-cyan-200/50 hover:bg-cyan-300/[0.08]"
            >
              Check COA
            </a>
          </div>

          <div className="hero-feature-row mx-auto mt-10 grid w-full max-w-[920px] grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-12">
            {featureCards.map((item) => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .hero-section {
          min-height: 100vh;
          min-height: 100svh;
          background: #020617;
          isolation: isolate;
        }

        .hero-bg-video {
          width: 100%;
          height: 100%;
          min-width: 100%;
          min-height: 100%;
          object-fit: cover;
          object-position: center;
          transform: translate3d(0, 0, 0) scale(1.01);
          contain: paint;
        }

        .hero-video-fallback {
          background:
            radial-gradient(circle at 50% 18%, rgba(103, 232, 249, 0.14), transparent 32%),
            radial-gradient(circle at 20% 90%, rgba(59, 130, 246, 0.12), transparent 36%),
            linear-gradient(180deg, #020617, #03111f 46%, #020617);
        }

        .hero-overlay {
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(2,6,23,0.68), rgba(2,6,23,0.24) 19%, rgba(2,6,23,0.34) 44%, rgba(2,6,23,0.72) 78%, rgba(2,6,23,0.96)),
            radial-gradient(circle at 50% 38%, rgba(2,6,23,0.06), rgba(2,6,23,0.28) 62%, rgba(2,6,23,0.72));
        }

        .hero-inner {
          min-height: 100vh;
          min-height: 100svh;
        }

        .hero-content {
          transform: translate3d(0, 24px, 0);
        }

        .hero-eyebrow,
        .hero-actions a,
        .hero-feature-card {
          transform: translate3d(0, 0, 0);
        }

        .hero-feature-card {
          border-radius: 24px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.045),
            0 16px 42px rgba(0,0,0,0.16);
          contain: paint;
        }

        .hero-feature-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 0%, rgba(103,232,249,0.1), transparent 46%),
            linear-gradient(180deg, rgba(255,255,255,0.03), transparent);
          opacity: 0;
          transition: opacity 200ms ease;
        }

        .hero-feature-card:hover::before {
          opacity: 1;
        }

        @media (min-width: 1024px) {
          .hero-content {
            transform: translate3d(0, 34px, 0);
          }
        }

        @media (max-width: 768px) {
          .hero-bg-video {
            transform: translate3d(0, 0, 0) scale(1.02);
          }

          .hero-inner {
            min-height: 100vh !important;
            min-height: 100svh !important;
            padding-top: 112px !important;
            padding-bottom: 32px !important;
          }

          .hero-content {
            transform: translate3d(0, 14px, 0);
          }

          .hero-title {
            width: 100% !important;
            max-width: calc(100vw - 30px) !important;
            font-size: clamp(39px, 11vw, 58px) !important;
            line-height: 0.94 !important;
            letter-spacing: -0.075em !important;
          }

          .hero-copy {
            max-width: 350px !important;
            margin-top: 18px !important;
            font-size: 13px !important;
            line-height: 1.72 !important;
          }

          .hero-actions {
            max-width: 345px !important;
            flex-direction: row !important;
            gap: 10px !important;
            margin-top: 26px !important;
          }

          .hero-actions a {
            flex: 1 1 0;
            min-width: 0;
            min-height: 46px;
            padding: 0 13px !important;
            font-size: 8px !important;
            letter-spacing: 0.11em !important;
            white-space: nowrap;
          }

          .hero-feature-row {
            max-width: 350px !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-top: 28px !important;
          }

          .hero-feature-card {
            border-radius: 18px !important;
            padding: 13px 7px !important;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.035),
              0 10px 24px rgba(0,0,0,0.12);
          }

          .hero-feature-card:hover {
            background: rgba(15, 23, 42, 0.3);
            border-color: rgba(165, 243, 252, 0.14);
          }

          .hero-feature-card::before {
            display: none;
          }

          .hero-feature-card div {
            width: 34px !important;
            height: 34px !important;
            border-radius: 14px !important;
          }

          .hero-feature-card p:first-of-type {
            margin-top: 10px !important;
            font-size: 8px !important;
            line-height: 1 !important;
            letter-spacing: 0.1em !important;
          }

          .hero-feature-card p:last-of-type {
            margin-top: 7px !important;
            font-size: 8.4px !important;
            line-height: 1.35 !important;
          }
        }

        @media (max-width: 420px) {
          .hero-inner {
            padding-top: 108px !important;
            padding-bottom: 28px !important;
          }

          .hero-content {
            transform: translate3d(0, 8px, 0);
          }

          .hero-title {
            font-size: clamp(34px, 10vw, 42px) !important;
            letter-spacing: -0.07em !important;
          }

          .hero-copy {
            max-width: 324px !important;
            margin-top: 16px !important;
            font-size: 12.7px !important;
          }

          .hero-actions {
            max-width: 322px !important;
            gap: 8px !important;
            margin-top: 24px !important;
          }

          .hero-actions a {
            min-height: 44px;
            padding-inline: 10px !important;
            font-size: 7.4px !important;
          }

          .hero-feature-row {
            max-width: 326px !important;
            gap: 7px !important;
            margin-top: 26px !important;
          }

          .hero-feature-card {
            min-height: 116px;
          }
        }

        @media (max-width: 360px) {
          .hero-content {
            transform: translate3d(0, 4px, 0);
          }

          .hero-title {
            font-size: 31px !important;
          }

          .hero-copy {
            max-width: 296px !important;
          }

          .hero-actions {
            max-width: 300px !important;
          }

          .hero-actions a {
            font-size: 7px !important;
          }

          .hero-feature-card {
            min-height: 108px;
            padding-inline: 5px !important;
          }

          .hero-feature-card p:last-of-type {
            font-size: 8px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-section *,
          .hero-section *::before,
          .hero-section *::after {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
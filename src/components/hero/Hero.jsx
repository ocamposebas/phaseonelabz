import { memo, useEffect, useState } from "react";
import {
  ArrowRight,
  FileCheck2,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

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
    <div className="hero-feature-card group relative overflow-hidden border border-cyan-200/15 bg-slate-950/30 p-5 text-center transition-colors duration-200 hover:border-cyan-200/30 hover:bg-slate-950/40">
      <div className="hero-feature-icon mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08]">
        <Icon size={18} className="text-cyan-200" aria-hidden="true" />
      </div>

      <p className="hero-feature-title mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-white">
        {item.title}
      </p>

      <p className="hero-feature-copy mx-auto mt-2 max-w-[210px] text-xs leading-5 text-slate-100/80">
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
          <div className="hero-eyebrow mb-5 inline-flex items-center justify-center gap-3 rounded-full border border-cyan-200/20 bg-slate-950/35 px-4 py-2">
            <span className="h-px w-8 bg-cyan-300/70 sm:w-10" />
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-100 sm:text-[10px] sm:tracking-[0.34em]">
              Research Use Only
            </span>
            <span className="h-px w-8 bg-cyan-300/70 sm:w-10" />
          </div>

          <h1 className="hero-title mx-auto max-w-[1040px] text-center font-semibold text-white">
            <span className="hero-title-desktop">
              <span className="block">Research compounds,</span>
              <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
                presented with clarity.
              </span>
            </span>

            <span className="hero-title-mobile">
              <span className="hero-title-line">Research compounds,</span>
              <span className="hero-title-line hero-title-accent">
                presented with clarity.
              </span>
            </span>
          </h1>

          <p className="hero-copy mx-auto mt-5 max-w-[700px] text-center text-[14px] leading-7 text-slate-100/90 sm:text-base sm:leading-8">
            <span className="hero-copy-desktop">
              A refined catalog experience for research-focused products, built
              around clean browsing, batch transparency, COA access, and a more
              confident buying flow.
            </span>
            <span className="hero-copy-mobile">
              <span>Clear batch details, direct COA access,</span>
              <span>and a cleaner research catalog.</span>
            </span>
          </p>

          <div className="hero-actions mt-7 flex w-full max-w-[430px] flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
            <a
              href="/shop"
              className="hero-primary-cta group inline-flex items-center justify-center gap-3 rounded-full bg-cyan-300 px-7 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-950 transition-colors duration-200 hover:bg-cyan-200"
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
              className="hero-secondary-cta inline-flex items-center justify-center rounded-full border border-cyan-200/25 bg-slate-950/35 px-7 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 transition-colors duration-200 hover:border-cyan-200/50 hover:bg-cyan-300/[0.08]"
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

        .hero-title {
          font-size: 46px;
          line-height: 0.92;
          letter-spacing: -0.075em;
        }

        .hero-title-mobile,
        .hero-copy-mobile {
          display: none;
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

        .hero-primary-cta {
          box-shadow: 0 10px 30px rgba(103, 232, 249, 0.18);
        }

        .hero-primary-cta,
        .hero-secondary-cta {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        @media (min-width: 640px) {
          .hero-title {
            font-size: 66px;
          }
        }

        @media (min-width: 1024px) {
          .hero-content {
            transform: translate3d(0, 34px, 0);
          }

          .hero-title {
            font-size: 88px;
            line-height: 0.88;
          }
        }

        @media (max-width: 768px) {
          .hero-section,
          .hero-inner {
            min-height: 100svh !important;
          }

          .hero-bg-video {
            object-position: 50% 38%;
            transform: translate3d(0, 0, 0) scale(1.025);
            filter: saturate(0.82) contrast(1.04);
          }

          .hero-overlay {
            background:
              linear-gradient(
                180deg,
                rgba(2, 6, 23, 0.94) 0%,
                rgba(2, 6, 23, 0.73) 24%,
                rgba(2, 6, 23, 0.58) 52%,
                rgba(2, 6, 23, 0.82) 78%,
                rgba(2, 6, 23, 0.99) 100%
              ),
              radial-gradient(
                circle at 50% 34%,
                rgba(34, 211, 238, 0.08),
                rgba(2, 6, 23, 0.2) 48%,
                rgba(2, 6, 23, 0.74) 100%
              );
          }

          .hero-inner {
            justify-content: center !important;
            padding-top: calc(96px + env(safe-area-inset-top)) !important;
            padding-right: 12px !important;
            padding-bottom: calc(66px + env(safe-area-inset-bottom)) !important;
            padding-left: 12px !important;
          }

          .hero-content {
            width: 100% !important;
            max-width: 400px !important;
            margin-inline: auto !important;
            transform: none !important;
          }

          .hero-eyebrow {
            display: none !important;
          }

          .hero-title {
            width: 100% !important;
            max-width: none !important;
            margin-inline: auto !important;
            font-size: clamp(31px, 9.6vw, 41px) !important;
            line-height: 1.04 !important;
            letter-spacing: -0.035em !important;
          }

          .hero-title-desktop {
            display: none !important;
          }

          .hero-title-mobile {
            display: grid !important;
            justify-items: center;
            gap: 1px;
          }

          .hero-title-line {
            display: block;
            white-space: nowrap;
          }

          .hero-title-accent {
            background: linear-gradient(90deg, #cffafe, #67e8f9 52%, #ffffff);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .hero-copy {
            width: 100% !important;
            max-width: 372px !important;
            margin-top: 16px !important;
            font-size: 14px !important;
            line-height: 1.58 !important;
            color: rgba(241, 245, 249, 0.92) !important;
          }

          .hero-copy-desktop {
            display: none !important;
          }

          .hero-copy-mobile {
            display: grid !important;
            justify-items: center;
          }

          .hero-copy-mobile > span {
            display: block;
            white-space: nowrap;
          }

          .hero-actions {
            width: 100% !important;
            max-width: 344px !important;
            margin: 25px auto 0 !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 11px !important;
          }

          .hero-primary-cta {
            width: 100% !important;
            min-height: 58px !important;
            padding: 0 22px !important;
            border: 1px solid rgba(207, 250, 254, 0.62);
            font-size: 13px !important;
            font-weight: 900 !important;
            letter-spacing: 0.08em !important;
            color: #082f49 !important;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.5),
              0 14px 30px rgba(34, 211, 238, 0.16);
          }

          .hero-primary-cta svg {
            width: 18px;
            height: 18px;
          }

          .hero-secondary-cta {
            width: auto !important;
            min-height: 40px !important;
            padding: 8px 16px !important;
            border: 0 !important;
            border-radius: 999px !important;
            background: transparent !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            letter-spacing: 0.12em !important;
            color: rgba(226, 232, 240, 0.92) !important;
            box-shadow: none !important;
          }

          .hero-feature-row {
            width: 100% !important;
            max-width: 344px !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0 !important;
            margin-top: 23px !important;
            padding-top: 20px !important;
            border-top: 1px solid rgba(165, 243, 252, 0.14);
          }

          .hero-feature-card {
            position: relative;
            display: flex !important;
            min-width: 0;
            min-height: 0 !important;
            flex-direction: column;
            align-items: center;
            gap: 9px;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            padding: 0 10px !important;
            box-shadow: none !important;
            contain: none !important;
          }

          .hero-feature-card:not(:last-child)::after {
            content: "";
            position: absolute;
            top: 4px;
            right: 0;
            width: 1px;
            height: 52px;
            background: rgba(165, 243, 252, 0.1);
          }

          .hero-feature-card::before {
            display: none !important;
          }

          .hero-feature-icon {
            width: 38px !important;
            height: 38px !important;
            margin: 0 !important;
            border-radius: 12px !important;
            background: rgba(34, 211, 238, 0.08) !important;
          }

          .hero-feature-icon svg {
            width: 17px;
            height: 17px;
          }

          .hero-feature-title {
            margin: 0 !important;
            font-size: 9.8px !important;
            line-height: 1.15 !important;
            letter-spacing: 0.08em !important;
            white-space: nowrap;
          }

          .hero-feature-copy {
            display: none !important;
          }
        }

        @media (max-width: 390px) {
          .hero-inner {
            padding-top: calc(92px + env(safe-area-inset-top)) !important;
            padding-right: 16px !important;
            padding-bottom: calc(58px + env(safe-area-inset-bottom)) !important;
            padding-left: 16px !important;
          }

          .hero-title {
            max-width: none !important;
            font-size: clamp(30px, 9vw, 37px) !important;
          }

          .hero-copy {
            max-width: none !important;
            font-size: 13px !important;
          }

          .hero-actions,
          .hero-feature-row {
            max-width: 336px !important;
          }
        }

        @media (max-width: 340px) {
          .hero-title {
            max-width: none !important;
            font-size: 28px !important;
          }

          .hero-copy {
            max-width: none !important;
            font-size: 12px !important;
          }

          .hero-actions,
          .hero-feature-row {
            max-width: 304px !important;
          }

          .hero-feature-card {
            padding-inline: 5px !important;
          }

          .hero-feature-title {
            font-size: 8.7px !important;
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
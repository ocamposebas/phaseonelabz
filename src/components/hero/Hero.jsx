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
              <span>Batch transparency and direct COA access.</span>
              <span>Built for a cleaner research flow.</span>
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
              className="hero-secondary-cta group inline-flex items-center justify-center gap-2.5 rounded-full border border-cyan-200/25 bg-slate-950/35 px-7 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 transition-colors duration-200 hover:border-cyan-200/50 hover:bg-cyan-300/[0.08]"
            >
              <FileCheck2 size={16} aria-hidden="true" />
              Check COA
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
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
          -webkit-transform: translate3d(0, 0, 0) scale(1.01);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform, opacity;
        }

        .hero-video-fallback {
          background:
            radial-gradient(circle at 50% 18%, rgba(103, 232, 249, 0.14), transparent 32%),
            radial-gradient(circle at 20% 90%, rgba(59, 130, 246, 0.12), transparent 36%),
            linear-gradient(180deg, #020617, #03111f 46%, #020617);
        }

        .hero-overlay {
          pointer-events: none;
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform;
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
            min-height: 100vh !important;
            min-height: 100svh !important;
            min-height: 100dvh !important;
          }

          .hero-bg-video {
            object-position: 50% 42%;
            transform: translate3d(0, 0, 0) scale(1.015);
            -webkit-transform: translate3d(0, 0, 0) scale(1.015);
            opacity: 0.68;
            filter: none;
          }

          .hero-overlay {
            background:
              linear-gradient(
                180deg,
                rgba(2, 6, 23, 0.82) 0%,
                rgba(2, 6, 23, 0.32) 25%,
                rgba(2, 6, 23, 0.15) 48%,
                rgba(2, 6, 23, 0.69) 77%,
                rgba(2, 6, 23, 0.955) 100%
              ),
              radial-gradient(
                ellipse at 50% 47%,
                rgba(34, 211, 238, 0.07),
                rgba(2, 6, 23, 0.1) 38%,
                rgba(2, 6, 23, 0.7) 100%
              );
          }

          .hero-inner {
            justify-content: center !important;
            box-sizing: border-box;
            padding-top: calc(112px + env(safe-area-inset-top)) !important;
            padding-right: max(16px, env(safe-area-inset-right)) !important;
            padding-bottom: calc(30px + env(safe-area-inset-bottom)) !important;
            padding-left: max(16px, env(safe-area-inset-left)) !important;
          }

          .hero-content {
            width: min(100%, 420px) !important;
            max-width: 420px !important;
            margin-inline: auto !important;
            box-sizing: border-box;
            transform: translate3d(0, 8px, 0) !important;
          }

          .hero-eyebrow {
            display: inline-flex !important;
            margin: 0 auto 15px !important;
            gap: 8px !important;
            padding: 7px 13px !important;
            border: 1px solid rgba(165, 243, 252, 0.24) !important;
            border-radius: 999px !important;
            background: rgba(2, 6, 23, 0.62) !important;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.05),
              0 10px 26px rgba(0, 0, 0, 0.16);
          }

          .hero-eyebrow > span:first-child,
          .hero-eyebrow > span:last-child {
            width: 14px !important;
          }

          .hero-eyebrow > span:nth-child(2) {
            font-size: 8.5px !important;
            letter-spacing: 0.2em !important;
          }

          .hero-title {
            width: 100% !important;
            max-width: 390px !important;
            margin-inline: auto !important;
            font-size: clamp(27px, 8.6vw, 40px) !important;
            line-height: 0.97 !important;
            letter-spacing: -0.055em !important;
            text-align: center !important;
            text-wrap: balance;
            text-shadow: 0 12px 38px rgba(0,0,0,0.42);
          }

          .hero-title-desktop {
            display: none !important;
          }

          .hero-title-mobile {
            display: flex !important;
            width: 100%;
            flex-direction: column;
            align-items: center;
            gap: 2px;
          }

          .hero-title-line {
            display: block;
            max-width: 100%;
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
            max-width: 310px !important;
            margin-top: 14px !important;
            font-size: 12px !important;
            line-height: 1.55 !important;
            color: rgba(241, 245, 249, 0.78) !important;
            text-shadow: 0 5px 18px rgba(0,0,0,0.48);
          }

          .hero-copy-desktop {
            display: none !important;
          }

          .hero-copy-mobile {
            display: grid !important;
            justify-items: center;
            gap: 0;
          }

          .hero-copy-mobile > span {
            display: block;
          }

          .hero-actions {
            display: grid !important;
            width: 100% !important;
            max-width: 350px !important;
            grid-template-columns: minmax(0, 1.25fr) minmax(116px, 0.85fr) !important;
            margin: 20px auto 0 !important;
            gap: 9px !important;
          }

          .hero-primary-cta {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            padding: 0 14px !important;
            border: 1px solid rgba(207, 250, 254, 0.62);
            font-size: 10px !important;
            font-weight: 900 !important;
            letter-spacing: 0.09em !important;
            color: #082f49 !important;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.5),
              0 15px 32px rgba(34, 211, 238, 0.2);
          }

          .hero-primary-cta svg {
            width: 14px;
            height: 14px;
          }

          .hero-secondary-cta {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            gap: 7px !important;
            padding: 0 10px !important;
            border: 1px solid rgba(165, 243, 252, 0.3) !important;
            border-radius: 999px !important;
            background:
              linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.88)) !important;
            font-size: 8.7px !important;
            font-weight: 900 !important;
            letter-spacing: 0.075em !important;
            color: rgba(240, 249, 255, 0.98) !important;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              0 12px 28px rgba(0, 0, 0, 0.2) !important;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          .hero-secondary-cta svg {
            width: 14px;
            height: 14px;
            flex: 0 0 auto;
            color: #a5f3fc;
          }

          .hero-feature-row {
            width: 100% !important;
            max-width: 350px !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0 !important;
            margin-top: 18px !important;
            overflow: hidden;
            padding: 7px 5px !important;
            border: 1px solid rgba(165, 243, 252, 0.12) !important;
            border-radius: 20px !important;
            background: rgba(2, 6, 23, 0.58) !important;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.045),
              0 18px 38px rgba(0,0,0,0.18);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          .hero-primary-cta,
          .hero-secondary-cta {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .hero-feature-card {
            position: relative;
            display: flex !important;
            min-width: 0;
            min-height: 0 !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 7px;
            overflow: hidden !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            padding: 8px 4px !important;
            box-shadow: none !important;
            contain: paint !important;
          }

          .hero-feature-card:not(:last-child)::after {
            content: "";
            position: absolute;
            top: 13%;
            right: 0;
            display: block !important;
            width: 1px;
            height: 74%;
            background: rgba(165, 243, 252, 0.12);
          }

          .hero-feature-card::before {
            display: none !important;
          }

          .hero-feature-icon {
            width: 32px !important;
            height: 32px !important;
            margin: 0 !important;
            border-radius: 11px !important;
            background: rgba(34, 211, 238, 0.08) !important;
          }

          .hero-feature-icon svg {
            width: 17px;
            height: 17px;
          }

          .hero-feature-title {
            margin: 0 !important;
            font-size: 8.5px !important;
            line-height: 1.2 !important;
            letter-spacing: 0.07em !important;
            white-space: nowrap;
          }

          .hero-feature-copy {
            display: none !important;
          }
        }

        @media (max-width: 390px) {
          .hero-inner {
            padding-top: calc(106px + env(safe-area-inset-top)) !important;
            padding-right: max(14px, env(safe-area-inset-right)) !important;
            padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important;
            padding-left: max(14px, env(safe-area-inset-left)) !important;
          }

          .hero-title {
            max-width: 362px !important;
            font-size: clamp(27px, 8.5vw, 34px) !important;
          }

          .hero-copy {
            max-width: 292px !important;
            font-size: 11.3px !important;
          }

          .hero-primary-cta,
          .hero-secondary-cta {
            min-height: 46px !important;
          }
        }

        @media (max-width: 340px) {
          .hero-title {
            max-width: 100% !important;
            font-size: clamp(25.5px, 8.2vw, 28px) !important;
            letter-spacing: -0.06em !important;
          }

          .hero-copy {
            max-width: 272px !important;
            font-size: 10.8px !important;
          }

          .hero-actions {
            grid-template-columns: minmax(0, 1.18fr) minmax(110px, 0.82fr) !important;
          }

          .hero-primary-cta {
            padding-inline: 10px !important;
          }

          .hero-secondary-cta {
            padding-inline: 7px !important;
          }

          .hero-feature-title {
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

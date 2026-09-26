import "./Hero.styles.css";
import { memo, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileCheck2,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import PromoCountdownBar from "../promos/PromoCountdownBar.jsx";

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
    <div className="hero-feature-card group relative overflow-hidden border border-cyan-200/15 bg-slate-950/30 p-5 text-left transition-colors duration-200 hover:border-cyan-200/30 hover:bg-slate-950/40">
      <div className="hero-feature-icon flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08]">
        <Icon size={18} className="text-cyan-200" aria-hidden="true" />
      </div>

      <p className="hero-feature-title mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-white">
        {item.title}
      </p>

      <p className="hero-feature-copy mt-2 max-w-[210px] text-xs leading-5 text-slate-100/80">
        {item.text}
      </p>
    </div>
  );
});

export default function Hero({
  videoSrc = "/prueba.mp4",
  mobileVideoSrc = "/movil.mp4",
  posterSrc = "/cover.webp",
  promo = null,
  promoNow = 0,
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoAttempt, setVideoAttempt] = useState(0);
  const videoRef = useRef(null);
  const videoRetryCountRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (videoFailed || !video) return undefined;

    let isVisible = true;
    const attemptPlayback = () => {
      if (document.hidden || !isVisible) {
        video.pause();
        return;
      }

      if (video.paused) {
        video.play().catch(() => {});
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = Boolean(entry?.isIntersecting);
        attemptPlayback();
      },
      { threshold: 0.05 },
    );

    observer.observe(video);
    video.addEventListener("loadeddata", attemptPlayback);
    video.addEventListener("canplay", attemptPlayback);
    document.addEventListener("visibilitychange", attemptPlayback);
    document.addEventListener("pointerdown", attemptPlayback, {
      passive: true,
    });
    window.addEventListener("focus", attemptPlayback);
    window.addEventListener("pageshow", attemptPlayback);

    const retryTimers = [250, 1000, 2500].map((delay) =>
      window.setTimeout(attemptPlayback, delay),
    );

    return () => {
      observer.disconnect();
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      video.removeEventListener("loadeddata", attemptPlayback);
      video.removeEventListener("canplay", attemptPlayback);
      document.removeEventListener("visibilitychange", attemptPlayback);
      document.removeEventListener("pointerdown", attemptPlayback);
      window.removeEventListener("focus", attemptPlayback);
      window.removeEventListener("pageshow", attemptPlayback);
      video.pause();
    };
  }, [videoAttempt, videoFailed]);

  useEffect(() => {
    videoRetryCountRef.current = 0;
    setVideoAttempt(0);
    setVideoFailed(false);
  }, [mobileVideoSrc, videoSrc]);

  const fallbackSrc = posterSrc || "/cover.webp";
  const showVideo = !videoFailed;
  const handleVideoError = () => {
    if (videoRetryCountRef.current < 1) {
      videoRetryCountRef.current += 1;
      setVideoAttempt((current) => current + 1);
      return;
    }

    setVideoFailed(true);
  };

  return (
    <section className="hero-section relative isolate min-h-screen overflow-hidden bg-[#020617] text-white">
      {showVideo ? (
        <video
          key={`${mobileVideoSrc}|${videoSrc}|${videoAttempt}`}
          ref={videoRef}
          className="hero-bg-video absolute inset-0 z-0 h-full w-full object-cover"
          onError={handleVideoError}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={fallbackSrc}
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          aria-hidden="true"
        >
          <source
            src={mobileVideoSrc}
            type="video/mp4"
            media="(max-width: 768px)"
          />
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : (
        <div className="hero-video-fallback absolute inset-0 z-0">
          <img
            className="hero-fallback-image h-full w-full object-cover"
            src={fallbackSrc}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
            aria-hidden="true"
          />
        </div>
      )}

      <div className="hero-overlay absolute inset-0 z-10" aria-hidden="true" />

      <PromoCountdownBar promo={promo} initialNow={promoNow} />

      <div className="hero-inner relative z-20 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start justify-center px-5 pb-14 pt-[136px] text-left sm:px-6 lg:px-8 lg:pb-16 lg:pt-[144px]">
        <div className="hero-content w-full">
          <h1 className="hero-title max-w-[1040px] text-left font-semibold text-white">
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

          <p className="hero-copy mt-5 max-w-[700px] text-left text-[14px] leading-7 text-slate-100/90 sm:text-base sm:leading-8">
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

          <div className="hero-actions mt-7 flex w-full max-w-[430px] flex-col justify-start gap-3 sm:max-w-none sm:flex-row">
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

          <div className="hero-feature-row mt-10 grid w-full max-w-[920px] grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-12">
            {featureCards.map((item) => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

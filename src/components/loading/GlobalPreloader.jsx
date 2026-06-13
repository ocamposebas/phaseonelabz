import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./global-preloader.css";

export default function GlobalPreloader({
  logoSrc = "/TRANSPARENCIA-03.webp",
  minDuration = 1150,
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add("phase-preloader-lock");
    document.body.classList.add("phase-preloader-lock");

    let mounted = true;

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 96) return current;
        return current + Math.random() * 9;
      });
    }, 95);

    const finish = () => {
      setProgress(100);

      window.setTimeout(() => {
        if (!mounted) return;

        setVisible(false);
        document.documentElement.classList.remove("phase-preloader-lock");
        document.body.classList.remove("phase-preloader-lock");
      }, 450);
    };

    const minTimer = window.setTimeout(() => {
      if (document.readyState === "complete") {
        finish();
      } else {
        window.addEventListener("load", finish, { once: true });
      }
    }, minDuration);

    return () => {
      mounted = false;
      window.clearInterval(progressTimer);
      window.clearTimeout(minTimer);
      window.removeEventListener("load", finish);

      document.documentElement.classList.remove("phase-preloader-lock");
      document.body.classList.remove("phase-preloader-lock");
    };
  }, [minDuration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="phase-preloader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            y: -10,
            transition: {
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1],
            },
          }}
        >
          <div className="phase-preloader__background" />
          <div className="phase-preloader__line phase-preloader__line--top" />
          <div className="phase-preloader__line phase-preloader__line--bottom" />

          <motion.div
            className="phase-preloader__content"
            initial={{ opacity: 0, y: 18 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.75,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
          >
            <motion.div
              className="phase-preloader__logoBlock"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                },
              }}
            >
              <img
                src={logoSrc}
                alt="Phase One Labz"
                className="phase-preloader__logo"
              />
            </motion.div>

            <motion.div
              className="phase-preloader__brand"
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  delay: 0.16,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                },
              }}
            >
              <p>Phase One Labz</p>
              <span>Research Catalog</span>
            </motion.div>

            <motion.div
              className="phase-preloader__progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  delay: 0.26,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                },
              }}
            >
              <div className="phase-preloader__bar">
                <motion.div
                  className="phase-preloader__barFill"
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </div>

              <div className="phase-preloader__meta">
                <span>Syncing availability</span>
                <span>{Math.min(Math.round(progress), 100)}%</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
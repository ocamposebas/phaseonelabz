import { useEffect, useState } from "react";

export function getPromoRemaining(endsAt) {
  const end = new Date(endsAt || 0).getTime();
  const totalSeconds = Number.isFinite(end)
    ? Math.max(0, Math.floor((end - Date.now()) / 1000))
    : 0;

  return {
    totalSeconds,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function useSiteControlPromo(initialPromo) {
  const [promo, setPromo] = useState(initialPromo || {});

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch(`/api/site-control?ts=${Date.now()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = await response.json();

        if (active && response.ok && data?.promo) setPromo(data.promo);
      } catch {
        // Keep the latest valid promotion state when Site Controls is unavailable.
      }
    };

    const interval = window.setInterval(refresh, 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return promo;
}

export function usePromoRemaining(enabled, endsAt) {
  const [remaining, setRemaining] = useState(() => getPromoRemaining(endsAt));

  useEffect(() => {
    if (!enabled || !endsAt) {
      setRemaining(getPromoRemaining(0));
      return undefined;
    }

    const update = () => setRemaining(getPromoRemaining(endsAt));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, endsAt]);

  return remaining;
}

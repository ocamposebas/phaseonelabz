const SIMPLE_GIFTS_TYPE = "simple_gifts";
const VALID_REWARD_MODES = new Set(["fixed", "choose_one"]);

function cleanText(value, maximum = 180) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function cleanProductName(value) {
  return cleanText(value, 140)
    .replace(
      /\s*(?:[—–-]\s*)?(?:(?:USD|CAD|EUR|GBP)\s*)?[$€£]\s*\d[\d,.]*\s*$/i,
      "",
    )
    .replace(/\s*[—–|:?\-]\s*$/, "")
    .trim();
}

function normalizeReward(reward) {
  if (!reward || typeof reward !== "object") return null;

  const mode = cleanText(reward.mode, 30).toLowerCase();
  if (!VALID_REWARD_MODES.has(mode) || !Array.isArray(reward.options)) return null;

  const seen = new Set();
  const options = reward.options.reduce((normalized, option) => {
    const name = cleanProductName(
      typeof option === "string" ? option : option?.name,
    );
    const key = name.toLocaleLowerCase();

    if (!name || seen.has(key)) return normalized;
    seen.add(key);
    normalized.push({ name });
    return normalized;
  }, []);

  return options.length > 0 ? { mode, options } : null;
}

function normalizeTier(tier, index) {
  if (!tier || typeof tier !== "object" || !Array.isArray(tier.rewards)) {
    return null;
  }

  const threshold = Number(tier.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0) return null;

  const rewards = tier.rewards.map(normalizeReward).filter(Boolean);
  if (rewards.length === 0) return null;

  return {
    key: `${threshold}-${index}`,
    threshold,
    rewards,
  };
}

export function normalizeSimpleGiftPromotion(promo) {
  if (!promo || typeof promo !== "object") return null;
  if (promo.enabled !== true || promo.type !== SIMPLE_GIFTS_TYPE) return null;

  const normalizedSource =
    promo.simpleGifts && typeof promo.simpleGifts === "object"
      ? promo.simpleGifts
      : null;
  const rule =
    normalizedSource || (promo.rule && typeof promo.rule === "object" ? promo.rule : null);

  if (!rule || !Array.isArray(rule.tiers)) return null;

  const tiers = rule.tiers
    .map(normalizeTier)
    .filter(Boolean)
    .sort((left, right) => left.threshold - right.threshold);

  if (tiers.length === 0) return null;

  const currency = cleanText(rule.currency || promo.currency, 3).toUpperCase();

  return {
    type: SIMPLE_GIFTS_TYPE,
    sitewideLabel: cleanText(
      rule.sitewideLabel || rule.sitewide_label,
      80,
    ),
    eyebrow: cleanText(normalizedSource?.eyebrow || promo.eyebrow, 80),
    title:
      cleanText(normalizedSource?.title || promo.title, 120) ||
      "Spend more. Unlock more.",
    info: cleanText(normalizedSource?.info || promo.info, 240),
    endsAt:
      normalizedSource?.endsAt || promo.endsAt || promo.ends_at || null,
    ctaLabel: cleanText(
      normalizedSource?.ctaLabel || promo.ctaLabel || promo.cta_label,
      60,
    ),
    ctaUrl: cleanText(
      normalizedSource?.ctaUrl || promo.ctaUrl || promo.cta_url,
      500,
    ),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
    tiers,
  };
}

export function formatGiftThreshold(threshold, currency = "USD") {
  const value = Number(threshold);
  if (!Number.isFinite(value)) return "";

  try {
    return `${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)}+`;
  } catch {
    return `$${value.toLocaleString("en-US")}+`;
  }
}

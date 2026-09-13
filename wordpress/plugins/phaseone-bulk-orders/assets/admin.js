document.addEventListener("DOMContentLoaded", () => {
  const updatePricingVisibility = (rule) => {
    const mode = rule.querySelector("[data-pricing-mode]")?.value || "fixed";
    const discount = rule.querySelector("[data-discount-wrap]");
    const bundle = rule.querySelector("[data-bundle-price-wrap]");
    const tiers = rule.querySelector("[data-tier-prices]");
    if (discount) discount.hidden = mode !== "discount";
    if (bundle) bundle.hidden = mode !== "fixed";
    if (tiers) tiers.hidden = mode !== "tiered";
  };

  document.querySelectorAll("[data-rule]").forEach((rule) => {
    updatePricingVisibility(rule);
    rule.querySelector("[data-pricing-mode]")?.addEventListener("change", () =>
      updatePricingVisibility(rule),
    );
  });

  document.querySelectorAll("[data-confirm]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!window.confirm(link.dataset.confirm || "Continue?")) event.preventDefault();
    });
  });

  const sessionPreset = document.querySelector("[data-session-preset]");
  const sessionDays = document.querySelector("[data-session-days]");
  if (sessionPreset && sessionDays) {
    const syncSessionDays = () => {
      const custom = sessionPreset.value === "custom";
      sessionDays.readOnly = !custom;
      if (!custom) sessionDays.value = sessionPreset.value;
    };
    sessionPreset.addEventListener("change", syncSessionDays);
    syncSessionDays();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const updatePricingVisibility = (rule) => {
    const mode = rule.querySelector("[data-pricing-mode]")?.value || "fixed";
    const fixed = rule.querySelector("[data-fixed-price]");
    const tiers = rule.querySelector("[data-tier-prices]");
    if (fixed) fixed.hidden = mode !== "fixed";
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
});

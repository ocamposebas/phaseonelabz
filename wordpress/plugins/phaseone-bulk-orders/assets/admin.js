document.addEventListener("DOMContentLoaded", () => {
  const updatePricingVisibility = (rule) => {
    const mode = rule.querySelector("[data-pricing-mode]")?.value || "fixed";
    const bundle = rule.querySelector("[data-bundle-price-wrap]");
    const preview = rule.querySelector("[data-unit-preview]");
    const tiers = rule.querySelector("[data-tier-prices]");
    if (bundle) bundle.hidden = mode !== "fixed";
    if (preview) preview.hidden = mode !== "fixed";
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

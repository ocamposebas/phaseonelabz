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

  const updateRuleStatus = (rule) => {
    const badge = rule.querySelector("[data-rule-status]");
    if (!badge) return;
    const catalog =
      rule.querySelector("[data-catalog-override], select[name$='[catalog_override]']")
        ?.value || "inherit";
    const availability =
      rule.querySelector(
        "[data-availability-override], select[name$='[availability_override]']",
      )?.value || "inherit";
    let status = "inherited";
    let label = "Inherited";
    if (catalog === "exclude") {
      status = "hidden";
      label = "Hidden";
    } else if (availability === "unavailable") {
      status = "unavailable";
      label = "Unavailable";
    } else if (availability === "available") {
      status = "available";
      label = "Available";
    }
    badge.className = `phaseone-bulk-rule-status is-${status}`;
    badge.textContent = label;
  };

  document.querySelectorAll("[data-rule]").forEach((rule) => {
    updatePricingVisibility(rule);
    updateRuleStatus(rule);
    rule.querySelector("[data-pricing-mode]")?.addEventListener("change", () =>
      updatePricingVisibility(rule),
    );
    rule
      .querySelector("[data-catalog-override], select[name$='[catalog_override]']")
      ?.addEventListener("change", () => updateRuleStatus(rule));
    rule
      .querySelector(
        "[data-availability-override], select[name$='[availability_override]']",
      )
      ?.addEventListener("change", () => updateRuleStatus(rule));
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

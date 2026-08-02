export const STATUS_INCIDENT_HISTORY = [];

export const STATUS_MAINTENANCE_HISTORY = [];

export const MONTHLY_MAINTENANCE = {
  id: "monthly-platform-review",
  title: "Monthly platform maintenance",
  summary:
    "Routine updates, recovery checks and end-to-end validation for the commerce platform.",
  cadence: "First Sunday of every month",
  affectedComponents: [
    "website",
    "wordpress",
    "catalog",
    "checkout",
    "accounts",
    "orders",
    "coa",
    "restocks",
    "agreements",
    "communications",
    "affiliates",
    "automations",
  ],
  checklist: [
    "WordPress, WooCommerce and plugin updates",
    "Storefront dependencies and production build",
    "Backup integrity and restoration readiness",
    "Checkout, inventory and order-flow validation",
    "Login, password reset, rewards and store credit",
    "COA, restock, agreement and email workflows",
    "Scheduled jobs, TLS, logs and performance review",
  ],
};

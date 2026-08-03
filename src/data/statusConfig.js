export const STATUS_INCIDENT_HISTORY = [];

export const STATUS_MAINTENANCE_HISTORY = [];

const MONTHLY_MAINTENANCE_TASK_ROTATIONS = [
  [
    "Apply verified WordPress, WooCommerce and extension updates",
    "Validate backups and restoration readiness",
    "Reconcile catalog inventory and test checkout stock limits",
    "Review security logs, scheduled jobs and TLS certificates",
  ],
  [
    "Update storefront dependencies and verify the production build",
    "Audit current and archived COA mappings",
    "Test account access, password recovery, rewards and store credit",
    "Verify email, restock and signed-agreement delivery workflows",
  ],
  [
    "Review database health, caching and storefront performance",
    "Validate payment gateway, coupon and affiliate readiness",
    "Test shipping, tracking and inventory synchronization",
  ],
  [
    "Apply verified platform security and compatibility updates",
    "Review third-party storefront and notification integrations",
    "Run mobile, accessibility and critical-page smoke tests",
    "Verify monitoring alerts and incident recovery procedures",
  ],
];

export function getMonthlyMaintenanceTasks(scheduledFor) {
  const date = new Date(scheduledFor);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const periodIndex =
    safeDate.getUTCFullYear() * 12 + safeDate.getUTCMonth();
  const rotation =
    MONTHLY_MAINTENANCE_TASK_ROTATIONS[
      periodIndex % MONTHLY_MAINTENANCE_TASK_ROTATIONS.length
    ];
  const period = `${safeDate.getUTCFullYear()}-${String(
    safeDate.getUTCMonth() + 1,
  ).padStart(2, "0")}`;

  return rotation.map((title, index) => ({
    id: `planned-${period}-${index + 1}`,
    title,
    kind: "planned",
    status: "scheduled",
  }));
}

export const MONTHLY_MAINTENANCE = {
  id: "monthly-platform-review",
  title: "Monthly platform maintenance",
  summary:
    "Routine updates, recovery checks and end-to-end validation for the commerce platform.",
  cadence: "Day 25 of every month",
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

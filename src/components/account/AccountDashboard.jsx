import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Gift,
  LayoutDashboard,
  Loader2,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
  CircleDollarSign,
  Truck,
  Handshake,
} from "lucide-react";

const POINTS_PER_REWARD = 500;
const CREDIT_PER_REWARD = 5;

const dashboardTabs = [
  { id: "overview", label: "Overview", shortLabel: "Home", icon: LayoutDashboard },
  { id: "personal", label: "Personal Info", shortLabel: "Info", icon: User },
  { id: "rewards", label: "Rewards", shortLabel: "Rewards", icon: Gift },
  { id: "orders", label: "Orders", shortLabel: "Orders", icon: ReceiptText },
  { id: "affiliate", label: "Affiliate", shortLabel: "Affiliate", icon: Handshake },
];

const moneyFormatters = new Map();
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const redemptionDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function getMoneyFormatter(currency = "USD", decimals = 0) {
  const key = `${currency}:${decimals}`;

  if (!moneyFormatters.has(key)) {
    moneyFormatters.set(
      key,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    );
  }

  return moneyFormatters.get(key);
}

function formatMoney(value, currency = "USD") {
  return getMoneyFormatter(currency, 0).format(Number(value || 0));
}

function parseDashboardDate(dateString) {
  if (!dateString) return null;

  const date = new Date(String(dateString).replace(" ", "T"));

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(dateString) {
  const date = parseDashboardDate(dateString);

  return date ? dateFormatter.format(date) : dateString || "Pending date";
}

function formatRedemptionDate(dateString) {
  const date = parseDashboardDate(dateString);

  return date
    ? redemptionDateFormatter.format(date)
    : dateString || "Pending date";
}

function normalizeStatus(status) {
  if (!status) return "Pending";

  return String(status)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTrackingStatus(order = {}) {
  const status = String(order.status_key || order.status || "").toLowerCase();

  const hasTracking =
    Boolean(order.tracking_number) ||
    (Array.isArray(order.tracking_items) && order.tracking_items.length > 0);

  if (hasTracking && !["failed", "cancelled", "refunded"].includes(status)) {
    return {
      label: "Shipped",
      description: "Tracking is available for this order.",
      tone: "success",
    };
  }

  if (status === "on-hold") {
    return {
      label: "Payment review",
      description: "Waiting for manual payment verification.",
      tone: "warning",
    };
  }

  if (status === "processing") {
    return {
      label: "Processing",
      description: "Payment confirmed. Your order is being prepared.",
      tone: "info",
    };
  }

  if (status === "completed") {
    return {
      label: "Completed",
      description: "This order has been completed.",
      tone: "success",
    };
  }

  if (status === "failed") {
    return {
      label: "Failed",
      description: "This order failed. Contact support if needed.",
      tone: "danger",
    };
  }

  return {
    label: normalizeStatus(status || "pending"),
    description: "Order status is being updated.",
    tone: "default",
  };
}

function getPrimaryTracking(order = {}) {
  const trackingItems = Array.isArray(order.tracking_items)
    ? order.tracking_items
    : [];

  if (trackingItems.length > 0) {
    return trackingItems[0];
  }

  if (order.tracking_number) {
    return {
      carrier: order.tracking_carrier || "",
      tracking_number: order.tracking_number,
      tracking_url: order.tracking_url || "",
      shipped_date: order.shipped_date || "",
    };
  }

  return null;
}

function saveAuthToken(token) {
  if (!token || typeof window === "undefined") return;

  localStorage.setItem("lab_auth_token", token);

  document.cookie = `lab_auth_token=${encodeURIComponent(
    token
  )}; path=/; max-age=2592000; SameSite=Lax`;
}

function clearAuthToken() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("lab_auth_token");

  document.cookie =
    "lab_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";

  return localStorage.getItem("lab_auth_token") || "";
}

function getRewardCreditStats(points) {
  const safePoints = Math.max(Number(points || 0), 0);
  const unlockedBlocks = Math.floor(safePoints / POINTS_PER_REWARD);
  const unlockedCredit = unlockedBlocks * CREDIT_PER_REWARD;
  const currentProgressPoints = safePoints % POINTS_PER_REWARD;
  const pointsToNextReward =
    currentProgressPoints === 0 && safePoints > 0
      ? 0
      : POINTS_PER_REWARD - currentProgressPoints;

  const progressPercent = Math.min(
    (currentProgressPoints / POINTS_PER_REWARD) * 100,
    100
  );

  return {
    unlockedBlocks,
    unlockedCredit,
    currentProgressPoints,
    pointsToNextReward,
    progressPercent,
    nextCredit: CREDIT_PER_REWARD,
  };
}


function DashboardMenu({ activeTab, setActiveTab }) {
  return (
    <div className="mb-5 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/38 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:mb-6 sm:rounded-[1.7rem]">
      <div className="account-tabs-scroll flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
        {dashboardTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-[1.1rem] border px-4 text-[9px] font-black uppercase tracking-[0.14em] transition sm:min-h-[54px] sm:w-full sm:rounded-[1.25rem] sm:text-[10px] sm:tracking-[0.16em] ${
                isActive
                  ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100 shadow-[0_0_28px_rgba(103,232,249,0.08)]"
                  : "border-transparent bg-white/[0.012] text-slate-500 hover:border-cyan-200/12 hover:bg-cyan-300/[0.035] hover:text-cyan-100"
              }`}
            >
              <Icon
                size={15}
                className={`transition ${
                  isActive
                    ? "text-cyan-100"
                    : "text-slate-500 group-hover:text-cyan-100"
                }`}
              />
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[1.7rem] border border-cyan-200/10 bg-white/[0.02] p-5 backdrop-blur-xl sm:rounded-[2rem] sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, right }) {
  return (
    <div className="mb-5 flex flex-col gap-3 text-center sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:text-left">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/60 sm:text-[10px] sm:tracking-[0.28em]">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl">
          {title}
        </h2>
      </div>

      {description ? (
        <p className="mx-auto max-w-md text-[13px] leading-6 text-slate-500 sm:mx-0 sm:text-right sm:text-sm">
          {description}
        </p>
      ) : (
        right
      )}
    </div>
  );
}

function MiniStat({ label, value, accent = false }) {
  return (
    <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3 sm:p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-semibold tracking-[-0.04em] sm:text-2xl ${
          accent ? "text-cyan-100" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function WaysToEarnCard({ icon: Icon, title, description }) {
  return (
    <div className="rounded-[1.25rem] border border-cyan-200/10 bg-[#020617]/45 p-4 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025] sm:rounded-2xl">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200 sm:h-11 sm:w-11">
        <Icon size={18} className="sm:hidden" />
        <Icon size={19} className="hidden sm:block" />
      </div>

      <p className="text-[14px] font-semibold tracking-[-0.02em] text-white sm:text-sm">
        {title}
      </p>

      <p className="mt-2 text-[13px] leading-6 text-slate-400 sm:text-sm">
        {description}
      </p>
    </div>
  );
}

function RedemptionHistoryCard({ redemptions = [] }) {
  const hasRedemptions = redemptions.length > 0;

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Redemption History"
        title="Store credit activity"
        description="Track points converted into store balance."
      />

      {!hasRedemptions ? (
        <div className="rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/45 p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200">
            <ReceiptText size={20} />
          </div>

          <p className="mt-4 text-base font-semibold text-white">
            No redemptions yet
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Once you transfer points into store credit, your redemption activity
            will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {redemptions.map((redemption, index) => {
            const points = Number(redemption?.points || 0);
            const credit = Number(redemption?.credit || 0);
            const status = redemption?.status || "completed";

            return (
              <article
                key={redemption?.id || `${redemption?.created_at}-${index}`}
                className="grid gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025] sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-white">
                      {points.toLocaleString("en-US")} points redeemed
                    </p>

                    <span className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.075] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/80">
                      {normalizeStatus(status)}
                    </span>
                  </div>

                  <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 size={14} />
                    {formatRedemptionDate(redemption?.created_at)}
                  </p>

                  {redemption?.note && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {redemption.note}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-cyan-200/10 pt-4 sm:contents sm:border-t-0 sm:pt-0">
                  <div className="sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Converted
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      -{points.toLocaleString("en-US")} pts
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Store credit
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-100">
                      +{formatMoney(credit, redemption?.currency || "USD")}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function RewardCreditConverter({
  pointsBalance,
  storeCreditBalance,
  rewardStats,
  redeemBlocks,
  setRedeemBlocks,
  redeemStatus,
  redeemMessage,
  onRedeem,
}) {
  const canRedeem = rewardStats.unlockedBlocks > 0;
  const maxBlocks = Math.max(rewardStats.unlockedBlocks, 1);
  const selectedBlocks = Math.min(
    Math.max(Number(redeemBlocks || 1), 1),
    maxBlocks
  );

  const pointsToConvert = selectedBlocks * POINTS_PER_REWARD;
  const creditToUnlock = selectedBlocks * CREDIT_PER_REWARD;
  const pointsAfterConversion = Math.max(pointsBalance - pointsToConvert, 0);

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Store Credit"
        title="Convert points into balance"
        description="Every 500 points can be redeemed for $5 in store credit."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/45 p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/10 blur-[80px]" />

          <div className="relative z-10">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55">
                  Available to redeem
                </p>

                <p className="mt-2 text-[46px] font-semibold leading-none tracking-[-0.075em] text-white sm:text-[64px]">
                  {formatMoney(rewardStats.unlockedCredit)}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Based on{" "}
                  <span className="font-semibold text-cyan-100">
                    {rewardStats.unlockedBlocks}
                  </span>{" "}
                  unlocked reward block
                  {rewardStats.unlockedBlocks === 1 ? "" : "s"}.
                </p>
              </div>

              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100">
                <CircleDollarSign size={22} />
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Next reward progress
                </p>

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/75">
                  {rewardStats.currentProgressPoints}/{POINTS_PER_REWARD}
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-cyan-300 transition-all duration-500"
                  style={{ width: `${rewardStats.progressPercent}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-6 text-slate-400">
                {rewardStats.pointsToNextReward === 0 ? (
                  <>
                    You have unlocked another{" "}
                    <span className="font-semibold text-cyan-100">
                      {formatMoney(CREDIT_PER_REWARD)}
                    </span>{" "}
                    reward.
                  </>
                ) : (
                  <>
                    You need{" "}
                    <span className="font-semibold text-cyan-100">
                      {rewardStats.pointsToNextReward}
                    </span>{" "}
                    more point
                    {rewardStats.pointsToNextReward === 1 ? "" : "s"} to unlock{" "}
                    <span className="font-semibold text-cyan-100">
                      {formatMoney(CREDIT_PER_REWARD)}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.045] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/70">
                Store balance
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-100">
                {formatMoney(storeCreditBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/45 p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55">
            Transfer points
          </p>

          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">
            Redeem for store balance
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Choose how much of your unlocked reward balance you want to convert.
          </p>

          <div className="mt-5 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!canRedeem || selectedBlocks <= 1}
                onClick={() =>
                  setRedeemBlocks((current) => Math.max(Number(current) - 1, 1))
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/10 bg-white/[0.025] text-white transition hover:border-cyan-200/25 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Redeem less"
              >
                <Minus size={15} />
              </button>

              <div className="text-center">
                <p className="text-[38px] font-semibold leading-none tracking-[-0.06em] text-white">
                  {formatMoney(creditToUnlock)}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {pointsToConvert.toLocaleString("en-US")} points
                </p>
              </div>

              <button
                type="button"
                disabled={
                  !canRedeem || selectedBlocks >= rewardStats.unlockedBlocks
                }
                onClick={() =>
                  setRedeemBlocks((current) =>
                    Math.min(Number(current) + 1, rewardStats.unlockedBlocks)
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/10 bg-white/[0.025] text-white transition hover:border-cyan-200/25 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Redeem more"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-cyan-200/10 bg-[#020617]/55 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  After transfer
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {pointsAfterConversion.toLocaleString("en-US")} pts
                </p>
              </div>

              <div className="rounded-xl border border-cyan-200/10 bg-[#020617]/55 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Store balance
                </p>
                <p className="mt-1 text-sm font-semibold text-cyan-100">
                  +{formatMoney(creditToUnlock)}
                </p>
              </div>
            </div>
          </div>

          {redeemMessage && (
            <p
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                redeemStatus === "success"
                  ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-100"
                  : "border-red-400/15 bg-red-400/10 text-red-200"
              }`}
            >
              {redeemMessage}
            </p>
          )}

          <button
            type="button"
            disabled={!canRedeem || redeemStatus === "loading"}
            onClick={onRedeem}
            className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {redeemStatus === "loading" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Converting
              </>
            ) : (
              <>
                Transfer to store credit
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {!canRedeem && (
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              You need at least {POINTS_PER_REWARD} points to unlock store
              credit.
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}



function normalizeCouponCode(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 24);
}

function formatAffiliateMoney(value, currency = "USD") {
  return getMoneyFormatter(currency, 2).format(Number(value || 0));
}

function cleanAffiliateText(value = "") {
  let text = String(value || "");

  // Coupon Affiliates can return HTML entities once or double encoded
  // for example: &#36;5.00 or &amp;#36;5.00.
  for (let i = 0; i < 3; i += 1) {
    text = text
      .replace(/&amp;/g, "&")
      .replace(/&#36;/g, "$")
      .replace(/&#036;/g, "$")
      .replace(/&dollar;/g, "$")
      .replace(/&nbsp;/g, " ")
      .replace(/&#160;/g, " ");
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    text = textarea.value;
  }

  return text.replace(/\s+/g, " ").trim() || "—";
}

function AffiliateMetricCard({ label, value, description, wide = false }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#020617]/58 p-4 transition duration-300 hover:border-cyan-200/25 hover:bg-cyan-300/[0.035] sm:rounded-[1.55rem] sm:p-5 ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-300/0 blur-[60px] transition group-hover:bg-cyan-300/10" />

      <div className="relative z-10">
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/45 sm:text-[9px] sm:tracking-[0.22em]">
          {label}
        </p>

        <p className="mt-3 break-words text-[28px] font-semibold leading-none tracking-[-0.065em] text-white sm:text-[36px]">
          {value}
        </p>

        {description && (
          <p className="mt-3 text-xs leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function AffiliateStatsDashboard({
  application,
  stats,
  statsStatus,
  statsMessage,
  onRefreshStats,
}) {
  const primaryCoupon = stats?.primary_coupon || stats?.coupons?.[0] || {};
  const currency = primaryCoupon?.currency || "USD";
  const referralUrl = primaryCoupon?.referral_url || "";
  const couponCode =
    primaryCoupon?.coupon_code ||
    application?.approved_coupon ||
    application?.requested_coupon ||
    "Active";

  const commissionLabel = cleanAffiliateText(primaryCoupon?.commission_label || "—");
  const discountLabel = cleanAffiliateText(primaryCoupon?.discount_label || "No Discount");

  const getAffiliateMetric = (...keys) => {
    for (const key of keys) {
      if (primaryCoupon?.[key] !== undefined && primaryCoupon?.[key] !== null) {
        return primaryCoupon[key];
      }

      if (stats?.[key] !== undefined && stats?.[key] !== null) {
        return stats[key];
      }
    }

    return 0;
  };

  const referralClicks = Number(
    getAffiliateMetric(
      "referral_clicks",
      "link_clicks",
      "total_clicks",
      "clicks"
    ) || 0
  );

  const uniqueVisitors = Number(
    getAffiliateMetric(
      "unique_visitors",
      "unique_clicks",
      "unique_users",
      "visitors"
    ) || 0
  );

  const trackedConversions = Number(
    getAffiliateMetric(
      "tracked_conversions",
      "conversions",
      "conversion_count",
      "total_conversions",
      "total_usage"
    ) || 0
  );

  const trackedRevenue = Number(
    getAffiliateMetric(
      "tracked_revenue",
      "attributed_revenue",
      "conversion_revenue",
      "total_sales"
    ) || 0
  );

  const rawConversionRate = getAffiliateMetric(
    "conversion_rate",
    "tracked_conversion_rate"
  );

  const conversionRate = Number(rawConversionRate || 0)
    ? Number(rawConversionRate)
    : uniqueVisitors > 0
      ? (trackedConversions / uniqueVisitors) * 100
      : referralClicks > 0
        ? (trackedConversions / referralClicks) * 100
        : 0;

  const rawRevenuePerClick = getAffiliateMetric(
    "revenue_per_click",
    "rpc",
    "earnings_per_click"
  );

  const revenuePerClick = Number(rawRevenuePerClick || 0)
    ? Number(rawRevenuePerClick)
    : referralClicks > 0
      ? trackedRevenue / referralClicks
      : 0;

  const averageOrderValue =
    trackedConversions > 0 ? trackedRevenue / trackedConversions : 0;

  const copyReferralUrl = async () => {
    if (!referralUrl || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(referralUrl);
    } catch {
      // Clipboard can fail on non-secure local environments.
    }
  };

  return (
    <SectionCard className="relative overflow-hidden border-cyan-200/12 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.075),transparent_34%),linear-gradient(145deg,rgba(4,12,24,0.98),rgba(8,18,34,0.92))]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-[120px]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-blue-500/8 blur-[130px]" />

      <div className="relative z-10">
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/60">
              Affiliate Dashboard
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-[34px] font-semibold leading-none tracking-[-0.065em] text-white sm:text-[48px]">
                {couponCode}
              </h2>

              <span className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.08] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/85">
                Active
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Live coupon performance pulled from Coupon Affiliates.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshStats}
            disabled={statsStatus === "loading"}
            className="inline-flex min-h-[48px] items-center justify-center gap-3 rounded-2xl border border-cyan-200/12 bg-white/[0.035] px-5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.08] disabled:cursor-wait disabled:opacity-60"
          >
            {statsStatus === "loading" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                Refresh stats
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>

        {statsStatus === "loading" ? (
          <div className="flex items-center justify-center gap-3 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/55 py-10 text-cyan-100">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              Loading affiliate statistics
            </span>
          </div>
        ) : statsStatus === "error" ? (
          <div className="rounded-[1.45rem] border border-red-400/15 bg-red-400/10 p-5">
            <p className="text-sm font-semibold text-red-100">
              Statistics unavailable
            </p>
            <p className="mt-2 text-sm leading-6 text-red-100/75">
              {statsMessage ||
                "We could not load your affiliate statistics right now."}
            </p>

            <button
              type="button"
              onClick={onRefreshStats}
              className="mt-4 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-white"
            >
              Try again
              <ArrowRight size={13} />
            </button>
          </div>
        ) : !stats?.has_coupon ? (
          <div className="rounded-[1.45rem] border border-yellow-300/15 bg-yellow-300/[0.055] p-5">
            <p className="text-sm font-semibold text-yellow-100">
              Coupon is being prepared
            </p>
            <p className="mt-2 text-sm leading-6 text-yellow-100/75">
              Your application is approved, but no active Coupon Affiliates
              coupon was found for this account yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <AffiliateMetricCard
                label="Link Clicks"
                value={referralClicks.toLocaleString("en-US")}
                description="Total visits tracked from your affiliate link."
              />

              <AffiliateMetricCard
                label="Unique Visitors"
                value={uniqueVisitors.toLocaleString("en-US")}
                description="Estimated unique people who entered through your link."
              />

              <AffiliateMetricCard
                label="Conversions"
                value={trackedConversions.toLocaleString("en-US")}
                description="Orders attributed to this coupon or referral link."
              />

              <AffiliateMetricCard
                label="Conversion Rate"
                value={`${conversionRate.toFixed(2)}%`}
                description="Conversions divided by unique referral visitors."
              />

              <AffiliateMetricCard
                label="Tracked Revenue"
                value={formatAffiliateMoney(trackedRevenue, currency)}
                description="Revenue attributed by the affiliate tracking bridge."
              />

              <AffiliateMetricCard
                label="Revenue / Click"
                value={formatAffiliateMoney(revenuePerClick, currency)}
                description="Average tracked revenue generated per referral click."
              />

              <AffiliateMetricCard
                label="Avg Order Value"
                value={formatAffiliateMoney(averageOrderValue, currency)}
                description="Average tracked revenue per attributed conversion."
              />

              <AffiliateMetricCard
                label="Total Usage"
                value={Number(primaryCoupon?.total_usage || 0).toLocaleString(
                  "en-US"
                )}
                description="Total coupon uses from Coupon Affiliates."
              />

              <AffiliateMetricCard
                label="Discount"
                value={discountLabel}
                description="Current customer discount."
              />

              <AffiliateMetricCard
                label="Commission"
                value={commissionLabel}
                description="Current commission rate."
              />

              <AffiliateMetricCard
                label="Total Sales"
                value={formatAffiliateMoney(primaryCoupon?.total_sales, currency)}
                description="Sales after coupon discount."
              />

              <AffiliateMetricCard
                label="Total Discounts"
                value={formatAffiliateMoney(
                  primaryCoupon?.total_discounts,
                  currency
                )}
                description="Discounts given by your coupon."
              />

              <AffiliateMetricCard
                label="Total Commission"
                value={formatAffiliateMoney(
                  primaryCoupon?.total_commission,
                  currency
                )}
                description="Commission tracked by Coupon Affiliates."
              />

              <AffiliateMetricCard
                label="Unpaid Commission"
                value={formatAffiliateMoney(
                  primaryCoupon?.unpaid_commission,
                  currency
                )}
                description="Current unpaid commission balance."
              />

              <AffiliateMetricCard
                label="Pending Payouts"
                value={formatAffiliateMoney(
                  primaryCoupon?.pending_payouts,
                  currency
                )}
                description="Commission currently pending payout."
              />

              <AffiliateMetricCard
                label="Woo Usage Count"
                value={Number(
                  primaryCoupon?.woocommerce_usage_count || 0
                ).toLocaleString("en-US")}
                description="Raw WooCommerce coupon usage count."
              />
            </div>

            {referralUrl && (
              <div className="mt-4 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/55 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/55">
                      Referral URL
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-white/90">
                      {referralUrl}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyReferralUrl}
                    className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-white"
                  >
                    Copy link
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}


function AffiliateApplicationPanel({ account }) {
  const [affiliateStatus, setAffiliateStatus] = useState("idle");
  const [affiliateMessage, setAffiliateMessage] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("loading");
  const [application, setApplication] = useState(null);
  const [statsStatus, setStatsStatus] = useState("idle");
  const [statsMessage, setStatsMessage] = useState("");
  const [affiliateStats, setAffiliateStats] = useState(null);

  const [affiliateForm, setAffiliateForm] = useState({
    name: account?.name || "",
    email: account?.email || "",
    preferredCoupon: "",
    platform: "",
    socialHandle: "",
    audienceSize: "",
    promotionNotes: "",
    confirmAge: false,
    confirmResearchOnly: false,
    confirmNoMedicalClaims: false,
    confirmPaidAdsApproval: false,
  });

  const getAccountPayload = () => {
    const token = getSavedAuthToken();
    const accountEmail = String(account?.email || "").trim();

    return {
      token,
      body: {
        authToken: token,
        accountId: account?.id || account?.customer_id || account?.user_id || "",
        accountEmail,
        email: accountEmail,
      },
    };
  };

  const loadAffiliateApplicationStatus = async () => {
    try {
      const { token, body } = getAccountPayload();

      if (!body.accountEmail) {
        setApplication(null);
        setApplicationStatus("idle");
        return null;
      }

      setApplicationStatus("loading");
      setAffiliateMessage("");

      const response = await fetch("/api/affiliate/status.json", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const rawText = await response.text();
      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            rawText ||
            `Could not load affiliate status. HTTP ${response.status}`
        );
      }

      const statusData = data?.data || data || {};

      if (statusData?.has_application) {
        setApplication(statusData);
      } else {
        setApplication(null);
      }

      setApplicationStatus("loaded");
      return statusData;
    } catch (error) {
      setApplication(null);
      setApplicationStatus("error");
      setAffiliateMessage(
        error?.message || "We could not load your affiliate application status."
      );
      return null;
    }
  };

  const loadAffiliateStats = async () => {
    try {
      const { token, body } = getAccountPayload();

      if (!body.accountEmail) {
        setAffiliateStats(null);
        setStatsStatus("idle");
        return;
      }

      setStatsStatus("loading");
      setStatsMessage("");

      const response = await fetch("/api/affiliate/stats.json", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const rawText = await response.text();
      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            rawText ||
            `Could not load affiliate statistics. HTTP ${response.status}`
        );
      }

      const statsData = data?.data || data || {};
      setAffiliateStats(statsData);
      setStatsStatus("loaded");
    } catch (error) {
      setAffiliateStats(null);
      setStatsStatus("error");
      setStatsMessage(
        error?.message || "We could not load your affiliate statistics."
      );
    }
  };

  useEffect(() => {
    loadAffiliateApplicationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.email, account?.id, account?.customer_id, account?.user_id]);

  const applicationTone = String(application?.status || "").toLowerCase();
  const isPendingApplication = [
    "pending",
    "review",
    "in review",
    "submitted",
  ].includes(applicationTone);
  const isAcceptedApplication = ["accepted", "approved", "active"].includes(
    applicationTone
  );

  useEffect(() => {
    if (isAcceptedApplication) {
      loadAffiliateStats();
    } else {
      setAffiliateStats(null);
      setStatsStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAcceptedApplication, account?.email, account?.id, account?.customer_id, account?.user_id]);

  const updateAffiliateField = (key, value) => {
    setAffiliateMessage("");

    setAffiliateForm((current) => ({
      ...current,
      [key]: key === "preferredCoupon" ? normalizeCouponCode(value) : value,
    }));
  };

  const canSubmitAffiliate =
    affiliateForm.name &&
    affiliateForm.email &&
    affiliateForm.preferredCoupon &&
    affiliateForm.platform &&
    affiliateForm.socialHandle &&
    affiliateForm.audienceSize &&
    affiliateForm.promotionNotes &&
    affiliateForm.confirmAge &&
    affiliateForm.confirmResearchOnly &&
    affiliateForm.confirmNoMedicalClaims &&
    affiliateForm.confirmPaidAdsApproval;

  const submitAffiliateApplication = async () => {
    if (!canSubmitAffiliate) {
      setAffiliateStatus("error");
      setAffiliateMessage(
        "Please complete all required fields and confirmations."
      );
      return;
    }

    try {
      setAffiliateStatus("loading");
      setAffiliateMessage("");

      const token = getSavedAuthToken();

      const payload = {
        name: String(affiliateForm.name || "").trim(),
        email: String(affiliateForm.email || "").trim(),
        preferredCoupon: normalizeCouponCode(affiliateForm.preferredCoupon),
        platform: String(affiliateForm.platform || "").trim(),
        socialHandle: String(affiliateForm.socialHandle || "").trim(),
        audienceSize: String(affiliateForm.audienceSize || "").trim(),
        promotionNotes: String(affiliateForm.promotionNotes || "").trim(),
        confirmAge: Boolean(affiliateForm.confirmAge),
        confirmResearchOnly: Boolean(affiliateForm.confirmResearchOnly),
        confirmNoMedicalClaims: Boolean(affiliateForm.confirmNoMedicalClaims),
        confirmPaidAdsApproval: Boolean(affiliateForm.confirmPaidAdsApproval),
        authToken: token,
        accountId: account?.id || account?.customer_id || account?.user_id || "",
        accountEmail: account?.email || "",
      };

      const response = await fetch("/api/affiliate/apply.json", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            rawText ||
            `Affiliate application failed with status ${response.status}.`
        );
      }

      const result = data?.data || data || {};

      setApplication({
        has_application: true,
        status: result?.status || "pending",
        application_id: result?.application_id || "",
        user_id:
          result?.user_id || account?.id || account?.customer_id || account?.user_id || "",
        requested_coupon: result?.requested_coupon || payload.preferredCoupon,
        coupon_affiliates_registration_id:
          result?.coupon_affiliates_registration_id || "",
      });

      setApplicationStatus("loaded");
      setAffiliateStatus("success");
      setAffiliateMessage(
        data?.message ||
          "Your affiliate application was submitted successfully and is pending review."
      );
    } catch (error) {
      setAffiliateStatus("error");
      setAffiliateMessage(
        error?.message || "We could not submit your affiliate application."
      );
    }
  };

  const StatusCard = () => (
    <SectionCard>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/60 sm:text-[10px] sm:tracking-[0.28em]">
            Affiliate Status
          </p>

          <h3 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.055em] text-white sm:text-[38px]">
            Your application is pending review.
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Our team has received your affiliate application. You do not need to
            submit again. Once approved, your coupon will be activated
            automatically.
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-yellow-300/15 bg-yellow-300/[0.055] p-5">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.08] text-yellow-100">
            <Clock3 size={22} />
          </div>

          <div className="grid gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {normalizeStatus(application?.status || "pending")}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                Requested coupon
              </p>
              <p className="mt-1 text-sm font-semibold tracking-[0.08em] text-cyan-100">
                {application?.requested_coupon || "Pending"}
              </p>
            </div>

            {application?.coupon_affiliates_registration_id && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Registration ID
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  #{application.coupon_affiliates_registration_id}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={loadAffiliateApplicationStatus}
            disabled={applicationStatus === "loading"}
            className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/12 bg-white/[0.035] px-4 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.08] disabled:cursor-wait disabled:opacity-60"
          >
            {applicationStatus === "loading" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Checking
              </>
            ) : (
              <>
                Refresh status
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </SectionCard>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(4,12,24,0.96),rgba(8,38,56,0.66),rgba(4,12,24,0.96))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/12 blur-[110px]" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/70 sm:text-[10px] sm:tracking-[0.28em]">
              Affiliate Program
            </p>

            <h2 className="mt-3 text-[34px] font-semibold leading-[0.95] tracking-[-0.065em] text-white sm:text-[52px]">
              Apply for your
              <span className="block text-cyan-200/90">research coupon.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Submit your affiliate application from your customer dashboard.
              Once approved, your coupon will be activated automatically.
            </p>
          </div>

          <div className="rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/45 p-4">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200">
              <ShieldCheck size={19} />
            </div>

            <p className="text-sm font-semibold text-white">
              Research use only
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Products are not for human use. Affiliates may not make medical,
              therapeutic, dosing, or human-consumption claims.
            </p>
          </div>
        </div>
      </div>

      {applicationStatus === "loading" ? (
        <SectionCard>
          <div className="flex items-center justify-center gap-3 py-8 text-cyan-100">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              Checking affiliate status
            </span>
          </div>
        </SectionCard>
      ) : isAcceptedApplication ? (
        <AffiliateStatsDashboard
          application={application}
          stats={affiliateStats}
          statsStatus={statsStatus}
          statsMessage={statsMessage}
          onRefreshStats={loadAffiliateStats}
          applicationStatus={applicationStatus}
          onRefreshStatus={loadAffiliateApplicationStatus}
        />
      ) : application && isPendingApplication ? (
        <StatusCard />
      ) : (
        <SectionCard>
          <SectionHeading
            eyebrow="Application"
            title="Affiliate application"
            description="Your request will be reviewed before your coupon is activated."
          />

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitAffiliateApplication();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                  Full name
                </span>
                <input
                  value={affiliateForm.name}
                  onChange={(event) =>
                    updateAffiliateField("name", event.target.value)
                  }
                  className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="Full name"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                  Email
                </span>
                <input
                  type="email"
                  value={affiliateForm.email}
                  onChange={(event) =>
                    updateAffiliateField("email", event.target.value)
                  }
                  className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="email@example.com"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                  Preferred coupon code
                </span>
                <input
                  value={affiliateForm.preferredCoupon}
                  onChange={(event) =>
                    updateAffiliateField("preferredCoupon", event.target.value)
                  }
                  className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm font-semibold uppercase tracking-[0.08em] text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="PHASE10"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                  Main platform
                </span>
                <select
                  value={affiliateForm.platform}
                  onChange={(event) =>
                    updateAffiliateField("platform", event.target.value)
                  }
                  className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition focus:border-cyan-200/35"
                  required
                >
                  <option value="">Choose platform</option>
                  <option value="instagram" className="bg-[#020617]">
                    Instagram
                  </option>
                  <option value="tiktok" className="bg-[#020617]">
                    TikTok
                  </option>
                  <option value="youtube" className="bg-[#020617]">
                    YouTube
                  </option>
                  <option value="website" className="bg-[#020617]">
                    Website / Blog
                  </option>
                  <option value="email-list" className="bg-[#020617]">
                    Email list
                  </option>
                  <option value="other" className="bg-[#020617]">
                    Other
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                  Social handle or website
                </span>
                <input
                  value={affiliateForm.socialHandle}
                  onChange={(event) =>
                    updateAffiliateField("socialHandle", event.target.value)
                  }
                  className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                  placeholder="@username or https://..."
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                  Audience size
                </span>
                <select
                  value={affiliateForm.audienceSize}
                  onChange={(event) =>
                    updateAffiliateField("audienceSize", event.target.value)
                  }
                  className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition focus:border-cyan-200/35"
                  required
                >
                  <option value="">Choose audience size</option>
                  <option value="under-1000" className="bg-[#020617]">
                    Under 1,000
                  </option>
                  <option value="1000-5000" className="bg-[#020617]">
                    1,000 - 5,000
                  </option>
                  <option value="5000-25000" className="bg-[#020617]">
                    5,000 - 25,000
                  </option>
                  <option value="25000-100000" className="bg-[#020617]">
                    25,000 - 100,000
                  </option>
                  <option value="100000-plus" className="bg-[#020617]">
                    100,000+
                  </option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                Promotion notes
              </span>
              <textarea
                value={affiliateForm.promotionNotes}
                onChange={(event) =>
                  updateAffiliateField("promotionNotes", event.target.value)
                }
                rows={4}
                className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                placeholder="Tell us how you plan to promote Phase One Labz while staying compliant."
                required
              />
            </label>

            <div className="grid gap-2 rounded-2xl border border-cyan-200/10 bg-[#020617]/42 p-4">
              {[
                ["confirmAge", "I confirm I am 18 years of age or older."],
                [
                  "confirmResearchOnly",
                  "I will market all products strictly as research chemicals for laboratory and research use only.",
                ],
                [
                  "confirmNoMedicalClaims",
                  "I will not make medical, therapeutic, dosing, or human-consumption claims.",
                ],
                [
                  "confirmPaidAdsApproval",
                  "I will not run paid advertising without prior written approval from Phase One Labz.",
                ],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex gap-3 rounded-xl border border-cyan-200/8 bg-white/[0.014] p-3 text-sm leading-6 text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(affiliateForm[key])}
                    onChange={(event) =>
                      updateAffiliateField(key, event.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-cyan-300"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {affiliateMessage && (
              <p
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  affiliateStatus === "error" || applicationStatus === "error"
                    ? "border-red-400/15 bg-red-400/10 text-red-200"
                    : "border-emerald-300/15 bg-emerald-400/10 text-emerald-100"
                }`}
              >
                {affiliateMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmitAffiliate || affiliateStatus === "loading"}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {affiliateStatus === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  Submit application
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
function OrderTrackingPanel({ trackedOrder }) {
  const trackingStatus = getTrackingStatus(trackedOrder);
  const primaryTracking = getPrimaryTracking(trackedOrder);

  const badgeClasses = {
    success: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-100",
    info: "border-cyan-200/15 bg-cyan-300/[0.07] text-cyan-100",
    warning: "border-yellow-300/15 bg-yellow-300/[0.06] text-yellow-100",
    danger: "border-red-400/15 bg-red-400/10 text-red-200",
    default: "border-cyan-200/10 bg-white/[0.035] text-slate-300",
  };

  return (
    <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/42 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
            Fulfillment status
          </p>

          <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
            {trackingStatus.label}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            {trackingStatus.description}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${
            badgeClasses[trackingStatus.tone] || badgeClasses.default
          }`}
        >
          {trackedOrder.status_label || normalizeStatus(trackedOrder.status)}
        </span>
      </div>

      {primaryTracking ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.02] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Tracking
            </p>

            <p className="mt-2 break-all text-sm font-semibold text-white">
              {primaryTracking.tracking_number || "Tracking active"}
            </p>

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {primaryTracking.carrier && (
                <span>Carrier: {primaryTracking.carrier}</span>
              )}

              {primaryTracking.shipped_date && (
                <span>Shipped: {primaryTracking.shipped_date}</span>
              )}
            </div>
          </div>

          {primaryTracking.tracking_url && (
            <a
              href={primaryTracking.tracking_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-white"
            >
              Open tracking
              <ArrowRight size={13} />
            </a>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-white/[0.02] p-4">
          <p className="text-sm font-semibold text-white">
            Tracking not available yet
          </p>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            Once the label is created or synced from ShipStation, the tracking
            number will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AccountDashboard() {
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loginStatus, setLoginStatus] = useState("idle");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [redeemBlocks, setRedeemBlocks] = useState(1);
  const [redeemStatus, setRedeemStatus] = useState("idle");
  const [redeemMessage, setRedeemMessage] = useState("");

  const [trackingByOrder, setTrackingByOrder] = useState({});
  const [trackingLoadingByOrder, setTrackingLoadingByOrder] = useState({});
  const [trackingErrorByOrder, setTrackingErrorByOrder] = useState({});
  const [openTrackingOrderId, setOpenTrackingOrderId] = useState(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const paidOrderStatuses = ["processing", "completed"];
  const visibleOrderStatuses = ["pending", "on-hold", "processing", "completed"];

  const visibleOrders = useMemo(() => {
    return (account?.recent_orders || []).filter((order) => {
      const orderStatus = String(order.status || "").toLowerCase();

      return visibleOrderStatuses.includes(orderStatus);
    });
  }, [account?.recent_orders]);

  const recentOrders = useMemo(() => {
    return visibleOrders.filter((order) => {
      const orderStatus = String(order.status || "").toLowerCase();

      return paidOrderStatuses.includes(orderStatus);
    });
  }, [visibleOrders]);

  const totalSpent = useMemo(() => {
    return recentOrders.reduce((total, order) => {
      return total + Number(order.total || 0);
    }, 0);
  }, [recentOrders]);

  const earnedFromRecentOrders = useMemo(() => {
    return recentOrders.reduce((total, order) => {
      return total + Number(order.points_earned || 0);
    }, 0);
  }, [recentOrders]);

  const apiPointsBalance = Number(account?.points || 0);
  const hasApiPoints = account?.points !== undefined && account?.points !== null;
  const pointsBalance = hasApiPoints
    ? Math.max(apiPointsBalance, 0)
    : earnedFromRecentOrders;

  const storeCreditBalance = Number(
    account?.store_credit || account?.storeCredit || account?.credit || 0
  );

  const redemptionHistory = useMemo(() => {
    const raw =
      account?.store_credit_redemptions ||
      account?.storeCreditRedemptions ||
      account?.redemptions ||
      [];

    if (!Array.isArray(raw)) return [];

    return raw;
  }, [account]);

  const rewardStats = useMemo(() => {
    return getRewardCreditStats(pointsBalance);
  }, [pointsBalance]);

  const loadAccount = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setStatus("loading");
      } else {
        setRefreshing(true);
      }

      setError("");

      const token = getSavedAuthToken();

      const response = await fetch(`/api/account?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        setAccount(null);
        setStatus("unauthenticated");
        return;
      }

      setAccount((current) => ({
        ...data,
        store_credit:
          data?.store_credit ??
          data?.storeCredit ??
          current?.store_credit ??
          current?.storeCredit ??
          0,
        storeCredit:
          data?.storeCredit ??
          data?.store_credit ??
          current?.storeCredit ??
          current?.store_credit ??
          0,
        credit:
          data?.credit ??
          data?.store_credit ??
          data?.storeCredit ??
          current?.credit ??
          0,
        store_credit_redemptions:
          data?.store_credit_redemptions ??
          data?.storeCreditRedemptions ??
          current?.store_credit_redemptions ??
          [],
      }));

      setStatus("authenticated");
    } catch {
      setAccount(null);
      setStatus("error");
      setError("We could not load your account. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    if (rewardStats.unlockedBlocks <= 0) {
      setRedeemBlocks(1);
      return;
    }

    setRedeemBlocks((current) =>
      Math.min(Math.max(Number(current || 1), 1), rewardStats.unlockedBlocks)
    );
  }, [rewardStats.unlockedBlocks]);

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setLoginStatus("loading");
      setError("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginStatus("error");
        setError(data.error || "Invalid email or password.");
        return;
      }

      const token =
        data?.token ||
        data?.auth_token ||
        data?.access_token ||
        data?.jwt ||
        data?.session_token ||
        data?.data?.token ||
        "";

      if (token) {
        saveAuthToken(token);
      }

      setLoginStatus("success");
      setForm({ email: "", password: "" });

      await loadAccount();
    } catch {
      setLoginStatus("error");
      setError("Login failed. Please try again.");
    }
  };

  const handleRedeemPoints = async () => {
    try {
      if (rewardStats.unlockedBlocks <= 0) {
        setRedeemStatus("error");
        setRedeemMessage("You need at least 500 points to redeem store credit.");
        return;
      }

      const safeBlocks = Math.min(
        Math.max(Number(redeemBlocks || 1), 1),
        rewardStats.unlockedBlocks
      );

      const pointsToRedeem = safeBlocks * POINTS_PER_REWARD;
      const creditAmount = safeBlocks * CREDIT_PER_REWARD;

      setRedeemStatus("loading");
      setRedeemMessage("");

      const token = getSavedAuthToken();

      const response = await fetch("/api/account/redeem-points", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          points: pointsToRedeem,
          credit: creditAmount,
          currency: "USD",
        }),
      });

      const rawText = await response.text();

      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        setRedeemStatus("error");
        setRedeemMessage(
          data?.error ||
            rawText ||
            `Redeem request failed with status ${response.status}.`
        );
        return;
      }

      const nextPoints = Number(data?.points ?? pointsBalance - pointsToRedeem);
      const nextStoreCredit = Number(
        data?.store_credit ?? storeCreditBalance + creditAmount
      );

      setAccount((current) => {
        const previousRedemptions =
          current?.store_credit_redemptions ||
          current?.storeCreditRedemptions ||
          current?.redemptions ||
          [];

        const nextRedemptions = Array.isArray(data?.store_credit_redemptions)
          ? data.store_credit_redemptions
          : data?.redemption
            ? [data.redemption, ...previousRedemptions]
            : previousRedemptions;

        return {
          ...current,
          points: nextPoints,
          pointsBalance: nextPoints,
          points_balance: nextPoints,
          store_credit: nextStoreCredit,
          storeCredit: nextStoreCredit,
          credit: nextStoreCredit,
          store_credit_redemptions: nextRedemptions,
          storeCreditRedemptions: nextRedemptions,
          redemptions: nextRedemptions,
        };
      });

      setRedeemStatus("success");
      setRedeemMessage(
        data?.message ||
          `${pointsToRedeem.toLocaleString(
            "en-US"
          )} points were converted into ${formatMoney(
            creditAmount
          )} store credit.`
      );

      setRedeemBlocks(1);
    } catch (err) {
      setRedeemStatus("error");
      setRedeemMessage(
        err?.message ||
          "We could not redeem your points right now. Please try again."
      );
    }
  };

  const handleTrackOrder = async (order) => {
    const orderId = order?.id;
    const orderNumber = String(order?.number || order?.id || "").trim();
    const email = String(account?.email || "").trim().toLowerCase();

    if (openTrackingOrderId === orderId && trackingByOrder[orderId]) {
      setOpenTrackingOrderId(null);
      return;
    }

    setOpenTrackingOrderId(orderId);

    if (trackingByOrder[orderId]) {
      return;
    }

    if (!orderNumber || !email) {
      setTrackingErrorByOrder((current) => ({
        ...current,
        [orderId]: "Missing order number or account email.",
      }));
      return;
    }

    setTrackingLoadingByOrder((current) => ({
      ...current,
      [orderId]: true,
    }));

    setTrackingErrorByOrder((current) => ({
      ...current,
      [orderId]: "",
    }));

    try {
      const response = await fetch("/api/order/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          orderNumber,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not load tracking.");
      }

      setTrackingByOrder((current) => ({
        ...current,
        [orderId]: data.order,
      }));
    } catch (error) {
      setTrackingErrorByOrder((current) => ({
        ...current,
        [orderId]: error?.message || "Could not load tracking.",
      }));
    } finally {
      setTrackingLoadingByOrder((current) => ({
        ...current,
        [orderId]: false,
      }));
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    clearAuthToken();

    setAccount(null);
    setStatus("unauthenticated");
    setLoginStatus("idle");
    setRedeemStatus("idle");
    setRedeemMessage("");
    setTrackingByOrder({});
    setTrackingLoadingByOrder({});
    setTrackingErrorByOrder({});
    setOpenTrackingOrderId(null);
  };

  if (status === "loading") {
    return (
      <section className="account-page-shell relative isolate min-h-[70vh] overflow-x-hidden bg-[#020617] px-5 py-20 text-white sm:px-6 sm:py-24">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <div className="flex items-center gap-3 rounded-full border border-cyan-200/10 bg-white/[0.025] px-5 py-3 text-cyan-100 backdrop-blur-xl">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.2em]">
              Loading account
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (status === "unauthenticated") {
    return (
      <section className="account-page-shell relative isolate min-h-[75vh] overflow-x-hidden bg-[#020617] px-5 py-16 text-white sm:px-6 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/8 blur-[120px] sm:h-80 sm:w-80 sm:bg-cyan-300/10 sm:blur-[130px]" />
          <div className="absolute right-[-25%] top-[25%] h-72 w-72 rounded-full bg-blue-500/8 blur-[120px] lg:right-[-10%] lg:bg-blue-500/10 lg:blur-[130px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex items-center justify-center gap-3 lg:mb-5 lg:justify-start">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)] lg:hidden" />
              <span className="hidden h-px w-8 bg-cyan-300/70 lg:block" />

              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/70 sm:text-[10px] sm:tracking-[0.32em]">
                Client Portal
              </span>
            </div>

            <h1 className="mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-2xl sm:text-[54px] lg:mx-0 lg:text-[68px] lg:leading-[1.03] lg:tracking-[-0.055em]">
              Access your
              <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85">
                rewards dashboard.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[360px] text-[13.5px] leading-7 text-slate-300/65 sm:max-w-xl sm:text-[15px] sm:leading-8 lg:mx-0 lg:mt-6">
              Sign in to view your points balance, store credit, recent orders,
              and rewards activity connected to your account.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 lg:max-w-xl">
              <div className="rounded-[1.25rem] border border-cyan-200/10 bg-white/[0.018] p-4 text-left backdrop-blur-xl sm:rounded-2xl">
                <BadgeCheck size={18} className="mb-3 text-cyan-200" />
                <p className="text-[13.5px] font-semibold text-white sm:text-sm">
                  Points tracking
                </p>
                <p className="mt-1 text-[12.5px] leading-5 text-slate-400 sm:text-sm sm:leading-6">
                  Earn points from eligible completed orders.
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-cyan-200/10 bg-white/[0.018] p-4 text-left backdrop-blur-xl sm:rounded-2xl">
                <CircleDollarSign size={18} className="mb-3 text-cyan-200" />
                <p className="text-[13.5px] font-semibold text-white sm:text-sm">
                  Store credit
                </p>
                <p className="mt-1 text-[12.5px] leading-5 text-slate-400 sm:text-sm sm:leading-6">
                  Convert 500 points into $5 store balance.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            className="relative overflow-hidden rounded-[1.7rem] border border-cyan-200/10 bg-white/[0.025] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-8"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-[100px]" />

            <div className="relative z-10">
              <div className="mb-7 sm:mb-8">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200 sm:h-12 sm:w-12">
                  <User size={20} />
                </div>

                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                  Sign in
                </h2>

                <p className="mt-2 text-[13px] leading-6 text-slate-400 sm:text-sm">
                  Use your customer account credentials.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]">
                    Email
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                    placeholder="customer@email.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]">
                    Password
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                    placeholder="••••••••"
                    required
                  />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/35 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-500">
                    Having trouble accessing your account?
                  </p>

                  <a
                    href="/forgot-password"
                    className="group inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/75 transition hover:text-white"
                  >
                    Reset password
                    <span className="h-px w-6 bg-cyan-200/40 transition group-hover:w-8 group-hover:bg-white" />
                  </a>
                </div>
              </div>

              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loginStatus === "loading"}
                className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:text-[11px] sm:tracking-[0.2em]"
              >
                {loginStatus === "loading" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in
                  </>
                ) : (
                  <>
                    Access Dashboard
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="mt-5 text-center text-xs leading-6 text-slate-500">
                New here?{" "}
                <a href="/register" className="text-cyan-200 hover:text-white">
                  Create an account
                </a>
              </p>
            </div>
          </form>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="account-page-shell relative isolate overflow-x-hidden bg-[#020617] px-5 py-20 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl rounded-[1.7rem] border border-red-400/15 bg-red-400/10 p-6 text-center sm:rounded-[2rem] sm:p-8">
          <h1 className="text-2xl font-semibold text-white">
            Account unavailable
          </h1>

          <p className="mt-3 text-sm leading-7 text-red-100/80">{error}</p>

          <button
            type="button"
            onClick={() => loadAccount()}
            className="mt-6 rounded-full bg-cyan-300 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="account-page-shell relative isolate min-h-[100svh] overflow-x-hidden bg-[#020617] px-5 py-16 text-white sm:px-6 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/7 blur-[120px] lg:left-[8%] lg:top-12 lg:h-72 lg:w-72 lg:translate-x-0" />
        <div className="absolute right-[-25%] top-[35%] h-80 w-80 rounded-full bg-blue-500/8 blur-[130px] lg:right-[-8%] lg:bg-blue-500/10" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-center gap-5 text-center sm:mb-10 lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <div className="w-full">
            <div className="mb-4 inline-flex items-center justify-center gap-3 lg:mb-5 lg:justify-start">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.75)]" />

              <span className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/70 sm:text-[10px] sm:tracking-[0.32em]">
                Account Dashboard
              </span>
            </div>

            <h1 className="mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[54px] lg:mx-0 lg:text-[68px] lg:leading-[1.03] lg:tracking-[-0.055em]">
              Welcome back,
              <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85">
                {account.name}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[360px] text-[13.5px] leading-7 text-slate-300/65 sm:max-w-xl sm:text-[15px] sm:leading-8 lg:mx-0">
              View your personal information, rewards, store credit, and order
              activity.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center lg:justify-end">
            <button
              type="button"
              onClick={() => loadAccount({ silent: true })}
              disabled={refreshing}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-cyan-200/12 bg-white/[0.025] px-4 text-[8px] font-black uppercase tracking-[0.12em] text-white/75 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white disabled:opacity-60 sm:w-fit sm:gap-3 sm:px-5 sm:py-3 sm:text-[10px] sm:tracking-[0.18em]"
            >
              {refreshing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-cyan-200/12 bg-white/[0.025] px-4 text-[8px] font-black uppercase tracking-[0.12em] text-white/75 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white sm:w-fit sm:gap-3 sm:px-5 sm:py-3 sm:text-[10px] sm:tracking-[0.18em]"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>

        <DashboardMenu activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "overview" && (
          <div className="space-y-4 sm:space-y-5">
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative overflow-hidden rounded-[1.7rem] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(4,12,24,0.96),rgba(8,38,56,0.66),rgba(4,12,24,0.96))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/12 blur-[110px]" />

                <div className="relative z-10">
                  <div className="mb-7 flex items-start justify-between gap-4 sm:mb-10 sm:gap-6">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/70 sm:text-[10px] sm:tracking-[0.28em]">
                        Rewards Balance
                      </p>

                      <div className="mt-4 flex flex-wrap items-end gap-2 sm:mt-5 sm:gap-3">
                        <span className="text-[56px] font-semibold leading-none tracking-[-0.08em] text-white sm:text-[96px]">
                          {pointsBalance.toLocaleString("en-US")}
                        </span>
                        <span className="pb-2 text-base font-semibold tracking-[-0.04em] text-cyan-100/80 sm:pb-3 sm:text-xl">
                          points
                        </span>
                      </div>
                    </div>

                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100 sm:h-14 sm:w-14">
                      <Sparkles size={22} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <MiniStat
                      label="Recent earned"
                      value={earnedFromRecentOrders.toLocaleString("en-US")}
                    />
                    <MiniStat label="Paid orders" value={recentOrders.length} />
                    <MiniStat
                      label="Recent spend"
                      value={formatMoney(totalSpent)}
                    />
                    <MiniStat
                      label="Store credit"
                      value={formatMoney(storeCreditBalance)}
                      accent
                    />
                  </div>

                  <div className="mt-5 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 sm:mt-6">
                    <p className="text-xs leading-6 text-slate-400">
                      Rewards are calculated from eligible paid orders. Current
                      rule: 1 USD = 1 point. Every 500 points can be converted
                      into $5 store credit.
                    </p>
                  </div>
                </div>
              </div>

              <SectionCard>
                <SectionHeading
                  eyebrow="Quick Summary"
                  title="Account snapshot"
                  description="A quick view of your profile, rewards, and order activity."
                />

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("personal")}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Personal information
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        View your name, email, and account status.
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-cyan-200 transition group-hover:translate-x-1"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("rewards")}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Rewards and credit
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Convert points into store credit and review redemptions.
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-cyan-200 transition group-hover:translate-x-1"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Orders and tracking
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        View order activity and track shipment status.
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-cyan-200 transition group-hover:translate-x-1"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("affiliate")}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Affiliate program
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Apply for your research-use-only referral coupon.
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-cyan-200 transition group-hover:translate-x-1"
                    />
                  </button>

                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === "personal" && (
          <SectionCard>
            <SectionHeading
              eyebrow="Personal Info"
              title="Account details"
              description="Basic customer information connected to your account."
            />

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
                  Name
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {account.name}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
                  Email
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-white">
                  {account.email}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
                  Account status
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <BadgeCheck size={16} />
                  Active rewards member
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.035] p-4">
              <p className="text-xs leading-6 text-slate-400">
                Need to update your personal details? Contact support with your
                account email so the team can help verify and update your
                information securely.
              </p>
            </div>
          </SectionCard>
        )}

        {activeTab === "rewards" && (
          <div className="space-y-4 sm:space-y-5">
            <div className="relative overflow-hidden rounded-[1.7rem] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(4,12,24,0.96),rgba(8,38,56,0.66),rgba(4,12,24,0.96))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/12 blur-[110px]" />

              <div className="relative z-10">
                <SectionHeading
                  eyebrow="Rewards"
                  title="Rewards balance"
                  description="Track points earned from eligible paid orders."
                />

                <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                  <span className="text-[56px] font-semibold leading-none tracking-[-0.08em] text-white sm:text-[96px]">
                    {pointsBalance.toLocaleString("en-US")}
                  </span>
                  <span className="pb-2 text-base font-semibold tracking-[-0.04em] text-cyan-100/80 sm:pb-3 sm:text-xl">
                    points
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  <MiniStat
                    label="Recent earned"
                    value={earnedFromRecentOrders.toLocaleString("en-US")}
                  />
                  <MiniStat label="Paid orders" value={recentOrders.length} />
                  <MiniStat
                    label="Recent spend"
                    value={formatMoney(totalSpent)}
                  />
                  <MiniStat
                    label="Store credit"
                    value={formatMoney(storeCreditBalance)}
                    accent
                  />
                </div>
              </div>
            </div>

            <RewardCreditConverter
              pointsBalance={pointsBalance}
              storeCreditBalance={storeCreditBalance}
              rewardStats={rewardStats}
              redeemBlocks={redeemBlocks}
              setRedeemBlocks={setRedeemBlocks}
              redeemStatus={redeemStatus}
              redeemMessage={redeemMessage}
              onRedeem={handleRedeemPoints}
            />

            <RedemptionHistoryCard redemptions={redemptionHistory} />

            <SectionCard>
              <SectionHeading
                eyebrow="Rewards Guide"
                title="Ways to earn points"
                description="Convert every 500 points into $5 of store credit."
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <WaysToEarnCard
                  icon={ShoppingBag}
                  title="Shop eligible products"
                  description="Earn points when you place eligible orders through your customer account."
                />

                <WaysToEarnCard
                  icon={CircleDollarSign}
                  title="500 points = $5"
                  description="Every 500 points unlocks $5 that can be transferred into store credit."
                />

                <WaysToEarnCard
                  icon={ShieldCheck}
                  title="Paid orders only"
                  description="Points are calculated from completed or processing orders. Pending orders do not earn points yet."
                />
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.035] p-4">
                <p className="text-xs leading-6 text-slate-400">
                  Store credit is saved to your account balance after transfer.
                  The checkout discount step reads that balance when you apply
                  credit during payment.
                </p>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "orders" && (
          <SectionCard>
            <SectionHeading
              eyebrow="Orders"
              title="Order activity"
              right={
                <p className="text-sm text-slate-500">
                  Showing {visibleOrders.length} order
                  {visibleOrders.length === 1 ? "" : "s"}.
                </p>
              }
            />

            {visibleOrders.length === 0 ? (
              <div className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-8 text-center">
                <p className="text-lg font-semibold text-white">
                  No orders yet
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Your order activity and shipment tracking will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map((order) => {
                  const trackedOrder = trackingByOrder[order.id];
                  const isTrackingOpen = openTrackingOrderId === order.id;
                  const isTrackingLoading = Boolean(
                    trackingLoadingByOrder[order.id]
                  );
                  const trackingError = trackingErrorByOrder[order.id];
                  const hasPoints = paidOrderStatuses.includes(
                    String(order.status || "").toLowerCase()
                  );

                  return (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm font-semibold text-white">
                              Order #{order.number}
                            </p>

                            <span className="rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/75">
                              {normalizeStatus(order.status)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-2">
                              <Clock3 size={14} />
                              {formatDate(order.date)}
                            </span>

                            <span>Total: {formatMoney(order.total, order.currency)}</span>

                            <span>
                              Points:{" "}
                              {hasPoints
                                ? `+${Number(
                                    order.points_earned || 0
                                  ).toLocaleString("en-US")}`
                                : "Pending"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTrackOrder(order)}
                          disabled={isTrackingLoading}
                          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.075] px-4 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.12] hover:text-white disabled:cursor-wait disabled:opacity-60"
                        >
                          {isTrackingLoading ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Checking
                            </>
                          ) : (
                            <>
                              <Truck size={14} />
                              {isTrackingOpen ? "Hide tracking" : "Track"}
                            </>
                          )}
                        </button>
                      </div>

                      {trackingError && (
                        <p className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                          {trackingError}
                        </p>
                      )}

                      {isTrackingOpen && trackedOrder && (
                        <OrderTrackingPanel trackedOrder={trackedOrder} />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === "affiliate" && (
          <AffiliateApplicationPanel account={account} />
        )}
      </div>

      <style>{`
        html,
        body,
        #root {
          width: 100%;
          max-width: 100%;
          min-height: 100%;
          margin: 0;
          background: #020617;
          overflow-x: hidden;
        }

        #root {
          overflow-x: clip;
        }

        .account-page-shell {
          width: 100%;
          max-width: 100vw;
          overflow-x: clip;
          background:
            radial-gradient(circle at 50% -12%, rgba(103, 232, 249, 0.08), transparent 34%),
            linear-gradient(180deg, #020617 0%, #03101f 42%, #020617 100%);
        }



        .account-page-shell * {
          box-sizing: border-box;
        }

        .account-page-shell > .pointer-events-none.absolute.inset-0,
        .account-page-shell .rounded-full {
        }


        @media (min-width: 768px) {
          .account-page-shell [class*="blur-[120px]"],
          .account-page-shell [class*="blur-[130px]"] {
            filter: blur(105px);
          }
        }

        /* Performance pass:
           Heavy backdrop filters, huge blur filters and large paint areas were
           causing noticeable lag on page entry and tab switches. These overrides
           keep the same dark Phase One look while reducing GPU/paint work. */
        .account-page-shell {
          contain: paint;
        }

        .account-page-shell [class*="backdrop-blur"] {
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }

        .account-page-shell [class*="blur-[80px]"],
        .account-page-shell [class*="blur-[90px]"],
        .account-page-shell [class*="blur-[100px]"],
        .account-page-shell [class*="blur-[110px]"],
        .account-page-shell [class*="blur-[120px]"],
        .account-page-shell [class*="blur-[130px]"] {
          filter: blur(34px) !important;
          opacity: 0.42;
          transform: translateZ(0);
        }

        .account-page-shell [class*="shadow-[0_24px_90px"],
        .account-page-shell [class*="shadow-[0_28px_90px"],
        .account-page-shell [class*="shadow-[0_0_28px"] {
          box-shadow: none !important;
        }

        .account-page-shell article,
        .account-page-shell form,
        .account-page-shell [class*="rounded-[1.7rem]"],
        .account-page-shell [class*="rounded-[2rem]"] {
          content-visibility: auto;
          contain-intrinsic-size: 1px 420px;
        }

        .account-page-shell button,
        .account-page-shell a {
          will-change: auto;
        }

        .account-tabs-scroll {
          scrollbar-width: none;
        }

        .account-tabs-scroll::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 767px) {
          html,
          body,
          #root {
            background: #020617 !important;
          }

          .account-page-shell {
            min-height: 100svh;
            overflow-x: clip;
            background-color: #020617;
            -webkit-overflow-scrolling: touch;
          }

          .account-page-shell [class*="blur-[120px]"],
          .account-page-shell [class*="blur-[130px]"] {
            filter: blur(28px);
          }
        }
      `}</style>
    </section>
  );
}
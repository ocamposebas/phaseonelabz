import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const moneyFormatters = new Map();

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

function normalizeStatus(status) {
  if (!status) return "Pending";

  return String(status)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";

  return localStorage.getItem("lab_auth_token") || "";
}

function SectionCard({ children, className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.7rem] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(6,15,28,0.94),rgba(3,9,18,0.94))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_22px_70px_rgba(0,0,0,0.18)] sm:rounded-[2rem] sm:p-8 lg:rounded-[1.5rem] lg:p-5 ${className}`}
    >
      <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/15 to-transparent" />
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, right }) {
  return (
    <div className="relative z-10 mb-5 flex flex-col gap-3 text-left sm:mb-7 sm:flex-row sm:items-end sm:justify-between lg:mb-5">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.3em]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.045em] text-white sm:text-[30px] lg:text-[26px]">
          {title}
        </h2>
      </div>
      {description ? (
        <p className="max-w-md text-[13px] leading-6 text-slate-500 sm:text-right sm:text-sm">
          {description}
        </p>
      ) : (
        right
      )}
    </div>
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
    <div className="relative py-2 sm:py-3">
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
    </div>
  );
}


export default function AffiliateApplicationPanel({ account }) {
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


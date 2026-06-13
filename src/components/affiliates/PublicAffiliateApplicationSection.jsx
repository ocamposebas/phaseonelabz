import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

function normalizeCouponCode(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 24);
}

/**
 * We use the existing Astro API route because the WordPress bridge endpoint
 * requires the private X-PhaseOne-Secret header.
 *
 * Do NOT call the WordPress endpoint directly from the browser with the secret.
 */
function getAffiliateApplyEndpoint() {
  return "/api/affiliate/apply.json";
}

const platformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "website", label: "Website / Blog" },
  { value: "email-list", label: "Email list" },
  { value: "community", label: "Private community" },
  { value: "other", label: "Other" },
];

const audienceSizeOptions = [
  { value: "under-1000", label: "Under 1,000" },
  { value: "1000-5000", label: "1,000 - 5,000" },
  { value: "5000-25000", label: "5,000 - 25,000" },
  { value: "25000-100000", label: "25,000 - 100,000" },
  { value: "100000-plus", label: "100,000+" },
];

const complianceItems = [
  ["confirmAge", "I confirm I am 18 years of age or older."],
  [
    "confirmResearchOnly",
    "I will market all products strictly as research chemicals for laboratory and research use only.",
  ],
  [
    "confirmNoMedicalClaims",
    "I will not make medical, therapeutic, dosing, human-consumption, or animal-consumption claims.",
  ],
  [
    "confirmPaidAdsApproval",
    "I will not run paid ads, paid search, or sponsored campaigns without prior written approval from Phase One Labz.",
  ],
  [
    "confirmManualReview",
    "I understand applications are manually reviewed and coupon approval is not guaranteed.",
  ],
];

export default function PublicAffiliateApplicationSection() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [requestedCoupon, setRequestedCoupon] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    preferredCoupon: "",
    platform: "",
    socialHandle: "",
    audienceSize: "",
    promotionNotes: "",
    websiteOrLink: "",
    honeypot: "",
    confirmAge: false,
    confirmResearchOnly: false,
    confirmNoMedicalClaims: false,
    confirmPaidAdsApproval: false,
    confirmManualReview: false,
  });

  const updateField = (key, value) => {
    setMessage("");
    setReferenceId("");
    setRequestedCoupon("");

    setForm((current) => ({
      ...current,
      [key]: key === "preferredCoupon" ? normalizeCouponCode(value) : value,
    }));
  };

  const confirmationsReady = useMemo(() => {
    return complianceItems.every(([key]) => Boolean(form[key]));
  }, [form]);

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.preferredCoupon.trim() &&
    form.platform &&
    form.socialHandle.trim() &&
    form.audienceSize &&
    form.promotionNotes.trim() &&
    confirmationsReady &&
    status !== "loading";

  const submitApplication = async () => {
    if (!canSubmit) {
      setStatus("error");
      setMessage("Please complete all required fields and confirmations.");
      return;
    }

    if (form.honeypot) {
      setStatus("success");
      setMessage("Application submitted successfully. It is pending review.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      setReferenceId("");
      setRequestedCoupon("");

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        preferredCoupon: normalizeCouponCode(form.preferredCoupon),
        platform: form.platform,
        socialHandle: form.socialHandle.trim(),
        audienceSize: form.audienceSize,
        promotionNotes: [
          form.promotionNotes.trim(),
          form.websiteOrLink.trim()
            ? `Website/profile link: ${form.websiteOrLink.trim()}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        confirmAge: Boolean(form.confirmAge),
        confirmResearchOnly: Boolean(form.confirmResearchOnly),
        confirmNoMedicalClaims: Boolean(form.confirmNoMedicalClaims),
        confirmPaidAdsApproval: Boolean(form.confirmPaidAdsApproval),
        source: "public_affiliate_application",
      };

      const response = await fetch(getAffiliateApplyEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
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

      if (!response.ok || data?.ok === false || data?.success === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            rawText ||
            `Application could not be submitted. HTTP ${response.status}`
        );
      }

      setStatus("success");
      setReferenceId(
        data?.application_id ||
          data?.applicationId ||
          data?.coupon_affiliates_registration_id ||
          ""
      );
      setRequestedCoupon(
        data?.requested_coupon ||
          data?.requestedCoupon ||
          normalizeCouponCode(form.preferredCoupon)
      );
      setMessage(
        data?.message ||
          "Affiliate application received. It is pending manual review."
      );

      setForm({
        name: "",
        email: "",
        preferredCoupon: "",
        platform: "",
        socialHandle: "",
        audienceSize: "",
        promotionNotes: "",
        websiteOrLink: "",
        honeypot: "",
        confirmAge: false,
        confirmResearchOnly: false,
        confirmNoMedicalClaims: false,
        confirmPaidAdsApproval: false,
        confirmManualReview: false,
      });
    } catch (error) {
      setStatus("error");
      setMessage(error?.message || "Application could not be submitted.");
    }
  };

  return (
    <section className="relative overflow-hidden px-5 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-10 h-96 w-96 rounded-full bg-cyan-300/10 blur-[140px]" />
        <div className="absolute right-[-14%] top-[38%] h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-cyan-200/12 bg-cyan-300/[0.035] px-4 py-2">
            <Sparkles size={14} className="text-cyan-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
              Affiliate Program
            </span>
          </div>

          <h1 className="max-w-2xl text-[42px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:text-[64px] lg:text-[76px]">
            Apply to become a
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent">
              Phase One affiliate.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400 sm:text-[15px] sm:leading-8">
            Apply publicly without logging in. Your request is saved as an
            affiliate application and remains pending until it is manually
            reviewed.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.022] p-4 backdrop-blur-xl">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200">
                <ShieldCheck size={18} />
              </div>
              <p className="text-sm font-semibold text-white">
                Manual approval
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Your requested coupon is reviewed before activation in Coupon
                Affiliates.
              </p>
            </div>

            <div className="rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.022] p-4 backdrop-blur-xl">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200">
                <Users size={18} />
              </div>
              <p className="text-sm font-semibold text-white">
                No password required
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                We use your email to create or connect the affiliate account
                through the existing bridge flow.
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.025] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-[110px]" />

          <div className="relative z-10">
            <div className="mb-7">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/60">
                Public application
              </p>

              <h2 className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.055em] text-white sm:text-[34px]">
                Affiliate application
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                Tell us where you promote and what coupon code you would like to
                request. Your coupon is not active until approved.
              </p>
            </div>

            {status === "success" ? (
              <div className="rounded-[1.6rem] border border-cyan-200/15 bg-cyan-300/[0.07] p-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.09] text-cyan-100">
                  <CheckCircle2 size={24} />
                </div>

                <p className="mt-5 text-xl font-semibold tracking-[-0.035em] text-white">
                  Application submitted
                </p>

                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-cyan-50/70">
                  {message}
                </p>

                {(referenceId || requestedCoupon) && (
                  <div className="mx-auto mt-5 grid max-w-md gap-2 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left">
                    {referenceId && (
                      <p className="text-xs leading-5 text-slate-400">
                        <strong className="text-cyan-100">Reference:</strong>{" "}
                        #{referenceId}
                      </p>
                    )}

                    {requestedCoupon && (
                      <p className="text-xs leading-5 text-slate-400">
                        <strong className="text-cyan-100">Requested coupon:</strong>{" "}
                        {requestedCoupon}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setMessage("");
                    setReferenceId("");
                    setRequestedCoupon("");
                  }}
                  className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full border border-cyan-200/15 bg-cyan-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50 transition hover:bg-cyan-300 hover:text-slate-950"
                >
                  Submit another application
                </button>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitApplication();
                }}
              >
                <label className="hidden" aria-hidden="true">
                  Company website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.honeypot}
                    onChange={(event) =>
                      updateField("honeypot", event.target.value)
                    }
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                      Full name
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                      placeholder="Full name"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                      Email
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                      placeholder="email@example.com"
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                      Preferred coupon code
                    </span>
                    <input
                      value={form.preferredCoupon}
                      onChange={(event) =>
                        updateField("preferredCoupon", event.target.value)
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
                      value={form.platform}
                      onChange={(event) =>
                        updateField("platform", event.target.value)
                      }
                      className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition focus:border-cyan-200/35"
                      required
                    >
                      <option value="">Choose platform</option>
                      {platformOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className="bg-[#020617]"
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                      Social handle
                    </span>
                    <input
                      value={form.socialHandle}
                      onChange={(event) =>
                        updateField("socialHandle", event.target.value)
                      }
                      className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                      placeholder="@username"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                      Audience size
                    </span>
                    <select
                      value={form.audienceSize}
                      onChange={(event) =>
                        updateField("audienceSize", event.target.value)
                      }
                      className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition focus:border-cyan-200/35"
                      required
                    >
                      <option value="">Choose audience size</option>
                      {audienceSizeOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className="bg-[#020617]"
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                    Website or profile link optional
                  </span>
                  <input
                    value={form.websiteOrLink}
                    onChange={(event) =>
                      updateField("websiteOrLink", event.target.value)
                    }
                    className="min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                    placeholder="https://..."
                    autoComplete="url"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55">
                    Promotion notes
                  </span>
                  <textarea
                    value={form.promotionNotes}
                    onChange={(event) =>
                      updateField("promotionNotes", event.target.value)
                    }
                    rows={5}
                    className="w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35"
                    placeholder="Tell us how you plan to promote Phase One Labz while staying compliant."
                    required
                  />
                </label>

                <div className="grid gap-2 rounded-2xl border border-cyan-200/10 bg-[#020617]/42 p-4">
                  {complianceItems.map(([key, label]) => (
                    <label
                      key={key}
                      className="flex gap-3 rounded-xl border border-cyan-200/8 bg-white/[0.014] p-3 text-sm leading-6 text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(form[key])}
                        onChange={(event) =>
                          updateField(key, event.target.checked)
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-cyan-300"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {message && (
                  <p
                    className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                      status === "error"
                        ? "border-red-400/15 bg-red-400/10 text-red-200"
                        : "border-emerald-300/15 bg-emerald-400/10 text-emerald-100"
                    }`}
                  >
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || status === "loading"}
                  className="inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {status === "loading" ? (
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

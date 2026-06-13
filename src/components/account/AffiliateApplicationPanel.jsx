import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

function normalizeCouponCode(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 24);
}

export default function AffiliateApplicationPanel({ account }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
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

  const updateField = (key, value) => {
    setMessage("");

    setForm((current) => ({
      ...current,
      [key]: key === "preferredCoupon" ? normalizeCouponCode(value) : value,
    }));
  };

  const canSubmit =
    form.name &&
    form.email &&
    form.preferredCoupon &&
    form.platform &&
    form.socialHandle &&
    form.audienceSize &&
    form.promotionNotes &&
    form.confirmAge &&
    form.confirmResearchOnly &&
    form.confirmNoMedicalClaims &&
    form.confirmPaidAdsApproval;

  const submitApplication = async () => {
    if (!canSubmit) {
      setStatus("error");
      setMessage("Please complete all required fields and confirmations.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");

      const payload = {
        name: String(form.name || "").trim(),
        email: String(form.email || "").trim(),
        preferredCoupon: normalizeCouponCode(form.preferredCoupon),
        platform: String(form.platform || "").trim(),
        socialHandle: String(form.socialHandle || "").trim(),
        audienceSize: String(form.audienceSize || "").trim(),
        promotionNotes: String(form.promotionNotes || "").trim(),
        confirmAge: Boolean(form.confirmAge),
        confirmResearchOnly: Boolean(form.confirmResearchOnly),
        confirmNoMedicalClaims: Boolean(form.confirmNoMedicalClaims),
        confirmPaidAdsApproval: Boolean(form.confirmPaidAdsApproval),
      };

      console.log("Sending affiliate payload:", payload);

      const response = await fetch("/api/affiliate/apply.json", {
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

      console.log("Affiliate apply response:", {
        status: response.status,
        ok: response.ok,
        rawText,
        data,
      });

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            rawText ||
            `Application could not be submitted. HTTP ${response.status}`
        );
      }

      setStatus("success");
      setMessage(
        data?.message ||
          "Application submitted successfully. It is pending review."
      );
    } catch (error) {
      console.error("Affiliate application error:", error);

      setStatus("error");
      setMessage(error?.message || "Application could not be submitted.");
    }
  };

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
              Submit your application from your customer dashboard. Once
              approved, your coupon and affiliate activity will be managed
              through Coupon Affiliates.
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

      <div className="rounded-[1.7rem] border border-cyan-200/10 bg-white/[0.02] p-5 backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/60 sm:text-[10px] sm:tracking-[0.28em]">
            Application
          </p>

          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl">
            Affiliate application
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            After submission, your application will be reviewed manually before
            your coupon is activated.
          </p>
        </div>

        {status === "success" ? (
          <div className="rounded-[1.45rem] border border-emerald-300/15 bg-emerald-400/[0.075] p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-100">
              <CheckCircle2 size={22} />
            </div>

            <p className="mt-4 text-lg font-semibold text-white">
              Application submitted
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-emerald-100/75">
              {message}
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitApplication();
            }}
          >
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
                  value={form.socialHandle}
                  onChange={(event) =>
                    updateField("socialHandle", event.target.value)
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
                  value={form.audienceSize}
                  onChange={(event) =>
                    updateField("audienceSize", event.target.value)
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
                value={form.promotionNotes}
                onChange={(event) =>
                  updateField("promotionNotes", event.target.value)
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
                    checked={Boolean(form[key])}
                    onChange={(event) =>
                      updateField(key, event.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-cyan-300"
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
              type="button"
              disabled={!canSubmit || status === "loading"}
              onClick={submitApplication}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
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
  );
}
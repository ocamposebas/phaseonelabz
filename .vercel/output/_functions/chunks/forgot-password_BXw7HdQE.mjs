import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { p as renderComponent, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { a as CartProvider, S as SiteHeader, C as CartDrawer, $ as $$MainLayout } from './CartDrawer_q-YYixXG.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { ShieldCheck, LockKeyhole, Mail, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setStatus("loading");
      setMessage("");
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          email
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to process request.");
      }
      setStatus("success");
      setMessage(
        data.message || "If an account exists for this email, reset instructions will be sent."
      );
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    }
  };
  const isSuccess = status === "success";
  const isError = status === "error";
  return /* @__PURE__ */ jsxs("section", { className: "relative min-h-screen overflow-hidden px-6 py-24 text-white", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-12 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[140px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute right-[-10%] top-[28%] h-80 w-80 rounded-full bg-blue-500/10 blur-[140px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute left-[-10%] bottom-[-10%] h-80 w-80 rounded-full bg-cyan-300/6 blur-[140px]" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative mx-auto grid min-h-[calc(100vh-12rem)] max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-5 inline-flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "h-px w-8 bg-cyan-300/70" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/70", children: "Secure Recovery" })
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "max-w-2xl text-[38px] font-semibold leading-[1.03] tracking-[-0.06em] text-white sm:text-[54px] lg:text-[68px]", children: [
          "Reset your",
          /* @__PURE__ */ jsx("span", { className: "block text-cyan-200/85", children: "account access." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-6 max-w-xl text-[15px] leading-8 text-slate-300/65", children: "Enter the email connected to your customer account. If the account exists, we’ll send secure reset instructions to that inbox." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-8 grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { size: 18, className: "mb-3 text-cyan-200" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "Private by design" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm leading-6 text-slate-400", children: "We don’t reveal whether an email exists in our system." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl", children: [
            /* @__PURE__ */ jsx(LockKeyhole, { size: 18, className: "mb-3 text-cyan-200" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "One-time reset" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm leading-6 text-slate-400", children: "Password reset links are generated securely by WordPress." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: handleSubmit,
          className: "relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.025] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8",
          children: [
            /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-[100px]" }),
            /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" }),
            /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
              /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
                /* @__PURE__ */ jsx("div", { className: "mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200", children: /* @__PURE__ */ jsx(Mail, { size: 21 }) }),
                /* @__PURE__ */ jsx("h2", { className: "text-2xl font-semibold tracking-[-0.04em] text-white", children: "Forgot password?" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "We’ll send reset instructions if this email matches an account." })
              ] }),
              (isSuccess || isError) && message && /* @__PURE__ */ jsx(
                "div",
                {
                  className: `mb-5 rounded-[1.4rem] border p-4 ${isSuccess ? "border-cyan-200/15 bg-cyan-300/[0.075]" : "border-red-300/20 bg-red-500/[0.075]"}`,
                  children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: `grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${isSuccess ? "border-cyan-200/20 bg-cyan-300/[0.12] text-cyan-100" : "border-red-300/20 bg-red-500/[0.12] text-red-100"}`,
                        children: isSuccess ? /* @__PURE__ */ jsx(CheckCircle2, { size: 20 }) : /* @__PURE__ */ jsx(LockKeyhole, { size: 20 })
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx(
                        "p",
                        {
                          className: `text-[15px] font-semibold tracking-[-0.025em] ${isSuccess ? "text-cyan-50" : "text-red-50"}`,
                          children: isSuccess ? "Check your inbox" : "Request unavailable"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "p",
                        {
                          className: `mt-1 text-sm leading-6 ${isSuccess ? "text-cyan-100/75" : "text-red-100/75"}`,
                          children: message
                        }
                      )
                    ] })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxs("label", { className: "block", children: [
                /* @__PURE__ */ jsx("span", { className: "mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55", children: "Account email" }),
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsx(
                    Mail,
                    {
                      size: 17,
                      className: "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/50"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "email",
                      value: email,
                      onChange: (event) => setEmail(event.target.value),
                      className: "w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 py-4 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35",
                      placeholder: "customer@email.com",
                      required: true
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  disabled: status === "loading",
                  className: "mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70",
                  children: status === "loading" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(Loader2, { size: 16, className: "animate-spin" }),
                    "Sending"
                  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    "Send reset link",
                    /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxs("p", { className: "mt-5 text-center text-xs leading-6 text-slate-500", children: [
                "Remember your password?",
                " ",
                /* @__PURE__ */ jsx("a", { href: "/account", className: "text-cyan-200 hover:text-white", children: "Sign in" })
              ] })
            ] })
          ]
        }
      )
    ] })
  ] });
}

function AccountExperience() {
  return /* @__PURE__ */ jsxs(CartProvider, { children: [
    /* @__PURE__ */ jsx(SiteHeader, { logoSrc: "/TRANSPARENCIA-03.png" }),
    /* @__PURE__ */ jsx("main", { className: "pt-[118px]", children: /* @__PURE__ */ jsx(ForgotPasswordPage, {}) }),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] });
}

const prerender = false;
const $$ForgotPassword = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Forgot Password // Phase One Labz", "description": "Reset your customer account password securely." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "ForgotPasswordPage", AccountExperience, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/account/ForgotExperience", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/forgot-password.astro", void 0);

const $$file = "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/forgot-password.astro";
const $$url = "/forgot-password";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$ForgotPassword,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

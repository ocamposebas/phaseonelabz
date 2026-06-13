import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { p as renderComponent, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { a as CartProvider, S as SiteHeader, C as CartDrawer, $ as $$MainLayout } from './CartDrawer_q-YYixXG.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { Sparkles, BadgeCheck, ShieldCheck, UserPlus, Loader2, ArrowRight } from 'lucide-react';

function RegisterForm() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: ""
  });
  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setStatus("loading");
      setError("");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setError(data.error || "We could not create your account.");
        return;
      }
      setStatus("success");
      window.location.href = "/account";
    } catch (err) {
      setStatus("error");
      setError("Registration failed. Please try again.");
    }
  };
  return /* @__PURE__ */ jsxs("section", { className: "relative min-h-[75vh] overflow-hidden px-6 py-24 text-white", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[130px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute right-[-10%] top-[25%] h-72 w-72 rounded-full bg-blue-500/10 blur-[130px]" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-5 inline-flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "h-px w-8 bg-cyan-300/70" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/70", children: "Create Account" })
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "max-w-2xl text-[38px] font-semibold leading-[1.03] tracking-[-0.055em] text-white sm:text-[54px] lg:text-[68px]", children: [
          "Join the",
          /* @__PURE__ */ jsx("span", { className: "block text-cyan-200/85", children: "client portal." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-6 max-w-xl text-[15px] leading-8 text-slate-300/65", children: "Create your account to access rewards points, recent orders, and account activity connected to your customer profile." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-8 grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl", children: [
            /* @__PURE__ */ jsx(Sparkles, { size: 18, className: "mb-3 text-cyan-200" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "Earn points" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm leading-6 text-slate-400", children: "Current rule: 1 USD = 1 point on eligible orders." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl", children: [
            /* @__PURE__ */ jsx(BadgeCheck, { size: 18, className: "mb-3 text-cyan-200" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "Track activity" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm leading-6 text-slate-400", children: "Review recent orders and rewards balance." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4 backdrop-blur-xl", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { size: 17, className: "mt-0.5 shrink-0 text-cyan-200" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs leading-6 text-slate-400", children: "Customer account access is used for rewards, order history, and account activity. Keep your login credentials private." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: handleSubmit,
          className: "relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.025] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-8",
          children: [
            /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-[100px]" }),
            /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
              /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
                /* @__PURE__ */ jsx("div", { className: "mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200", children: /* @__PURE__ */ jsx(UserPlus, { size: 21 }) }),
                /* @__PURE__ */ jsx("h2", { className: "text-2xl font-semibold tracking-[-0.04em] text-white", children: "Create your account" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "Register to access your rewards dashboard." })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
                /* @__PURE__ */ jsxs("label", { className: "block", children: [
                  /* @__PURE__ */ jsx("span", { className: "mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55", children: "First name" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "text",
                      value: form.first_name,
                      onChange: (event) => setForm((prev) => ({
                        ...prev,
                        first_name: event.target.value
                      })),
                      className: "w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35",
                      placeholder: "Sebastian",
                      required: true
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("label", { className: "block", children: [
                  /* @__PURE__ */ jsx("span", { className: "mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55", children: "Last name" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "text",
                      value: form.last_name,
                      onChange: (event) => setForm((prev) => ({
                        ...prev,
                        last_name: event.target.value
                      })),
                      className: "w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35",
                      placeholder: "Ocampo",
                      required: true
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 space-y-4", children: [
                /* @__PURE__ */ jsxs("label", { className: "block", children: [
                  /* @__PURE__ */ jsx("span", { className: "mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55", children: "Email" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "email",
                      value: form.email,
                      onChange: (event) => setForm((prev) => ({
                        ...prev,
                        email: event.target.value
                      })),
                      className: "w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35",
                      placeholder: "customer@email.com",
                      required: true
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("label", { className: "block", children: [
                  /* @__PURE__ */ jsx("span", { className: "mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/55", children: "Password" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "password",
                      value: form.password,
                      onChange: (event) => setForm((prev) => ({
                        ...prev,
                        password: event.target.value
                      })),
                      className: "w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35",
                      placeholder: "Minimum 8 characters",
                      minLength: 8,
                      required: true
                    }
                  )
                ] })
              ] }),
              error && /* @__PURE__ */ jsx("p", { className: "mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200", children: error }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  disabled: status === "loading",
                  className: "mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70",
                  children: status === "loading" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(Loader2, { size: 16, className: "animate-spin" }),
                    "Creating account"
                  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    "Create Account",
                    /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxs("p", { className: "mt-5 text-center text-xs leading-6 text-slate-500", children: [
                "Already have an account?",
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

function RegisterExperience() {
  return /* @__PURE__ */ jsxs(CartProvider, { children: [
    /* @__PURE__ */ jsx(SiteHeader, { logoSrc: "/TRANSPARENCIA-03.png" }),
    /* @__PURE__ */ jsx("main", { className: "pt-[118px]", children: /* @__PURE__ */ jsx(RegisterForm, {}) }),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] });
}

const prerender = false;
const $$Register = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Register // Client Portal", "description": "Create your customer account to access rewards points, recent orders, and account activity." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "RegisterExperience", RegisterExperience, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/account/RegisterExperience.jsx", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/register.astro", void 0);

const $$file = "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/register.astro";
const $$url = "/register";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Register,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

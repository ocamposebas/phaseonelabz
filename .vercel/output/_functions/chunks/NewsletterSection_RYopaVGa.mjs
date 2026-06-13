import { jsx, jsxs } from 'react/jsx-runtime';
import { ArrowRight } from 'lucide-react';

const footerColumns = [
  {
    title: "Shop",
    links: [
      { label: "Shop", href: "/shop" },
      { label: "Build a Pack", href: "/build-a-pack" },
      { label: "COA Portal", href: "/coa" },
      { label: "Track Order", href: "/track-order" }
    ]
  },
  {
    title: "Account",
    links: [
      { label: "My Account", href: "/account" },
      { label: "Rewards", href: "/account" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" }
    ]
  },
  {
    title: "Policies",
    links: [
      { label: "Research Use Only", href: "/research-use-only" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Shipping", href: "/shipping" },
      { label: "Refund", href: "/refund-policy" },
      { label: "Disclaimer", href: "/disclaimer" }
    ]
  }
];
const paymentBadges = ["VISA", "AMEX", "DISC", "AFFIRM", "ZELLE", "ACH", "BANK"];
function SiteFooter({
  logoSrc = "TRANSPARENCIA-03.png",
  logoAlt = "Phase One Labz"
}) {
  return /* @__PURE__ */ jsx("footer", { className: "relative px-5 pb-7 pt-10 text-white sm:px-6 sm:pb-8 sm:pt-14", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl", children: [
    /* @__PURE__ */ jsx("div", { className: "h-px w-full bg-gradient-to-r from-transparent via-cyan-200/16 to-transparent" }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-7 py-8 lg:grid-cols-[1.05fr_1.55fr_0.95fr] lg:items-start lg:gap-10 lg:py-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center lg:text-left", children: [
        /* @__PURE__ */ jsx("a", { href: "/", className: "inline-flex justify-center lg:justify-start", children: /* @__PURE__ */ jsx(
          "img",
          {
            src: logoSrc,
            alt: logoAlt,
            className: "h-11 w-auto object-contain sm:h-14",
            loading: "lazy"
          }
        ) }),
        /* @__PURE__ */ jsx("p", { className: "mx-auto mt-4 max-w-[310px] text-[12.5px] leading-6 text-slate-500 sm:max-w-sm sm:text-sm sm:leading-7 lg:mx-0", children: "Research-focused catalog built around COA access, batch clarity, responsible presentation, and secure account tools." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-3 rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.015] p-4 sm:gap-6 sm:p-5 lg:border-0 lg:bg-transparent lg:p-0", children: footerColumns.map((column) => /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("h3", { className: "mb-3 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.26em]", children: column.title }),
        /* @__PURE__ */ jsx("ul", { className: "space-y-2.5 sm:space-y-3", children: column.links.map((link) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
          "a",
          {
            href: link.href,
            className: "block text-[11.5px] font-semibold leading-5 text-slate-400 transition hover:text-cyan-100 sm:text-sm",
            children: link.label
          }
        ) }, link.label)) })
      ] }, column.title)) }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.018] p-4 text-center sm:rounded-2xl sm:p-5 lg:text-left", children: [
        /* @__PURE__ */ jsx("p", { className: "text-[8.5px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.24em]", children: "Need Help?" }),
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "tel:7205171541",
            className: "mt-2 block text-[24px] font-black leading-none tracking-[-0.04em] text-white transition hover:text-cyan-100 sm:mt-3 sm:text-[28px]",
            children: "(720) 517-1541"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "mx-auto mt-4 grid max-w-[320px] gap-2 text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6 lg:mx-0", children: [
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("span", { className: "font-bold text-white/85", children: "Call:" }),
            " ",
            "Mon–Fri 8am–5pm MT"
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("span", { className: "font-bold text-white/85", children: "Text:" }),
            " ",
            "7 days 7am–8pm MT"
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "break-words", children: [
            /* @__PURE__ */ jsx("span", { className: "font-bold text-white/85", children: "Email:" }),
            " ",
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "mailto:info@phaseonelabz.com",
                className: "transition hover:text-cyan-100",
                children: "info@phaseonelabz.com"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-red-400/18 bg-red-500/[0.04] px-4 py-4 sm:rounded-2xl sm:px-5", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-[10.5px] leading-5 text-red-50/70 sm:text-xs sm:leading-6", children: [
        /* @__PURE__ */ jsx("span", { className: "font-black uppercase tracking-[0.1em] text-red-300", children: "For laboratory and research use only." }),
        " ",
        "Products displayed on this website are intended strictly for in-vitro laboratory research purposes only. They are not for human consumption, veterinary use, diagnostic use, therapeutic use, cosmetic use, food use, dietary supplement use, or clinical application."
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-[10px] leading-5 text-red-100/42 sm:mt-3 sm:text-[11px] sm:leading-6", children: "Statements on this website have not been evaluated by the U.S. Food and Drug Administration. Products are not intended to diagnose, treat, cure, or prevent any disease." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-7 flex flex-col items-center gap-6 border-t border-white/8 pt-6 text-center lg:mt-8 lg:flex-row lg:items-center lg:justify-between lg:text-left", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex max-w-[360px] flex-wrap items-center justify-center gap-2 lg:max-w-none lg:justify-start", children: [
        /* @__PURE__ */ jsx("span", { className: "mb-1 w-full text-[8.5px] font-black uppercase tracking-[0.22em] text-slate-700 lg:mb-0 lg:mr-2 lg:w-auto", children: "We Accept" }),
        paymentBadges.map((badge) => /* @__PURE__ */ jsx(
          "span",
          {
            className: "inline-flex h-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.88] px-2.5 text-[7.5px] font-black uppercase tracking-[0.06em] text-slate-950 sm:px-3 sm:text-[8px]",
            children: badge
          },
          badge
        ))
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3 text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-700 lg:items-end lg:text-right lg:text-[9px] lg:tracking-[0.18em]", children: [
        /* @__PURE__ */ jsx("p", { children: "© 2026 Phase One Labz · Research Use Only · 21+" }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center gap-x-4 gap-y-2 lg:justify-end lg:gap-x-5", children: [
          /* @__PURE__ */ jsx("a", { href: "/terms", className: "transition hover:text-cyan-200", children: "Terms" }),
          /* @__PURE__ */ jsx("a", { href: "/privacy", className: "transition hover:text-cyan-200", children: "Privacy" }),
          /* @__PURE__ */ jsx("a", { href: "/shipping", className: "transition hover:text-cyan-200", children: "Shipping" }),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "/research-use-only",
              className: "transition hover:text-cyan-200",
              children: "Research Use Only"
            }
          )
        ] })
      ] })
    ] })
  ] }) });
}

function NewsletterSection() {
  return /* @__PURE__ */ jsx("section", { className: "relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16", children: /* @__PURE__ */ jsx("div", { className: "relative mx-auto max-w-7xl", children: /* @__PURE__ */ jsxs("div", { className: "relative z-10 mx-auto max-w-5xl overflow-hidden rounded-[1.6rem] border border-cyan-200/12 bg-[#121E2E] px-5 py-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(103,232,249,0.10),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012),rgba(103,232,249,0.035))]" }),
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" }),
    /* @__PURE__ */ jsxs("div", { className: "relative grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200/60", children: "Subscribe to newsletter" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-2 text-[24px] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[30px]", children: "Get product and COA updates first." }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 max-w-md text-sm leading-6 text-slate-400", children: "New releases, restocks, batch documentation updates, and research catalog announcements." })
      ] }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          className: "w-full",
          onSubmit: (event) => {
            event.preventDefault();
            alert("Thanks for subscribing.");
          },
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col overflow-hidden rounded-xl border border-cyan-200/18 bg-[#07111D]/80 shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:flex-row", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "email",
                  required: true,
                  placeholder: "Email Address *",
                  className: "min-h-[48px] flex-1 bg-transparent px-5 text-sm font-medium text-white outline-none placeholder:text-slate-500"
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "submit",
                  className: "group inline-flex min-h-[48px] items-center justify-center gap-2 bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200 sm:min-w-[130px]",
                  children: [
                    "Submit",
                    /* @__PURE__ */ jsx(
                      ArrowRight,
                      {
                        size: 13,
                        className: "transition group-hover:translate-x-0.5"
                      }
                    )
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 text-[10px] leading-5 text-slate-500", children: "Research-use-only catalog updates. No spam." })
          ]
        }
      )
    ] })
  ] }) }) });
}

export { NewsletterSection as N, SiteFooter as S };

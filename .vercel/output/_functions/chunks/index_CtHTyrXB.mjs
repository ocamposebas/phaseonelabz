import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { p as renderComponent, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { u as useCart, a as CartProvider, S as SiteHeader, C as CartDrawer, $ as $$MainLayout } from './CartDrawer_q-YYixXG.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { ArrowRight, ShieldCheck, FileCheck2, PackageCheck, ShoppingBag, FlaskConical, Sparkles, CreditCard, UserRoundCheck, Clock3, BadgeCheck, FileSearch, Search, History, ChevronDown, FileText, Layers3, ShieldPlus, Beaker, WandSparkles, Syringe, Droplets, ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { c as coaRecords } from './coaRecords_DATiLCc2.mjs';
import { N as NewsletterSection, S as SiteFooter } from './NewsletterSection_RYopaVGa.mjs';

function Hero({ bottleSrc = "/images/bottle-1.png" }) {
  const featureCards = [
    {
      icon: ShieldCheck,
      title: "Verified",
      text: "Quality-focused product presentation."
    },
    {
      icon: FileCheck2,
      title: "COA Access",
      text: "Certificate flow that feels simple."
    },
    {
      icon: PackageCheck,
      title: "Pack Ready",
      text: "Made for bundles and discovery."
    }
  ];
  return /* @__PURE__ */ jsxs("section", { className: "relative isolate overflow-hidden text-white", children: [
    /* @__PURE__ */ jsxs("div", { className: "hero-inner relative mx-auto grid min-h-[calc(100vh-130px)] max-w-7xl items-center gap-6 px-5 pb-12 pt-8 text-center sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:px-8 lg:py-10 lg:text-left", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative z-20 mx-auto flex max-w-2xl flex-col items-center self-center lg:mx-0 lg:items-start", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-5 inline-flex items-center justify-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "h-px w-8 bg-cyan-300/70 sm:w-9" }),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-200/75 sm:text-[10px] sm:tracking-[0.32em]", children: "Research Use Only" }),
          /* @__PURE__ */ jsx("span", { className: "h-px w-8 bg-cyan-300/70 lg:hidden" })
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "hero-title mx-auto max-w-[650px] text-center text-[48px] font-semibold leading-[0.88] tracking-[-0.085em] text-white sm:text-[54px] lg:mx-0 lg:max-w-2xl lg:text-left lg:text-[52px] lg:leading-[1.08] lg:tracking-[-0.045em]", children: [
          /* @__PURE__ */ jsx("span", { className: "hero-title-line", children: "Research compounds," }),
          /* @__PURE__ */ jsx("span", { className: "hero-title-line block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85", children: "presented with clarity." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-[520px] text-center text-[14px] leading-7 text-slate-300/72 sm:text-base sm:leading-8 lg:mx-0 lg:max-w-xl lg:text-left", children: "A refined catalog experience for research-focused products, built around clean browsing, batch transparency, COA access, and a more confident buying flow." }),
        /* @__PURE__ */ jsxs("div", { className: "hero-mobile-actions mt-7 flex w-full max-w-[420px] flex-col justify-center gap-3 sm:flex-row lg:max-w-none lg:justify-start", children: [
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: "/catalog",
              className: "group inline-flex items-center justify-center gap-3 rounded-xl bg-cyan-300 px-6 py-3.5 text-[12px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_45px_rgba(34,211,238,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-200",
              children: [
                "Shop Catalog",
                /* @__PURE__ */ jsx(
                  ArrowRight,
                  {
                    size: 16,
                    className: "transition duration-300 group-hover:translate-x-1"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "/coa",
              className: "inline-flex items-center justify-center rounded-xl border border-cyan-200/15 bg-white/[0.025] px-6 py-3.5 text-[12px] font-black uppercase tracking-[0.16em] text-cyan-50 backdrop-blur-xl transition duration-300 hover:border-cyan-200/35 hover:bg-cyan-300/[0.06]",
              children: "Check COA"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "hero-feature-row mx-auto mt-8 hidden w-full max-w-[520px] gap-3 sm:grid-cols-3 lg:mx-0 lg:grid lg:max-w-xl", children: featureCards.map((item) => {
          const Icon = item.icon;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "hero-feature-card group flex flex-col items-center border border-cyan-200/10 bg-white/[0.022] p-4 text-center backdrop-blur-xl transition duration-300 hover:border-cyan-200/25 hover:bg-cyan-300/[0.035] lg:items-start lg:text-left",
              children: [
                /* @__PURE__ */ jsx(
                  Icon,
                  {
                    size: 18,
                    className: "hero-feature-icon text-cyan-300"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-white", children: item.title }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs leading-5 text-slate-400", children: item.text })
              ]
            },
            item.title
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "hero-product-area relative z-10 mx-auto flex min-h-[350px] w-full max-w-[520px] flex-col items-center justify-center self-center sm:min-h-[430px] lg:min-h-[540px] lg:max-w-none", children: [
        /* @__PURE__ */ jsxs("div", { className: "hero-product-stage relative flex min-h-[350px] w-full items-center justify-center sm:min-h-[430px] lg:min-h-[540px]", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute h-[250px] w-[250px] rounded-full bg-cyan-400/10 blur-[90px] sm:h-[330px] sm:w-[330px] sm:blur-[100px]" }),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-[42px] h-[46px] w-[210px] rounded-full bg-black/45 blur-2xl sm:bottom-[54px] sm:h-[58px] sm:w-[290px]" }),
          /* @__PURE__ */ jsx("div", { className: "absolute h-[280px] w-[205px] rotate-[7deg] border border-cyan-200/10 bg-white/[0.012] sm:h-[390px] sm:w-[280px]" }),
          /* @__PURE__ */ jsx("div", { className: "absolute h-[245px] w-[180px] rotate-[-5deg] border border-cyan-300/12 bg-cyan-300/[0.018] sm:h-[330px] sm:w-[240px]" }),
          /* @__PURE__ */ jsx("div", { className: "hero-product-float relative z-20", children: /* @__PURE__ */ jsx(
            "img",
            {
              src: bottleSrc,
              alt: "Research compound bottle",
              className: "hero-product-img w-[220px] select-none drop-shadow-[0_32px_50px_rgba(0,0,0,0.58)] sm:w-[300px] lg:w-[345px]",
              draggable: "false"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: "hero-tag-one absolute right-[8%] top-[18%] hidden border border-cyan-200/10 bg-[#020617]/70 px-4 py-3 backdrop-blur-xl lg:block", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/65", children: "Batch System" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-bold text-white/82", children: "COA linked products" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "hero-tag-two absolute bottom-[17%] left-[7%] hidden border border-cyan-200/10 bg-[#020617]/70 px-4 py-3 backdrop-blur-xl lg:block", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/65", children: "Catalog Flow" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-bold text-white/82", children: "Find, verify, order" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "hero-dot absolute left-[18%] top-[30%] h-2 w-2 rounded-full bg-cyan-300 sm:left-[20%] sm:top-[33%]" }),
          /* @__PURE__ */ jsx("span", { className: "hero-dot hero-dot-delay absolute bottom-[28%] right-[18%] h-2 w-2 rounded-full bg-white/60 sm:right-[22%] sm:bottom-[30%]" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "hero-mobile-feature-row grid w-full max-w-[370px] grid-cols-3 gap-2 lg:hidden", children: featureCards.map((item) => {
          const Icon = item.icon;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "hero-mobile-feature-card flex flex-col items-center justify-center border border-cyan-200/10 bg-white/[0.022] text-center backdrop-blur-xl",
              children: [
                /* @__PURE__ */ jsx(Icon, { size: 16, className: "text-cyan-300" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-[8.5px] font-black uppercase leading-none tracking-[0.1em] text-white", children: item.title }),
                /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-[9px] leading-[1.35] text-slate-400", children: item.text })
              ]
            },
            item.title
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .hero-product-float {
          animation: heroProductFloat 5.8s ease-in-out infinite;
        }

        .hero-tag-one {
          animation: heroTagFloatOne 6.2s ease-in-out infinite;
        }

        .hero-tag-two {
          animation: heroTagFloatTwo 6.8s ease-in-out infinite;
        }

        .hero-dot {
          animation: heroDotPulse 3.8s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.65);
        }

        .hero-dot-delay {
          animation-delay: 1.1s;
        }

        @keyframes heroProductFloat {
          0%, 100% {
            transform: translateY(0) rotate(-1.5deg);
          }

          50% {
            transform: translateY(-14px) rotate(1.5deg);
          }
        }

        @keyframes heroTagFloatOne {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes heroTagFloatTwo {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(10px);
          }
        }

        @keyframes heroDotPulse {
          0%, 100% {
            opacity: .42;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.28);
          }
        }

        @media (max-width: 640px) {
          .hero-inner {
            padding-top: 54px !important;
            gap: 2px !important;
          }

          .hero-title {
            max-width: 610px !important;
            font-size: clamp(42px, 10.8vw, 50px) !important;
            line-height: 0.9 !important;
            letter-spacing: -0.085em !important;
          }

          .hero-title-line {
            display: block;
            white-space: nowrap;
          }

          .hero-mobile-actions {
            width: auto !important;
            max-width: none !important;
            flex-direction: row !important;
            align-items: center;
            gap: 10px !important;
            margin-top: 24px !important;
          }

          .hero-mobile-actions a {
            width: auto !important;
            min-width: 128px;
            min-height: 44px;
            border-radius: 999px !important;
            padding: 0 17px !important;
            font-size: 9px !important;
            letter-spacing: 0.14em !important;
          }

          .hero-product-area {
            min-height: 0 !important;
            margin-top: 8px !important;
          }

          .hero-product-stage {
            min-height: 250px !important;
          }

          .hero-product-img {
            width: 178px !important;
          }

          .hero-product-stage > div:nth-child(1) {
            width: 220px !important;
            height: 220px !important;
            filter: blur(76px);
          }

          .hero-product-stage > div:nth-child(2) {
            bottom: 30px !important;
            width: 176px !important;
            height: 40px !important;
          }

          .hero-product-stage > div:nth-child(3) {
            width: 176px !important;
            height: 238px !important;
          }

          .hero-product-stage > div:nth-child(4) {
            width: 154px !important;
            height: 210px !important;
          }

          .hero-mobile-feature-row {
            margin-top: 18px !important;
          }

          .hero-mobile-feature-card {
            min-height: 92px;
            border-radius: 19px;
            padding: 10px 7px;
            background:
              linear-gradient(145deg, rgba(103, 232, 249, 0.055), rgba(255,255,255,0.018)),
              rgba(2, 6, 23, 0.58) !important;
            box-shadow: 0 14px 38px rgba(0, 0, 0, 0.16);
          }

          .hero-product-float {
            animation-duration: 6.4s;
          }

          @keyframes heroProductFloat {
            0%, 100% {
              transform: translateY(0) rotate(-1deg);
            }

            50% {
              transform: translateY(-9px) rotate(1deg);
            }
          }
        }

        @media (max-width: 420px) {
          .hero-title {
            font-size: clamp(39px, 10.3vw, 46px) !important;
          }

          .hero-mobile-actions a {
            min-width: 122px;
            padding: 0 14px !important;
            font-size: 8.6px !important;
          }

          .hero-mobile-feature-row {
            max-width: 350px !important;
            gap: 7px !important;
          }

          .hero-mobile-feature-card {
            min-height: 88px;
            padding-inline: 6px;
          }

          .hero-mobile-feature-card p:last-of-type {
            font-size: 8.5px;
          }
        }
      ` })
  ] });
}

function formatPrice(price) {
  if (!price) return "View";
  const number = Number(price);
  if (Number.isNaN(number)) return `$${price}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(number);
}
function getImage(product) {
  return product.images?.[0]?.src || "/tarro.png";
}
function ProductCatalog({ products = [] }) {
  const { addToCart } = useCart();
  const visibleProducts = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);
  if (!products || products.length === 0) {
    return /* @__PURE__ */ jsx("section", { className: "relative py-14 text-white sm:py-20", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-400", children: "No products available." }) }) });
  }
  return /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden py-12 text-white sm:py-16 lg:py-20", children: [
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-5 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex flex-col items-center gap-5 text-center sm:mb-10 lg:mb-12 lg:flex-row lg:items-end lg:justify-between lg:text-left", children: [
        /* @__PURE__ */ jsxs("div", { className: "w-full lg:max-w-[720px]", children: [
          /* @__PURE__ */ jsxs("div", { className: "mx-auto mb-4 inline-flex items-center justify-center gap-3 lg:mx-0 lg:mb-5 lg:justify-start", children: [
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" }),
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]", children: "High Demand" })
          ] }),
          /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-3xl sm:text-[50px] lg:mx-0 lg:max-w-[720px] lg:text-[58px] lg:leading-[1.04] lg:tracking-[-0.05em]", children: [
            "Compounds in",
            /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85", children: "high demand." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "/products",
            className: "group hidden w-fit items-center gap-3 rounded-full border border-cyan-200/15 bg-white/[0.025] px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur-xl transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.06] hover:text-white lg:inline-flex",
            children: [
              "View Catalog",
              /* @__PURE__ */ jsx(
                ArrowRight,
                {
                  size: 15,
                  className: "transition group-hover:translate-x-1"
                }
              )
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4", children: visibleProducts.map((product, index) => {
        const image = getImage(product);
        const isInStock = product.stock_status === "instock";
        return /* @__PURE__ */ jsxs(
          "article",
          {
            className: "group relative overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.025] p-2.5 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-white/[0.04] sm:rounded-[2rem] sm:p-4",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "relative flex h-[170px] items-center justify-center overflow-hidden rounded-[1rem] bg-[linear-gradient(145deg,rgba(3,12,24,0.98),rgba(8,38,56,0.78),rgba(4,14,28,0.96))] sm:h-[260px] sm:rounded-[1.5rem] lg:h-[300px]", children: [
                /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(103,232,249,0.2),transparent_48%)]" }),
                /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.06),transparent_28%)]" }),
                /* @__PURE__ */ jsx("div", { className: "absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-300/12 blur-[60px] sm:-right-16 sm:-top-16 sm:h-48 sm:w-48 sm:blur-[70px]" }),
                /* @__PURE__ */ jsx("div", { className: "absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-blue-500/10 blur-[70px] sm:-left-16 sm:h-48 sm:w-48 sm:blur-[80px]" }),
                /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 sm:h-48 sm:w-48" }),
                /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/5 sm:h-32 sm:w-32" }),
                /* @__PURE__ */ jsx("div", { className: "absolute bottom-6 h-8 w-28 rounded-full bg-black/45 blur-2xl sm:bottom-10 sm:h-10 sm:w-40" }),
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: image,
                    alt: product.name,
                    draggable: "false",
                    className: "product-image relative z-10 max-h-[132px] w-auto object-contain drop-shadow-[0_28px_42px_rgba(0,0,0,0.5)] transition duration-500 group-hover:scale-[1.04] sm:max-h-[220px] lg:max-h-[245px]",
                    style: { animationDelay: `${index * 0.22}s` }
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "px-0.5 pb-1 pt-3 sm:px-1 sm:pt-5", children: [
                /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center justify-between gap-2 sm:mb-3", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[7.5px] font-black uppercase tracking-[0.12em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.18em]", children: "Featured" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[7.5px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: isInStock ? "Available" : "Unavailable" })
                ] }),
                /* @__PURE__ */ jsx("h3", { className: "line-clamp-2 min-h-[38px] text-[15px] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:min-h-0 sm:text-[22px] lg:text-[24px]", children: product.name }),
                /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-end justify-between gap-2 border-t border-cyan-200/10 pt-3 sm:mt-4 sm:pt-4", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "text-[7.5px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Price" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-[20px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[28px] lg:text-[32px]", children: formatPrice(product.price) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "a",
                    {
                      href: `/products/${product.slug}`,
                      className: "mb-0.5 text-[7.5px] font-black uppercase tracking-[0.14em] text-cyan-200/65 transition hover:text-cyan-100 sm:mb-1 sm:text-[10px] sm:tracking-[0.18em]",
                      children: "Details"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    disabled: !isInStock,
                    onClick: () => isInStock && addToCart(product),
                    className: `mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.14em] transition duration-300 sm:mt-5 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-[11px] sm:tracking-[0.2em] ${isInStock ? "bg-cyan-300 text-slate-950 shadow-[0_16px_38px_rgba(34,211,238,0.16)] hover:-translate-y-0.5 hover:bg-white" : "cursor-not-allowed border border-cyan-200/10 bg-white/[0.035] text-slate-500"}`,
                    children: [
                      /* @__PURE__ */ jsx(ShoppingBag, { size: 13, className: "sm:hidden" }),
                      /* @__PURE__ */ jsx(ShoppingBag, { size: 15, className: "hidden sm:block" }),
                      isInStock ? "Add" : "Out"
                    ]
                  }
                )
              ] })
            ]
          },
          product.id
        );
      }) }),
      /* @__PURE__ */ jsx("div", { className: "mt-7 flex justify-center lg:hidden", children: /* @__PURE__ */ jsxs(
        "a",
        {
          href: "/products",
          className: "group inline-flex items-center justify-center gap-3 rounded-full border border-cyan-200/15 bg-white/[0.025] px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/80 backdrop-blur-xl transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.06] hover:text-white",
          children: [
            "View Catalog",
            /* @__PURE__ */ jsx(
              ArrowRight,
              {
                size: 15,
                className: "transition group-hover:translate-x-1"
              }
            )
          ]
        }
      ) }),
      /* @__PURE__ */ jsx("p", { className: "mt-6 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:mt-7 sm:text-[10px] sm:tracking-[0.18em]", children: "Laboratory research catalog only." })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .product-image {
          animation: floatProduct 5.8s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes floatProduct {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-12px);
          }
        }

        @media (max-width: 640px) {
          .product-image {
            animation-duration: 6.3s;
          }

          @keyframes floatProduct {
            0%, 100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-7px);
            }
          }
        }
      ` })
  ] });
}

const items = [
  {
    icon: FileCheck2,
    title: "Batch records",
    text: "COA references and batch documentation kept easy to find."
  },
  {
    icon: FlaskConical,
    title: "Scientific catalog",
    text: "Structured product discovery for laboratory research only."
  },
  {
    icon: PackageCheck,
    title: "Clean fulfillment",
    text: "A smoother flow for browsing, pack building, and order handling."
  }
];
function TrustSection() {
  return /* @__PURE__ */ jsx("section", { className: "relative py-10 text-white sm:py-14 lg:py-16 xl:py-20", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-7xl px-5 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden border-cyan-200/10 bg-transparent lg:rounded-[2rem] lg:border lg:bg-white/[0.018] lg:backdrop-blur-xl", children: [
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-24 -top-24 hidden h-64 w-64 rounded-full bg-cyan-300/10 blur-[95px] lg:block lg:-right-32 lg:-top-32 lg:h-80 lg:w-80 lg:blur-[110px]" }),
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute left-0 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent lg:block" }),
    /* @__PURE__ */ jsxs("div", { className: "relative grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[1.6rem] border border-cyan-200/10 bg-white/[0.018] p-5 text-center shadow-[0_24px_90px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-7 lg:rounded-none lg:border-0 lg:border-r lg:border-cyan-200/10 lg:bg-transparent lg:p-10 lg:text-left lg:shadow-none", children: [
        /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/[0.08] blur-[80px] lg:hidden" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 lg:mb-5 lg:justify-start", children: [
            /* @__PURE__ */ jsx("span", { className: "h-px w-7 bg-cyan-300/70 lg:w-8" }),
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-200/65 lg:text-[10px] lg:tracking-[0.3em]", children: "Research Standard" }),
            /* @__PURE__ */ jsx("span", { className: "h-px w-7 bg-cyan-300/70 lg:hidden" })
          ] }),
          /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-[360px] text-[35px] font-semibold leading-[0.95] tracking-[-0.065em] text-white sm:max-w-xl sm:text-[40px] lg:mx-0 lg:text-[48px] lg:leading-[1.08] lg:tracking-[-0.045em]", children: [
            "Built for clarity,",
            /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85", children: "not for claims." })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mx-auto mt-4 max-w-[350px] text-[13.5px] leading-7 text-slate-300/68 sm:max-w-lg sm:text-[15px] sm:leading-8 lg:mx-0", children: "A cleaner catalog experience focused on documentation, batch visibility, and responsible scientific presentation." }),
          /* @__PURE__ */ jsx("div", { className: "mx-auto mt-5 max-w-[370px] rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left lg:mx-0 lg:mt-8 lg:max-w-none", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200 lg:h-auto lg:w-auto lg:border-0 lg:bg-transparent", children: /* @__PURE__ */ jsx(ShieldCheck, { size: 18 }) }),
            /* @__PURE__ */ jsx("p", { className: "text-[9.5px] font-bold uppercase leading-5 tracking-[0.11em] text-slate-400 sm:text-xs sm:leading-6 sm:tracking-[0.16em]", children: "Laboratory research use only. Not for human use, animal use, diagnostic use, therapeutic use, or clinical application." })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-3 lg:divide-y lg:divide-cyan-200/10 lg:gap-0", children: items.map((item, index) => {
        const Icon = item.icon;
        return /* @__PURE__ */ jsxs(
          "article",
          {
            className: "group relative overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#020617]/42 p-4 text-left shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-xl transition duration-300 hover:border-cyan-200/20 hover:bg-cyan-300/[0.035] sm:p-5 lg:grid lg:rounded-none lg:border-0 lg:bg-transparent lg:p-8 lg:shadow-none lg:hover:bg-cyan-300/[0.035] lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-5",
            children: [
              /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-300/[0.055] blur-3xl lg:hidden" }),
              /* @__PURE__ */ jsxs("div", { className: "relative flex items-start gap-4 lg:contents", children: [
                /* @__PURE__ */ jsxs("div", { className: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.045] text-cyan-200 transition duration-300 group-hover:border-cyan-200/25 group-hover:bg-cyan-300/[0.08] lg:h-12 lg:w-12", children: [
                  /* @__PURE__ */ jsx(Icon, { size: 19, className: "lg:hidden" }),
                  /* @__PURE__ */ jsx(Icon, { size: 20, className: "hidden lg:block" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsxs("div", { className: "mb-1.5 flex items-center gap-2 lg:mb-2 lg:block", children: [
                    /* @__PURE__ */ jsxs("p", { className: "text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/45 lg:text-[10px] lg:tracking-[0.24em]", children: [
                      "0",
                      index + 1
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "h-px flex-1 bg-cyan-200/10 lg:hidden" })
                  ] }),
                  /* @__PURE__ */ jsx("h3", { className: "text-[16px] font-semibold tracking-[-0.025em] text-white lg:text-lg", children: item.title }),
                  /* @__PURE__ */ jsx("p", { className: "mt-1.5 max-w-xl text-[12.5px] leading-6 text-slate-400 lg:mt-2 lg:text-sm lg:leading-7", children: item.text })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "hidden h-px w-14 bg-gradient-to-r from-cyan-300/35 to-transparent lg:block" })
              ] })
            ]
          },
          item.title
        );
      }) })
    ] })
  ] }) }) });
}

const steps = [
  {
    label: "Create account",
    text: "Sign in before checkout."
  },
  {
    label: "Place order",
    text: "Eligible orders earn points."
  },
  {
    label: "Track rewards",
    text: "View everything in your portal."
  }
];
function RewardsProgram() {
  return /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-cyan-300/8 blur-[140px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 right-[-10%] h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 md:justify-start", children: [
          /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-[0.34em] text-cyan-200/65", children: "Rewards Program" })
        ] }),
        /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-4xl text-[38px] font-semibold leading-[0.94] tracking-[-0.07em] text-white sm:text-[48px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]", children: [
          "Turn every eligible order",
          /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent", children: "into rewards." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-xl text-[14px] leading-7 text-slate-300/65 md:mx-0", children: "Customers who create an account before checkout can earn points, track recent orders, and manage rewards from one clean portal." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative min-h-[390px] overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#05111d] p-5 shadow-[0_28px_110px_rgba(0,0,0,0.28)] sm:p-6 lg:p-7", children: [
          /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(103,232,249,0.16),transparent_34%),radial-gradient(circle_at_25%_85%,rgba(59,130,246,0.14),transparent_34%)]" }),
            /* @__PURE__ */ jsx("div", { className: "absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" }),
            /* @__PURE__ */ jsx("div", { className: "absolute -right-28 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-[110px]" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative z-10 flex h-full flex-col", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/60", children: "Client Rewards" }),
                /* @__PURE__ */ jsx("h3", { className: "mt-3 max-w-sm text-[26px] font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-[34px]", children: "A cleaner way to reward returning customers." })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100", children: /* @__PURE__ */ jsx(Sparkles, { size: 22 }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative mt-6 flex flex-1 items-center justify-center", children: [
              /* @__PURE__ */ jsx("div", { className: "absolute h-52 w-52 rounded-full bg-cyan-300/10 blur-[80px]" }),
              /* @__PURE__ */ jsx("div", { className: "rewards-float-wrap relative w-full max-w-[330px]", children: /* @__PURE__ */ jsx("div", { className: "rewards-float-card relative rotate-[-2deg] overflow-hidden rounded-[1.7rem] border border-cyan-200/15 bg-[linear-gradient(145deg,rgba(236,254,255,0.12),rgba(255,255,255,0.035),rgba(103,232,249,0.09))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-500 hover:rotate-0 hover:scale-[1.015]", children: /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950", children: /* @__PURE__ */ jsx(CreditCard, { size: 18 }) }),
                  /* @__PURE__ */ jsx("span", { className: "rounded-full border border-cyan-200/15 bg-[#020617]/45 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100", children: "Active" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mt-7", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-100/60", children: "Rewards Balance" }),
                  /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-end gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[50px] font-semibold leading-none tracking-[-0.08em] text-white", children: "1,240" }),
                    /* @__PURE__ */ jsx("span", { className: "pb-2 text-base font-semibold text-cyan-100/80", children: "pts" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mt-6 grid grid-cols-3 gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/55 p-2.5", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.16em] text-slate-500", children: "Rule" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-white", children: "$1 = 1pt" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/55 p-2.5", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.16em] text-slate-500", children: "Recent" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-white", children: "+30" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/55 p-2.5", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.16em] text-slate-500", children: "Portal" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-semibold text-cyan-100", children: "Ready" })
                  ] })
                ] })
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "relative z-10 mt-5 text-[10px] font-bold uppercase leading-5 tracking-[0.16em] text-slate-500", children: "Account required before checkout. Guest orders are not eligible for rewards after purchase." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.018] p-6 backdrop-blur-xl sm:p-7 lg:p-8", children: [
            /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute right-[-10%] top-[-30%] h-72 w-72 rounded-full bg-cyan-300/10 blur-[110px]" }),
            /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
              /* @__PURE__ */ jsx("div", { className: "mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.06] text-cyan-200", children: /* @__PURE__ */ jsx(UserRoundCheck, { size: 22 }) }),
              /* @__PURE__ */ jsx("h3", { className: "max-w-2xl text-[28px] font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-[36px]", children: "Reward the customers who come back." }),
              /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl text-[14px] leading-7 text-slate-300/65", children: "The rewards portal helps customers see their balance, recent orders, and points activity without contacting support for basic account questions." }),
              /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-col gap-3 sm:flex-row", children: [
                /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: "/register",
                    className: "group inline-flex items-center justify-center gap-3 rounded-2xl border border-cyan-200/20 bg-cyan-300 px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_28px_rgba(103,232,249,0.18)] transition hover:border-cyan-100/35 hover:bg-cyan-200 hover:shadow-[0_0_38px_rgba(103,232,249,0.28)]",
                    children: [
                      "Create account",
                      /* @__PURE__ */ jsx(
                        ArrowRight,
                        {
                          size: 15,
                          className: "transition group-hover:translate-x-0.5"
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "/account",
                    className: "inline-flex items-center justify-center rounded-2xl border border-cyan-200/12 bg-white/[0.025] px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/75 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white",
                    children: "View portal"
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#07111d]/80 p-5 sm:p-6", children: [
            /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" }),
            /* @__PURE__ */ jsxs("div", { className: "mb-5 flex items-center justify-between gap-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/55", children: "How it works" }),
                /* @__PURE__ */ jsx("h3", { className: "mt-1 text-xl font-semibold tracking-[-0.04em] text-white", children: "Simple reward flow" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "hidden items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:flex", children: [
                /* @__PURE__ */ jsx(Clock3, { size: 13 }),
                "Before checkout"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "relative grid gap-2.5", children: steps.map((step, index) => /* @__PURE__ */ jsx(
              "article",
              {
                className: "group relative rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3.5 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]",
                children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
                  /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.055] text-[9px] font-black text-cyan-100", children: String(index + 1).padStart(2, "0") }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold tracking-[-0.02em] text-white", children: step.label }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm leading-5 text-slate-400", children: step.text })
                  ] })
                ] })
              },
              step.label
            )) }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3.5", children: [
              /* @__PURE__ */ jsx(
                BadgeCheck,
                {
                  size: 17,
                  className: "mt-0.5 shrink-0 text-cyan-200"
                }
              ),
              /* @__PURE__ */ jsx("p", { className: "text-xs leading-5 text-slate-400", children: "Eligible orders only. Rewards are calculated from completed or processing orders connected to a customer account." })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .rewards-float-wrap {
          animation: rewardsFloat 4.6s ease-in-out infinite;
          transform-origin: center;
          will-change: transform;
        }

        .rewards-float-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(165, 243, 252, 0.2),
            transparent
          );
          opacity: 0;
          transform: translateX(-60%);
          animation: rewardsShine 5.8s ease-in-out infinite;
        }

        @keyframes rewardsFloat {
          0% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -14px, 0);
          }

          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes rewardsShine {
          0%,
          55% {
            opacity: 0;
            transform: translateX(-60%);
          }

          70% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: translateX(60%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rewards-float-wrap,
          .rewards-float-card::before {
            animation: none;
          }
        }
      ` })
  ] });
}

function COALookupSection() {
  const [query, setQuery] = useState("");
  const [openHistoryId, setOpenHistoryId] = useState(null);
  const filteredRecords = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return coaRecords;
    }
    return coaRecords.filter((record) => {
      const versionText = [
        record.currentCoa?.version,
        record.currentCoa?.label,
        record.currentCoa?.date,
        record.currentCoa?.purity,
        record.currentCoa?.tested,
        ...(record.history || []).flatMap((version) => [
          version.version,
          version.label,
          version.date,
          version.purity,
          version.tested
        ])
      ];
      const searchable = [
        record.productName,
        record.compound,
        record.batch,
        record.purity,
        record.tested,
        record.status,
        record.date,
        ...versionText
      ].join(" ").toLowerCase();
      return searchable.includes(cleanQuery);
    });
  }, [query]);
  return /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-[8%] top-16 h-72 w-72 rounded-full bg-cyan-300/8 blur-[130px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute right-[-10%] bottom-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[130px]" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 md:justify-start", children: [
          /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" }),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]", children: "COA Documentation" })
        ] }),
        /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-[420px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[48px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]", children: [
          "Search batch records",
          /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent", children: "with clarity." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-[14px] md:mx-0", children: "Quickly locate available COA references by product name, batch number, compound type, testing method, or document version." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-5 lg:grid-cols-[0.9fr_1.1fr]", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-[#05111d] p-5 shadow-[0_28px_110px_rgba(0,0,0,0.25)] sm:p-6 lg:p-7", children: [
          /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(103,232,249,0.14),transparent_34%),radial-gradient(circle_at_20%_90%,rgba(59,130,246,0.12),transparent_32%)]" }),
            /* @__PURE__ */ jsx("div", { className: "absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-start justify-between gap-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/60", children: "Batch Lookup" }),
                /* @__PURE__ */ jsx("h3", { className: "mt-3 max-w-sm text-[28px] font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-[38px]", children: "Find the right document faster." })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100", children: /* @__PURE__ */ jsx(FileSearch, { size: 22 }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(
                Search,
                {
                  size: 18,
                  className: "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/65"
                }
              ),
              /* @__PURE__ */ jsx(
                "input",
                {
                  value: query,
                  onChange: (event) => setQuery(event.target.value),
                  type: "search",
                  placeholder: "Search product, batch, version, purity, method...",
                  className: "w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 py-4 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#020617]/85"
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: ["BPC", "TB", "GHK", "HPLC", "v1", "v2", "99"].map((item) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setQuery(item),
                className: "rounded-full border border-cyan-200/10 bg-white/[0.025] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-cyan-100",
                children: item
              },
              item
            )) }),
            /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-3", children: [
              /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
                /* @__PURE__ */ jsx(
                  ShieldCheck,
                  {
                    size: 17,
                    className: "mt-0.5 shrink-0 text-cyan-200"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "text-xs leading-6 text-slate-400", children: "Documents shown here are intended to support laboratory research catalog transparency, batch reference access, and historical COA visibility." })
              ] }) }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.16em] text-slate-500", children: "Records" }),
                  /* @__PURE__ */ jsx("p", { className: "mt-1 text-xl font-semibold text-white", children: coaRecords.length })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.16em] text-slate-500", children: "Found" }),
                  /* @__PURE__ */ jsx("p", { className: "mt-1 text-xl font-semibold text-white", children: filteredRecords.length })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-3", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.16em] text-slate-500", children: "History" }),
                  /* @__PURE__ */ jsx("p", { className: "mt-1 text-xl font-semibold text-cyan-100", children: "Live" })
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[2rem] border border-cyan-200/10 bg-white/[0.018] p-5 backdrop-blur-xl sm:p-6 lg:p-7", children: [
          /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute right-[-10%] top-[-30%] h-80 w-80 rounded-full bg-cyan-300/10 blur-[120px]" }),
          /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-5 flex items-center justify-between gap-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/55", children: "Available Records" }),
                /* @__PURE__ */ jsx("h3", { className: "mt-1 text-2xl font-semibold tracking-[-0.04em] text-white", children: "COA results" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "hidden items-center gap-2 rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:flex", children: [
                /* @__PURE__ */ jsx(FlaskConical, { size: 13 }),
                "Batch docs"
              ] })
            ] }),
            filteredRecords.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex min-h-[320px] flex-col items-center justify-center rounded-[1.5rem] border border-cyan-200/10 bg-[#020617]/45 p-8 text-center", children: [
              /* @__PURE__ */ jsx("div", { className: "grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200", children: /* @__PURE__ */ jsx(Search, { size: 24 }) }),
              /* @__PURE__ */ jsx("h4", { className: "mt-5 text-xl font-semibold tracking-[-0.04em] text-white", children: "No records found" }),
              /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-sm text-sm leading-6 text-slate-400", children: "Try searching by product name, batch number, document version, testing method, or contact support for documentation help." })
            ] }) : /* @__PURE__ */ jsx("div", { className: "max-h-[560px] space-y-3 overflow-y-auto pr-1", children: filteredRecords.map((record) => {
              const currentCoa = record.currentCoa || {
                version: "v1",
                label: "Current COA",
                date: record.date,
                purity: record.purity,
                tested: record.tested,
                fileUrl: record.fileUrl
              };
              const history = record.history || [];
              const hasHistory = history.length > 0;
              const isHistoryOpen = openHistoryId === record.id;
              return /* @__PURE__ */ jsxs(
                "article",
                {
                  className: "overflow-hidden rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/42 transition hover:border-cyan-200/20 hover:bg-[#061625]/60",
                  children: [
                    /* @__PURE__ */ jsx("div", { className: "p-4 sm:p-5", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [
                      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                        /* @__PURE__ */ jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-2", children: [
                          /* @__PURE__ */ jsx("span", { className: "rounded-full border border-cyan-200/10 bg-cyan-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100", children: record.batch }),
                          /* @__PURE__ */ jsx("span", { className: "rounded-full border border-emerald-300/10 bg-emerald-300/[0.055] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/80", children: record.status }),
                          /* @__PURE__ */ jsx("span", { className: "rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-300", children: currentCoa.version })
                        ] }),
                        /* @__PURE__ */ jsx("h4", { className: "truncate text-[22px] font-semibold tracking-[-0.045em] text-white", children: record.productName }),
                        /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: [
                          record.compound,
                          " · ",
                          currentCoa.tested,
                          " · Purity",
                          " ",
                          /* @__PURE__ */ jsx("span", { className: "text-cyan-100/80", children: currentCoa.purity })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-x-3 gap-y-2", children: [
                          /* @__PURE__ */ jsxs("p", { className: "text-xs leading-5 text-slate-500", children: [
                            "Current document: ",
                            currentCoa.date,
                            " ·",
                            " ",
                            currentCoa.label
                          ] }),
                          hasHistory && /* @__PURE__ */ jsxs(
                            "button",
                            {
                              type: "button",
                              onClick: () => setOpenHistoryId(
                                isHistoryOpen ? null : record.id
                              ),
                              className: "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/55 transition hover:text-cyan-100",
                              children: [
                                /* @__PURE__ */ jsx(History, { size: 12 }),
                                isHistoryOpen ? "Hide history" : `${history.length} archived`,
                                /* @__PURE__ */ jsx(
                                  ChevronDown,
                                  {
                                    size: 12,
                                    className: `transition duration-300 ${isHistoryOpen ? "rotate-180" : ""}`
                                  }
                                )
                              ]
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxs(
                        "a",
                        {
                          href: currentCoa.fileUrl,
                          target: "_blank",
                          rel: "noreferrer",
                          className: "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-300/[0.09] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.16] hover:text-white",
                          children: [
                            "Latest COA",
                            /* @__PURE__ */ jsx(ArrowRight, { size: 13 })
                          ]
                        }
                      )
                    ] }) }),
                    hasHistory && /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: `grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHistoryOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`,
                        children: /* @__PURE__ */ jsx("div", { className: "overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "border-t border-cyan-200/10 bg-[#030b14]/58 px-4 py-3 sm:px-5", children: [
                          /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                              /* @__PURE__ */ jsx(
                                FileText,
                                {
                                  size: 13,
                                  className: "text-cyan-200/75"
                                }
                              ),
                              /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/45", children: "Archived COA versions" })
                            ] }),
                            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-600", children: [
                              history.length,
                              " document",
                              history.length === 1 ? "" : "s"
                            ] })
                          ] }),
                          /* @__PURE__ */ jsx("div", { className: "space-y-2", children: history.map((version) => /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: "flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.014] px-3 py-2.5 transition hover:border-cyan-200/15 hover:bg-cyan-300/[0.025] sm:flex-row sm:items-center sm:justify-between",
                              children: [
                                /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                                  /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                                    /* @__PURE__ */ jsx("span", { className: "rounded-full bg-cyan-300/[0.07] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100", children: version.version }),
                                    /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-white/85", children: version.label })
                                  ] }),
                                  /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[11px] leading-5 text-slate-500", children: [
                                    version.date,
                                    " · ",
                                    version.tested,
                                    " · Purity ",
                                    version.purity
                                  ] })
                                ] }),
                                /* @__PURE__ */ jsxs(
                                  "a",
                                  {
                                    href: version.fileUrl,
                                    target: "_blank",
                                    rel: "noreferrer",
                                    className: "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200/10 bg-cyan-300/[0.045] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/80 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.1] hover:text-white",
                                    children: [
                                      "Open PDF",
                                      /* @__PURE__ */ jsx(ArrowRight, { size: 11 })
                                    ]
                                  }
                                )
                              ]
                            },
                            `${record.id}-${version.version}`
                          )) })
                        ] }) })
                      }
                    )
                  ]
                },
                record.id
              );
            }) }),
            /* @__PURE__ */ jsxs("div", { className: "mt-5 flex gap-3 rounded-2xl border border-cyan-200/10 bg-white/[0.018] p-4", children: [
              /* @__PURE__ */ jsx(
                BadgeCheck,
                {
                  size: 17,
                  className: "mt-0.5 shrink-0 text-cyan-200"
                }
              ),
              /* @__PURE__ */ jsx("p", { className: "text-xs leading-5 text-slate-400", children: "Missing a document? Contact support with the product name and batch number so the team can help locate the right COA." })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}

const fallbackCategories = [
  {
    name: "Research Peptides",
    slug: "research-peptides",
    count: 1,
    description: "Core catalog",
    icon: FlaskConical
  },
  {
    name: "Research Blends",
    slug: "research-blends",
    count: 9,
    description: "Stacked formulas",
    icon: Layers3
  },
  {
    name: "Metabolic Research",
    slug: "metabolic-research",
    count: 2,
    description: "Metabolic focus",
    icon: Sparkles
  },
  {
    name: "Longevity & Other",
    slug: "longevity-other",
    count: 11,
    description: "Extended catalog",
    icon: ShieldPlus
  },
  {
    name: "Healing & Recovery",
    slug: "healing-recovery",
    count: 3,
    description: "Recovery research",
    icon: Beaker
  },
  {
    name: "Cosmetic & Skin",
    slug: "cosmetic-skin",
    count: 8,
    description: "Skin research",
    icon: WandSparkles
  },
  {
    name: "Growth Hormone",
    slug: "growth-hormone",
    count: 3,
    description: "GH catalog",
    icon: Syringe
  },
  {
    name: "Bacteriostatic Water",
    slug: "bacteriostatic-water",
    count: 3,
    description: "Support items",
    icon: Droplets
  },
  {
    name: "Accessories",
    slug: "accessories",
    count: 8,
    description: "Catalog tools",
    icon: PackageCheck
  }
];
function formatCount(count) {
  const total = Number(count || 0);
  return `${total} ${total === 1 ? "item" : "items"}`;
}
function ShopByCategorySection({
  categories = fallbackCategories,
  eyebrow = "Catalog sections",
  titleTop = "Browse research",
  titleBottom = "by category.",
  subtitle = "Explore products by research focus, support items, and specialized catalog groups."
}) {
  const normalizedCategories = categories.map((category) => {
    const fallback = fallbackCategories.find(
      (item) => item.name === category.name
    );
    return {
      ...category,
      description: category.description || fallback?.description || "Catalog section",
      icon: category.icon || fallback?.icon || FlaskConical,
      href: category.href || `/shop?category=${category.slug}`
    };
  });
  return /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden px-6 py-12 text-white sm:py-14 lg:py-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-[8%] top-16 h-72 w-72 rounded-full bg-cyan-300/8 blur-[130px]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute right-[-10%] bottom-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[130px]" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "mx-auto mb-9 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 md:justify-start", children: [
          /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]" }),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]", children: eyebrow })
        ] }),
        /* @__PURE__ */ jsxs("h2", { className: "mx-auto max-w-[420px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[48px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]", children: [
          titleTop,
          /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent", children: titleBottom })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-[14px] md:mx-0", children: subtitle })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4", children: normalizedCategories.map((category, index) => {
        const Icon = category.icon;
        return /* @__PURE__ */ jsxs(
          "a",
          {
            href: category.href,
            className: "group relative overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#071421]/72 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-[#0a1b2b]/82 sm:rounded-[1.55rem] sm:p-5",
            children: [
              /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(103,232,249,0.13),transparent_42%)] opacity-70 transition group-hover:opacity-100" }),
              /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-300/8 blur-2xl transition group-hover:bg-cyan-300/14" }),
              /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
                /* @__PURE__ */ jsxs("div", { className: "mb-5 flex items-start justify-between gap-3", children: [
                  /* @__PURE__ */ jsx("div", { className: "grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200 transition group-hover:border-cyan-200/25 group-hover:bg-cyan-300/[0.1] sm:h-12 sm:w-12", children: /* @__PURE__ */ jsx(Icon, { size: 20 }) }),
                  /* @__PURE__ */ jsx("span", { className: "grid h-9 w-9 place-items-center rounded-full border border-cyan-200/10 bg-white/[0.03] text-cyan-100/55 transition group-hover:border-cyan-200/25 group-hover:bg-cyan-300/[0.09] group-hover:text-cyan-100", children: /* @__PURE__ */ jsx(ArrowUpRight, { size: 15 }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
                  /* @__PURE__ */ jsx("p", { className: "mb-2 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-200/55 sm:text-[9px]", children: formatCount(category.count) }),
                  /* @__PURE__ */ jsx("h3", { className: "min-h-[38px] text-[16px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:min-h-[44px] sm:text-[20px]", children: category.name }),
                  /* @__PURE__ */ jsx("p", { className: "mt-2 truncate text-[12px] font-medium text-slate-400 sm:text-[13px]", children: category.description })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "h-px w-full bg-gradient-to-r from-cyan-200/18 via-cyan-200/6 to-transparent" }),
                /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center justify-between gap-3", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/62", children: "Explore" }),
                  /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-cyan-300/70 shadow-[0_0_14px_rgba(103,232,249,0.65)] transition group-hover:scale-125" })
                ] })
              ] })
            ]
          },
          `${category.slug}-${index}`
        );
      }) }),
      /* @__PURE__ */ jsx("p", { className: "mt-6 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:mt-7 md:text-left", children: "Laboratory research catalog only." })
    ] })
  ] });
}

function ShopExperience({ products = [] }) {
  return /* @__PURE__ */ jsxs(CartProvider, { children: [
    /* @__PURE__ */ jsx(SiteHeader, { logoSrc: "/TRANSPARENCIA-03.png", transparentOnTop: true }),
    /* @__PURE__ */ jsxs("main", { className: "pt-[118px]", children: [
      /* @__PURE__ */ jsx(Hero, { bottleSrc: "/tarro.png" }),
      /* @__PURE__ */ jsx(TrustSection, {}),
      /* @__PURE__ */ jsx(ProductCatalog, { products }),
      /* @__PURE__ */ jsx(RewardsProgram, {}),
      /* @__PURE__ */ jsx(COALookupSection, {}),
      /* @__PURE__ */ jsx(ShopByCategorySection, {}),
      /* @__PURE__ */ jsx(NewsletterSection, {}),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] }),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] });
}

const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Index;
  const WOO_URL = "https://labone.local/";
  const KEY = "ck_37e016ac24ece9120b1a17d1df405f3a5d4fd7c6";
  const SECRET = "cs_4d1a871a490c3ff20e752b091b4c7a25720c1ad1";
  let products = [];
  try {
    if (!WOO_URL || !KEY || !SECRET) ; else {
      const cleanUrl = WOO_URL.replace(/\/$/, "");
      const url = new URL(`${cleanUrl}/wp-json/wc/v3/products`);
      url.searchParams.set("per_page", "20");
      url.searchParams.set("status", "publish");
      url.searchParams.set("consumer_key", KEY);
      url.searchParams.set("consumer_secret", SECRET);
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Research Catalog Astro",
          Accept: "application/json"
        }
      });
      console.log(
        "WooCommerce URL:",
        url.toString().replace(KEY, "ck_hidden").replace(SECRET, "cs_hidden")
      );
      console.log("WooCommerce status:", response.status);
      if (response.ok) {
        products = await response.json();
        console.log("=== API SUCCESS === Productos encontrados:", products.length);
      } else {
        const errorText = await response.text();
        console.error("=== API ERROR ===", response.status, errorText);
      }
    }
  } catch (error) {
    console.error("=== CATCH ERROR ===:", error);
  }
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$MainLayout, { "title": "Research Compounds // Scientific Catalog", "description": "Research-focused catalog experience for laboratory-use compounds with documentation, COA access, and responsible scientific presentation." }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "ShopExperience", ShopExperience, { "products": products, "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/shop/ShopExperience.jsx", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/index.astro", void 0);
const $$file = "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

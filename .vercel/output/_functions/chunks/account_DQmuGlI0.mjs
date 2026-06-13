import { c as createComponent } from './astro-component_DYT6_DBd.mjs';
import 'piccolore';
import { p as renderComponent, t as renderTemplate } from './entrypoint_B96uVuTI.mjs';
import { a as CartProvider, S as SiteHeader, C as CartDrawer, $ as $$MainLayout } from './CartDrawer_q-YYixXG.mjs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useState, useMemo, useEffect } from 'react';
import { Loader2, BadgeCheck, PackageCheck, User, ArrowRight, Sparkles, LogOut, ShoppingBag, CircleDollarSign, ShieldCheck, Clock3, LayoutDashboard, Gift, ReceiptText } from 'lucide-react';

function formatMoney(value, currency = "USD") {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(number);
}
function formatDate(dateString) {
  if (!dateString) return "Pending date";
  const date = new Date(dateString.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
function normalizeStatus(status) {
  if (!status) return "Pending";
  return status.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
const dashboardTabs = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Home",
    icon: LayoutDashboard
  },
  {
    id: "personal",
    label: "Personal Info",
    shortLabel: "Info",
    icon: User
  },
  {
    id: "rewards",
    label: "Rewards",
    shortLabel: "Rewards",
    icon: Gift
  },
  {
    id: "orders",
    label: "Orders",
    shortLabel: "Orders",
    icon: ReceiptText
  }
];
function DashboardMenu({ activeTab, setActiveTab }) {
  return /* @__PURE__ */ jsx("div", { className: "mb-5 rounded-[1.45rem] border border-cyan-200/10 bg-[#020617]/38 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:mb-6 sm:rounded-[1.7rem]", children: /* @__PURE__ */ jsx("div", { className: "account-tabs-scroll flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0", children: dashboardTabs.map((tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => setActiveTab(tab.id),
        className: `group inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-[1.1rem] border px-4 text-[9px] font-black uppercase tracking-[0.14em] transition sm:min-h-[54px] sm:w-full sm:rounded-[1.25rem] sm:text-[10px] sm:tracking-[0.16em] ${isActive ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100 shadow-[0_0_28px_rgba(103,232,249,0.08)]" : "border-transparent bg-white/[0.012] text-slate-500 hover:border-cyan-200/12 hover:bg-cyan-300/[0.035] hover:text-cyan-100"}`,
        children: [
          /* @__PURE__ */ jsx(
            Icon,
            {
              size: 15,
              className: `transition ${isActive ? "text-cyan-100" : "text-slate-500 group-hover:text-cyan-100"}`
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "sm:hidden", children: tab.shortLabel }),
          /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: tab.label })
        ]
      },
      tab.id
    );
  }) }) });
}
function WaysToEarnCard({ icon: Icon, title, description }) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-cyan-200/10 bg-[#020617]/45 p-4 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025] sm:rounded-2xl", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200 sm:h-11 sm:w-11", children: [
      /* @__PURE__ */ jsx(Icon, { size: 18, className: "sm:hidden" }),
      /* @__PURE__ */ jsx(Icon, { size: 19, className: "hidden sm:block" })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-[14px] font-semibold tracking-[-0.02em] text-white sm:text-sm", children: title }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-[13px] leading-6 text-slate-400 sm:text-sm", children: description })
  ] });
}
function SectionCard({ children, className = "" }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `rounded-[1.7rem] border border-cyan-200/10 bg-white/[0.02] p-5 backdrop-blur-xl sm:rounded-[2rem] sm:p-8 ${className}`,
      children
    }
  );
}
function SectionHeading({ eyebrow, title, description, right }) {
  return /* @__PURE__ */ jsxs("div", { className: "mb-5 flex flex-col gap-3 text-center sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:text-left", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/60 sm:text-[10px] sm:tracking-[0.28em]", children: eyebrow }),
      /* @__PURE__ */ jsx("h2", { className: "mt-2 text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: title })
    ] }),
    description ? /* @__PURE__ */ jsx("p", { className: "mx-auto max-w-md text-[13px] leading-6 text-slate-500 sm:mx-0 sm:text-right sm:text-sm", children: description }) : right
  ] });
}
function AccountDashboard() {
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loginStatus, setLoginStatus] = useState("idle");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const paidOrderStatuses = ["processing", "completed"];
  const recentOrders = useMemo(() => {
    return (account?.recent_orders || []).filter((order) => {
      const orderStatus = String(order.status || "").toLowerCase();
      return paidOrderStatuses.includes(orderStatus);
    });
  }, [account?.recent_orders]);
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
  const pointsBalance = Math.max(apiPointsBalance, earnedFromRecentOrders);
  const loadAccount = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setStatus("loading");
      } else {
        setRefreshing(true);
      }
      setError("");
      const response = await fetch(`/api/account?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache"
        }
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
      setAccount(data);
      setStatus("authenticated");
    } catch (err) {
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
    if (status !== "authenticated") return;
    const interval = window.setInterval(() => {
      loadAccount({ silent: true });
    }, 15e3);
    const handleFocus = () => {
      loadAccount({ silent: true });
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [status]);
  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setLoginStatus("loading");
      setError("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginStatus("error");
        setError(data.error || "Invalid email or password.");
        return;
      }
      setLoginStatus("success");
      setForm({ email: "", password: "" });
      await loadAccount();
    } catch (err) {
      setLoginStatus("error");
      setError("Login failed. Please try again.");
    }
  };
  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    setAccount(null);
    setStatus("unauthenticated");
    setLoginStatus("idle");
  };
  if (status === "loading") {
    return /* @__PURE__ */ jsx("section", { className: "relative min-h-[70vh] px-5 py-20 text-white sm:px-6 sm:py-24", children: /* @__PURE__ */ jsx("div", { className: "mx-auto flex max-w-7xl items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 rounded-full border border-cyan-200/10 bg-white/[0.025] px-5 py-3 text-cyan-100 backdrop-blur-xl", children: [
      /* @__PURE__ */ jsx(Loader2, { size: 18, className: "animate-spin" }),
      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.2em]", children: "Loading account" })
    ] }) }) });
  }
  if (status === "unauthenticated") {
    return /* @__PURE__ */ jsxs("section", { className: "relative min-h-[75vh] overflow-hidden px-5 py-16 text-white sm:px-6 sm:py-20 lg:py-24", children: [
      /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/8 blur-[120px] sm:h-80 sm:w-80 sm:bg-cyan-300/10 sm:blur-[130px]" }),
        /* @__PURE__ */ jsx("div", { className: "absolute right-[-25%] top-[25%] h-72 w-72 rounded-full bg-blue-500/8 blur-[120px] lg:right-[-10%] lg:bg-blue-500/10 lg:blur-[130px]" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center lg:text-left", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 lg:mb-5 lg:justify-start", children: [
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)] lg:hidden" }),
            /* @__PURE__ */ jsx("span", { className: "hidden h-px w-8 bg-cyan-300/70 lg:block" }),
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/70 sm:text-[10px] sm:tracking-[0.32em]", children: "Client Portal" })
          ] }),
          /* @__PURE__ */ jsxs("h1", { className: "mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-2xl sm:text-[54px] lg:mx-0 lg:text-[68px] lg:leading-[1.03] lg:tracking-[-0.055em]", children: [
            "Access your",
            /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85", children: "rewards dashboard." })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-[360px] text-[13.5px] leading-7 text-slate-300/65 sm:max-w-xl sm:text-[15px] sm:leading-8 lg:mx-0 lg:mt-6", children: "Sign in to view your points balance, recent orders, and rewards activity connected to your account." }),
          /* @__PURE__ */ jsxs("div", { className: "mt-7 grid grid-cols-2 gap-3 sm:mt-8 lg:max-w-xl", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-cyan-200/10 bg-white/[0.018] p-4 text-left backdrop-blur-xl sm:rounded-2xl", children: [
              /* @__PURE__ */ jsx(BadgeCheck, { size: 18, className: "mb-3 text-cyan-200" }),
              /* @__PURE__ */ jsx("p", { className: "text-[13.5px] font-semibold text-white sm:text-sm", children: "Points tracking" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-[12.5px] leading-5 text-slate-400 sm:text-sm sm:leading-6", children: "Earn points from eligible completed orders." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-cyan-200/10 bg-white/[0.018] p-4 text-left backdrop-blur-xl sm:rounded-2xl", children: [
              /* @__PURE__ */ jsx(PackageCheck, { size: 18, className: "mb-3 text-cyan-200" }),
              /* @__PURE__ */ jsx("p", { className: "text-[13.5px] font-semibold text-white sm:text-sm", children: "Order history" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-[12.5px] leading-5 text-slate-400 sm:text-sm sm:leading-6", children: "Review recent paid orders and points earned." })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "form",
          {
            onSubmit: handleLogin,
            className: "relative overflow-hidden rounded-[1.7rem] border border-cyan-200/10 bg-white/[0.025] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-8",
            children: [
              /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-[100px]" }),
              /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
                /* @__PURE__ */ jsxs("div", { className: "mb-7 sm:mb-8", children: [
                  /* @__PURE__ */ jsx("div", { className: "mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.06] text-cyan-200 sm:h-12 sm:w-12", children: /* @__PURE__ */ jsx(User, { size: 20 }) }),
                  /* @__PURE__ */ jsx("h2", { className: "text-[24px] font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: "Sign in" }),
                  /* @__PURE__ */ jsx("p", { className: "mt-2 text-[13px] leading-6 text-slate-400 sm:text-sm", children: "Use your customer account credentials." })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
                  /* @__PURE__ */ jsxs("label", { className: "block", children: [
                    /* @__PURE__ */ jsx("span", { className: "mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]", children: "Email" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "email",
                        value: form.email,
                        onChange: (event) => setForm((prev) => ({
                          ...prev,
                          email: event.target.value
                        })),
                        className: "min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35",
                        placeholder: "customer@email.com",
                        required: true
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("label", { className: "block", children: [
                    /* @__PURE__ */ jsx("span", { className: "mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]", children: "Password" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        value: form.password,
                        onChange: (event) => setForm((prev) => ({
                          ...prev,
                          password: event.target.value
                        })),
                        className: "min-h-[52px] w-full rounded-2xl border border-cyan-200/10 bg-[#020617]/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35",
                        placeholder: "••••••••",
                        required: true
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "mt-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/35 px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-xs leading-5 text-slate-500", children: "Having trouble accessing your account?" }),
                  /* @__PURE__ */ jsxs(
                    "a",
                    {
                      href: "/forgot-password",
                      className: "group inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/75 transition hover:text-white",
                      children: [
                        "Reset password",
                        /* @__PURE__ */ jsx("span", { className: "h-px w-6 bg-cyan-200/40 transition group-hover:w-8 group-hover:bg-white" })
                      ]
                    }
                  )
                ] }) }),
                error && /* @__PURE__ */ jsx("p", { className: "mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200", children: error }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "submit",
                    disabled: loginStatus === "loading",
                    className: "mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:text-[11px] sm:tracking-[0.2em]",
                    children: loginStatus === "loading" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsx(Loader2, { size: 16, className: "animate-spin" }),
                      "Signing in"
                    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                      "Access Dashboard",
                      /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
                    ] })
                  }
                ),
                /* @__PURE__ */ jsxs("p", { className: "mt-5 text-center text-xs leading-6 text-slate-500", children: [
                  "New here?",
                  " ",
                  /* @__PURE__ */ jsx("a", { href: "/register", className: "text-cyan-200 hover:text-white", children: "Create an account" })
                ] })
              ] })
            ]
          }
        )
      ] })
    ] });
  }
  if (status === "error") {
    return /* @__PURE__ */ jsx("section", { className: "relative px-5 py-20 text-white sm:px-6 sm:py-24", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl rounded-[1.7rem] border border-red-400/15 bg-red-400/10 p-6 text-center sm:rounded-[2rem] sm:p-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold text-white", children: "Account unavailable" }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm leading-7 text-red-100/80", children: error }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => loadAccount(),
          className: "mt-6 rounded-full bg-cyan-300 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-white",
          children: "Try again"
        }
      )
    ] }) });
  }
  return /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden px-5 py-16 text-white sm:px-6 sm:py-20 lg:py-24", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/7 blur-[120px] lg:left-[8%] lg:top-12 lg:h-72 lg:w-72 lg:translate-x-0" }),
      /* @__PURE__ */ jsx("div", { className: "absolute right-[-25%] top-[35%] h-80 w-80 rounded-full bg-blue-500/8 blur-[130px] lg:right-[-8%] lg:bg-blue-500/10" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex flex-col items-center gap-5 text-center sm:mb-10 lg:flex-row lg:items-end lg:justify-between lg:text-left", children: [
        /* @__PURE__ */ jsxs("div", { className: "w-full", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center justify-center gap-3 lg:mb-5 lg:justify-start", children: [
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.75)]" }),
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/70 sm:text-[10px] sm:tracking-[0.32em]", children: "Account Dashboard" })
          ] }),
          /* @__PURE__ */ jsxs("h1", { className: "mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[54px] lg:mx-0 lg:text-[68px] lg:leading-[1.03] lg:tracking-[-0.055em]", children: [
            "Welcome back,",
            /* @__PURE__ */ jsx("span", { className: "block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent lg:bg-none lg:text-cyan-200/85", children: account.name })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mx-auto mt-5 max-w-[360px] text-[13.5px] leading-7 text-slate-300/65 sm:max-w-xl sm:text-[15px] sm:leading-8 lg:mx-0", children: "Use the tabs below to view your personal information, rewards, and paid order activity." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center lg:justify-end", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => loadAccount({ silent: true }),
              disabled: refreshing,
              className: "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-cyan-200/12 bg-white/[0.025] px-4 text-[8px] font-black uppercase tracking-[0.12em] text-white/75 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white disabled:opacity-60 sm:w-fit sm:gap-3 sm:px-5 sm:py-3 sm:text-[10px] sm:tracking-[0.18em]",
              children: [
                refreshing ? /* @__PURE__ */ jsx(Loader2, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsx(Sparkles, { size: 14 }),
                "Refresh"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: handleLogout,
              className: "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-cyan-200/12 bg-white/[0.025] px-4 text-[8px] font-black uppercase tracking-[0.12em] text-white/75 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white sm:w-fit sm:gap-3 sm:px-5 sm:py-3 sm:text-[10px] sm:tracking-[0.18em]",
              children: [
                /* @__PURE__ */ jsx(LogOut, { size: 14 }),
                "Logout"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx(DashboardMenu, { activeTab, setActiveTab }),
      activeTab === "overview" && /* @__PURE__ */ jsx("div", { className: "space-y-4 sm:space-y-5", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:gap-5 lg:grid-cols-[1.05fr_0.95fr]", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[1.7rem] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(4,12,24,0.96),rgba(8,38,56,0.66),rgba(4,12,24,0.96))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8", children: [
          /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/12 blur-[110px]" }),
          /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-7 flex items-start justify-between gap-4 sm:mb-10 sm:gap-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/70 sm:text-[10px] sm:tracking-[0.28em]", children: "Rewards Balance" }),
                /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap items-end gap-2 sm:mt-5 sm:gap-3", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[56px] font-semibold leading-none tracking-[-0.08em] text-white sm:text-[96px]", children: pointsBalance.toLocaleString("en-US") }),
                  /* @__PURE__ */ jsx("span", { className: "pb-2 text-base font-semibold tracking-[-0.04em] text-cyan-100/80 sm:pb-3 sm:text-xl", children: "points" })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] text-cyan-100 sm:h-14 sm:w-14", children: /* @__PURE__ */ jsx(Sparkles, { size: 22 }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2 sm:gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3 sm:p-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Recent earned" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: earnedFromRecentOrders.toLocaleString("en-US") })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3 sm:p-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Paid orders" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: recentOrders.length })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3 sm:p-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Recent spend" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: formatMoney(totalSpent) })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-5 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 sm:mt-6", children: /* @__PURE__ */ jsx("p", { className: "text-xs leading-6 text-slate-400", children: "Rewards are calculated from eligible paid orders. Current rule: 1 USD = 1 point." }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(SectionCard, { children: [
          /* @__PURE__ */ jsx(
            SectionHeading,
            {
              eyebrow: "Quick Summary",
              title: "Account snapshot",
              description: "A quick view of your profile, rewards, and paid order activity."
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setActiveTab("personal"),
                className: "group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]",
                children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "Personal information" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs leading-5 text-slate-500", children: "View your name, email, and account status." })
                  ] }),
                  /* @__PURE__ */ jsx(
                    ArrowRight,
                    {
                      size: 16,
                      className: "shrink-0 text-cyan-200 transition group-hover:translate-x-1"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setActiveTab("rewards"),
                className: "group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]",
                children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "Rewards guide" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs leading-5 text-slate-500", children: "See how points are earned from eligible orders." })
                  ] }),
                  /* @__PURE__ */ jsx(
                    ArrowRight,
                    {
                      size: 16,
                      className: "shrink-0 text-cyan-200 transition group-hover:translate-x-1"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setActiveTab("orders"),
                className: "group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 text-left transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025]",
                children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white", children: "Recent paid orders" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs leading-5 text-slate-500", children: "Review completed or processing paid order activity." })
                  ] }),
                  /* @__PURE__ */ jsx(
                    ArrowRight,
                    {
                      size: 16,
                      className: "shrink-0 text-cyan-200 transition group-hover:translate-x-1"
                    }
                  )
                ]
              }
            )
          ] })
        ] })
      ] }) }),
      activeTab === "personal" && /* @__PURE__ */ jsxs(SectionCard, { children: [
        /* @__PURE__ */ jsx(
          SectionHeading,
          {
            eyebrow: "Personal Info",
            title: "Account details",
            description: "Basic customer information connected to your account."
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-3 lg:grid-cols-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Name" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm font-semibold text-white", children: account.name })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Email" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 break-all text-sm font-semibold text-white", children: account.email })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Account status" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-2 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100", children: [
              /* @__PURE__ */ jsx(BadgeCheck, { size: 16 }),
              "Active rewards member"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.035] p-4", children: /* @__PURE__ */ jsx("p", { className: "text-xs leading-6 text-slate-400", children: "Need to update your personal details? Contact support with your account email so the team can help verify and update your information securely." }) })
      ] }),
      activeTab === "rewards" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 sm:space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[1.7rem] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(4,12,24,0.96),rgba(8,38,56,0.66),rgba(4,12,24,0.96))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8", children: [
          /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/12 blur-[110px]" }),
          /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
            /* @__PURE__ */ jsx(
              SectionHeading,
              {
                eyebrow: "Rewards",
                title: "Rewards balance",
                description: "Track points earned from eligible paid orders."
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end gap-2 sm:gap-3", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[56px] font-semibold leading-none tracking-[-0.08em] text-white sm:text-[96px]", children: pointsBalance.toLocaleString("en-US") }),
              /* @__PURE__ */ jsx("span", { className: "pb-2 text-base font-semibold tracking-[-0.04em] text-cyan-100/80 sm:pb-3 sm:text-xl", children: "points" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mt-6 grid grid-cols-3 gap-2 sm:gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3 sm:p-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Recent earned" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: earnedFromRecentOrders.toLocaleString("en-US") })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3 sm:p-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Paid orders" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: recentOrders.length })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-3 sm:p-4", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[8px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]", children: "Recent spend" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl", children: formatMoney(totalSpent) })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(SectionCard, { children: [
          /* @__PURE__ */ jsx(
            SectionHeading,
            {
              eyebrow: "Rewards Guide",
              title: "Ways to earn points",
              description: "Reward redemption options will be added once available."
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [
            /* @__PURE__ */ jsx(
              WaysToEarnCard,
              {
                icon: ShoppingBag,
                title: "Shop eligible products",
                description: "Earn points when you place eligible orders through your customer account."
              }
            ),
            /* @__PURE__ */ jsx(
              WaysToEarnCard,
              {
                icon: CircleDollarSign,
                title: "1 USD = 1 point",
                description: "Current earning rule: every eligible dollar spent adds points to your rewards balance."
              }
            ),
            /* @__PURE__ */ jsx(
              WaysToEarnCard,
              {
                icon: ShieldCheck,
                title: "Paid orders only",
                description: "Points are calculated from completed or processing orders. Drafts and unpaid orders are hidden."
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-4 rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.035] p-4", children: /* @__PURE__ */ jsx("p", { className: "text-xs leading-6 text-slate-400", children: "Points shown here are based on eligible paid activity. Future reward tiers, redemption rules, and special bonus campaigns may be added later." }) })
        ] })
      ] }),
      activeTab === "orders" && /* @__PURE__ */ jsxs(SectionCard, { children: [
        /* @__PURE__ */ jsx(
          SectionHeading,
          {
            eyebrow: "Orders",
            title: "Recent paid activity",
            right: /* @__PURE__ */ jsxs("p", { className: "text-sm text-slate-500", children: [
              "Showing latest ",
              recentOrders.length,
              " paid order",
              recentOrders.length === 1 ? "" : "s",
              "."
            ] })
          }
        ),
        recentOrders.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-8 text-center", children: [
          /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-white", children: "No paid orders yet" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 text-slate-400", children: "Paid orders will appear here with rewards activity." })
        ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: recentOrders.map((order) => /* @__PURE__ */ jsxs(
          "article",
          {
            className: "grid gap-4 rounded-2xl border border-cyan-200/10 bg-[#020617]/45 p-4 transition hover:border-cyan-200/20 hover:bg-cyan-300/[0.025] sm:grid-cols-[1fr_auto_auto] sm:items-center",
            children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
                  /* @__PURE__ */ jsxs("p", { className: "text-sm font-semibold text-white", children: [
                    "Order #",
                    order.number
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "rounded-full border border-cyan-200/10 bg-cyan-300/[0.055] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/75", children: normalizeStatus(order.status) })
                ] }),
                /* @__PURE__ */ jsxs("p", { className: "mt-2 inline-flex items-center gap-2 text-sm text-slate-500", children: [
                  /* @__PURE__ */ jsx(Clock3, { size: 14 }),
                  formatDate(order.date)
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 border-t border-cyan-200/10 pt-4 sm:contents sm:border-t-0 sm:pt-0", children: [
                /* @__PURE__ */ jsxs("div", { className: "sm:text-right", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.18em] text-slate-500", children: "Total" }),
                  /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-semibold text-white", children: formatMoney(order.total, order.currency) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "sm:text-right", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.18em] text-slate-500", children: "Points earned" }),
                  /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm font-semibold text-cyan-100", children: [
                    "+",
                    Number(order.points_earned || 0).toLocaleString(
                      "en-US"
                    )
                  ] })
                ] })
              ] })
            ]
          },
          order.id
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `
        .account-tabs-scroll {
          scrollbar-width: none;
        }

        .account-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
      ` })
  ] });
}

function AccountExperience() {
  return /* @__PURE__ */ jsxs(CartProvider, { children: [
    /* @__PURE__ */ jsx(SiteHeader, { logoSrc: "/TRANSPARENCIA-03.png" }),
    /* @__PURE__ */ jsx("main", { className: "pt-[118px]", children: /* @__PURE__ */ jsx(AccountDashboard, {}) }),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] });
}

const prerender = false;
const $$Account = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Account // Rewards Dashboard", "description": "Customer account dashboard for rewards points, recent orders, and account activity." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AccountExperience", AccountExperience, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/components/account/AccountExperience.jsx", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/account.astro", void 0);

const $$file = "C:/Users/Sebastian/Desktop/phaseone/research-peptides-site/src/pages/account.astro";
const $$url = "/account";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Account,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

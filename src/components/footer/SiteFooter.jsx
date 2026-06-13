const footerColumns = [
  {
    title: "Shop",
    links: [
      { label: "Shop", href: "/shop" },
      { label: "COA Portal", href: "/coa" },
      { label: "Track Order", href: "/track-order" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My Account", href: "/account" },
      { label: "Rewards", href: "/account" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Research Use Only", href: "/policies/research-use-only" },
      { label: "Terms", href: "/policies/terms" },
      { label: "Privacy", href: "/policies/privacy" },
      { label: "Shipping", href: "/policies/shipping" },
      { label: "Refund", href: "/policies/refund" },
      { label: "Disclaimer", href: "/policies/disclaimer" },
    ],
  },
];

const paymentBadges = [
  {
    id: "visa",
    label: "Visa",
    src: "/payment-icons/visa.svg",
  },
  {
    id: "mastercard",
    label: "Mastercard",
    src: "/payment-icons/mastercard.svg",
  },
  {
    id: "amex",
    label: "American Express",
    src: "/payment-icons/amex.svg",
  },
  {
    id: "zelle",
    label: "Zelle",
    src: "/payment-icons/zelle.svg",
  },
];

export default function SiteFooter({
  logoSrc = "TRANSPARENCIA-03.webp",
  logoAlt = "Phase One Labz",
}) {
  return (
    <footer className="relative px-5 pb-7 pt-10 text-white sm:px-6 sm:pb-8 sm:pt-14">
      <div className="mx-auto max-w-6xl">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-200/16 to-transparent" />

        <div className="grid gap-7 py-8 lg:grid-cols-[1.05fr_1.55fr_0.95fr] lg:items-start lg:gap-10 lg:py-10">
          {/* Brand */}
          <div className="text-center lg:text-left">
            <a href="/" className="inline-flex justify-center lg:justify-start">
              <img
                src={logoSrc}
                alt={logoAlt}
                className="h-11 w-auto object-contain sm:h-14"
                loading="lazy"
              />
            </a>

            <p className="mx-auto mt-4 max-w-[310px] text-[12.5px] leading-6 text-slate-500 sm:max-w-sm sm:text-sm sm:leading-7 lg:mx-0">
              Research-focused catalog built around COA access, batch clarity,
              responsible presentation, and secure account tools.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-3 gap-3 rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.015] p-4 sm:gap-6 sm:p-5 lg:border-0 lg:bg-transparent lg:p-0">
            {footerColumns.map((column) => (
              <div key={column.title} className="min-w-0">
                <h3 className="mb-3 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.26em]">
                  {column.title}
                </h3>

                <ul className="space-y-2.5 sm:space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="block text-[11.5px] font-semibold leading-5 text-slate-400 transition hover:text-cyan-100 sm:text-sm"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Need help */}
          <div className="rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.018] p-4 text-center sm:rounded-2xl sm:p-5 lg:text-left">
            <p className="text-[8.5px] font-black uppercase tracking-[0.22em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.24em]">
              Need Help?
            </p>

            <a
              href="tel:7205171541"
              className="mt-2 block text-[24px] font-black leading-none tracking-[-0.04em] text-white transition hover:text-cyan-100 sm:mt-3 sm:text-[28px]"
            >
              (720) 517-1541
            </a>

            <div className="mx-auto mt-4 grid max-w-[320px] gap-2 text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6 lg:mx-0">
              <p>
                <span className="font-bold text-white/85">Call:</span>{" "}
                Mon–Fri 8am–5pm MT
              </p>

              <p>
                <span className="font-bold text-white/85">Text:</span>{" "}
                7 days 7am–8pm MT
              </p>

              <p className="break-words">
                <span className="font-bold text-white/85">Email:</span>{" "}
                <a
                  href="mailto:support@phaseonelabz.com"
                  className="transition hover:text-cyan-100"
                >
                  support@phaseonelabz.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-[1.25rem] border border-red-400/18 bg-red-500/[0.04] px-4 py-4 sm:rounded-2xl sm:px-5">
          <p className="text-[10.5px] leading-5 text-red-50/70 sm:text-xs sm:leading-6">
            <span className="font-black uppercase tracking-[0.1em] text-red-300">
              For laboratory and research use only.
            </span>{" "}
            Products displayed on this website are intended strictly for
            in-vitro laboratory research purposes only. They are not for human
            consumption, veterinary use, diagnostic use, therapeutic use,
            cosmetic use, food use, dietary supplement use, or clinical
            application.
          </p>

          <p className="mt-2 text-[10px] leading-5 text-red-100/42 sm:mt-3 sm:text-[11px] sm:leading-6">
            Statements on this website have not been evaluated by the U.S. Food
            and Drug Administration. Products are not intended to diagnose,
            treat, cure, or prevent any disease.
          </p>
        </div>

        {/* Bottom */}
        <div className="mt-7 flex flex-col items-center gap-6 border-t border-white/8 pt-6 text-center lg:mt-8 lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <div className="flex max-w-[360px] flex-wrap items-center justify-center gap-2 lg:max-w-none lg:justify-start">
            <span className="mb-1 w-full text-[8.5px] font-black uppercase tracking-[0.22em] text-slate-700 lg:mb-0 lg:mr-2 lg:w-auto">
              We Accept
            </span>

            {paymentBadges.map((badge) => (
              <span
                key={badge.id}
                aria-label={badge.label}
                title={badge.label}
                className="payment-logo-badge"
              >
                <img
                  src={badge.src}
                  alt={badge.label}
                  loading="lazy"
                  decoding="async"
                />
              </span>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-700 lg:items-end lg:text-right lg:text-[9px] lg:tracking-[0.18em]">
            <p>© 2026 Phase One Labz · Research Use Only · 21+</p>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 lg:justify-end lg:gap-x-5">
              <a
                href="/policies/terms"
                className="transition hover:text-cyan-200"
              >
                Terms
              </a>

              <a
                href="/policies/privacy"
                className="transition hover:text-cyan-200"
              >
                Privacy
              </a>

              <a
                href="/policies/shipping"
                className="transition hover:text-cyan-200"
              >
                Shipping
              </a>

              <a
                href="/policies/research-use-only"
                className="transition hover:text-cyan-200"
              >
                Research Use Only
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .payment-logo-badge {
          display: inline-flex;
          height: 34px;
          min-width: 62px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 10px;
          border: 1px solid rgba(103, 232, 249, 0.14);
          background: rgba(2, 6, 23, 0.55);
          padding: 4px 8px;
          box-shadow: none;
        }

        .payment-logo-badge img {
          display: block;
          width: auto;
          max-width: 58px;
          max-height: 24px;
          object-fit: contain;
        }

        .payment-logo-badge[aria-label="Visa"] img {
          max-width: 54px;
          max-height: 23px;
        }

        .payment-logo-badge[aria-label="Mastercard"] img {
          max-width: 52px;
          max-height: 25px;
        }

        .payment-logo-badge[aria-label="American Express"] img {
          max-width: 52px;
          max-height: 25px;
        }

        .payment-logo-badge[aria-label="Zelle"] {
          min-width: 68px;
        }

        .payment-logo-badge[aria-label="Zelle"] img {
          max-width: 60px;
          max-height: 24px;
        }

        @media (max-width: 640px) {
          .payment-logo-badge {
            height: 32px;
            min-width: 58px;
            padding: 4px 7px;
          }

          .payment-logo-badge img {
            max-width: 54px;
            max-height: 22px;
          }

          .payment-logo-badge[aria-label="Zelle"] {
            min-width: 64px;
          }
        }
      `}</style>
    </footer>
  );
}
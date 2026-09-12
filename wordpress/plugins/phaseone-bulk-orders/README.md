# Phase One Bulk Orders

Version 1.2.1 presents fixed offers as complete bundles in both administration
and storefront UI. Per-unit values remain internal to WooCommerce for stock,
order lines and authoritative payment validation.

Version 1.2.0 simplifies product setup to starting quantity plus total bundle
price. The server derives and stores the authoritative unit price; optional
quantity tiers and maximums remain available inside Advanced pricing.

Version 1.1.1 fixes the rule-removal checkbox layout and renders only the
pricing fields relevant to the selected pricing mode, including before the
administration JavaScript initializes.

Version 1.1.0 adds an administrator-controlled Public/Private catalog mode.
Public mode removes the customer Access Code gate while retaining the private
server bridge, authoritative pricing, isolated Bulk Cart and required customer
login at checkout. Private remains the safe default.

Version 1.0.1 fixes discovery of disabled draft rules in the WordPress product
rules screen. Enabled catalog behavior and checkout pricing are unchanged.

Private Bulk access, catalog rules, authoritative quoting, inventory validation,
checkout intents, and WooCommerce order metadata for the Phase One Astro store.

## Implementation

- Phase 1: access codes, persistent server sessions, WordPress administration.
- Phase 2: product/variation rules, fixed/tier pricing, per-SKU minimums, real
  WooCommerce stock/backorder validation, private quote API.
- Phase 3: idempotent checkout intent plus audited PRISM, ACH and Zelle adapters.
- Phase 4: private Astro storefront with an isolated Bulk Cart and HttpOnly BFF sessions.
- Phase 5: PHP lint, pricing smoke tests, production build and package validation.

Each payment handler calls `PhaseOne_Bulk_Checkout::from_payload()` before its
retail pricing routine. Bulk orders use the shared authoritative quote and do
not apply retail coupons, bundle pricing, Recon promotions, Site Gifts, store
credit or affiliate commission. Existing gateway and shipping behavior remains
responsible for payment and shipping. Zelle retains its existing 5% adjustment.

## Private REST routes

All routes require `X-PhaseOne-Checkout-Secret`, using the same secret already
configured for the PRISM bridge.

- `POST /wp-json/phaseone/v1/bulk/access`
- `GET|DELETE /wp-json/phaseone/v1/bulk/session`
- `GET /wp-json/phaseone/v1/bulk/catalog`
- `POST /wp-json/phaseone/v1/bulk/quote`
- `GET|POST /wp-json/phaseone/v1/bulk/checkout-intent`

Session and intent tokens are opaque and are stored server-side only as keyed
hashes. The Astro BFF places them in HttpOnly, SameSite=Lax cookies (Secure on
HTTPS).

## Storefront

- Private route: `/bulk-orders` (excluded from sitemap and `noindex`).
- Client storage: `phaseone_bulk_cart_v1`, containing product/variation IDs and quantities only.
- Checkout route: `/checkout?mode=bulk`, using the existing checkout UI.
- Login is enforced before checkout while access-code sessions may browse the private catalog.

## Order metadata

Bulk order:

- `_phaseone_bulk_order = yes`
- `_phaseone_bulk_access_id`
- `_phaseone_bulk_intent_id`
- `_phaseone_bulk_pricing_fingerprint`

Bulk item:

- `_phaseone_bulk_item = yes`
- `_phaseone_bulk_unit_price`
- `_phaseone_bulk_tier`
- `_phaseone_bulk_min_qty`
- `_phaseone_bulk_rule_revision`

## Packaging

The installable ZIP must contain exactly one root folder:

```text
phaseone-bulk-orders/
  phaseone-bulk-orders.php
  includes/
  assets/
  README.md
```

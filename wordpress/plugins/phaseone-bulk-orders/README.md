# Phase One Bulk Orders

Version 2.0.3 evolves the existing private Bulk workflow without resetting
codes, sessions, product rules, intents, or historical orders.

The 2.0.1 migration enables the exclusion-first catalog model for existing
installations: every eligible SKU inherits Bulk pricing, while explicit
product, variation, family and category exclusions remain authoritative.

Version 2.0.2 also preserves WooCommerce catalog/menu ordering in the private
Bulk catalog and decodes product/category labels for clean storefront output.

Version 2.0.3 makes per-product and per-variation percentage overrides clearer
in Product Rules. A product such as Reta can use 30% while all other products
continue inheriting a 50% global discount.

## Access model

Access is always authorized server-side in this order:

1. A logged-in customer with manually granted `Special Bulk Tier` receives an
   account-bound session automatically.
2. A valid Access Code creates a temporary revocable session.
3. Everyone else sees only public program information, the request form, and
   the Access Code form. The private catalog, inventory, rules, and prices are
   never returned.

A customer needs at least one completed WooCommerce order to request or receive
Special Tier. Eligibility never grants access automatically. Administrators can
approve, reject, or archive requests under WooCommerce > Bulk Orders.

## Pricing and kits

- One kit contains 10 units of the same SKU.
- WooCommerce continues to store real unit quantities and per-unit prices.
- Incomplete kits and quantities combined across different SKUs are rejected.
- The global discount is a configurable default in Bulk Orders > Settings.
- Product and variation rules can inherit the global discount, use a custom
  percentage, use a fixed kit price, or use kit-based pricing tiers.
- Pricing precedence is variation override, product override, then global
  default. Existing fixed and tier rules remain explicit overrides.
- Every displayed savings percentage is calculated from the effective bulk
  unit price and the WooCommerce retail price. The public `Save up to` claim is
  the maximum real, currently purchasable savings across applicable tiers.

Changing a pricing setting rotates the pricing revision and clears catalog and
program caches. New quotes use the change immediately. Existing checkout
intents are re-priced and rejected when their fingerprint is stale. Historical
order and item metadata are not rewritten.

## Catalog inclusion

New installations default to including eligible WooCommerce products. Existing
installations migrate safely to `Legacy explicit` so their current opt-in
catalog does not expand unexpectedly. An administrator can switch to `Include
all eligible products` after reviewing exclusions.

Precedence for catalog visibility is:

1. Specific variation include/exclude.
2. Product/variable-parent include/exclude.
3. Existing variable-parent family and product-category exclusions.
4. Global catalog mode.

The plugin reuses WooCommerce variable parents as product families; it does not
create another taxonomy.

## WordPress administration

WooCommerce > Bulk Orders contains:

- Overview
- Product Rules
- Customer Access
- Access Requests
- Access Codes
- Settings

`Global Bulk Discount (%)` accepts decimal values from 0 up to, but not
including, 100. Validation and sanitization are performed server-side.

## REST routes

All routes require `X-PhaseOne-Checkout-Secret`, using the secret already
configured for the PRISM bridge.

- `GET /wp-json/phaseone/v1/bulk/program`
- `GET /wp-json/phaseone/v1/bulk/customer-access`
- `POST /wp-json/phaseone/v1/bulk/access-request`
- `POST /wp-json/phaseone/v1/bulk/access`
- `GET|DELETE /wp-json/phaseone/v1/bulk/session`
- `GET /wp-json/phaseone/v1/bulk/catalog`
- `POST /wp-json/phaseone/v1/bulk/quote`
- `GET|POST /wp-json/phaseone/v1/bulk/checkout-intent`

Session and intent tokens are opaque and are stored server-side only as keyed
hashes. The Astro BFF places them in HttpOnly, SameSite=Lax cookies, with Secure
enabled on HTTPS. Special Tier sessions are bound to the authenticated account.

## Checkout and order integrity

Each payment handler calls `PhaseOne_Bulk_Checkout::from_payload()` before its
retail pricing routine. The quote is rebuilt server-side from product IDs and
unit quantities. Bulk and retail carts cannot be mixed.

Bulk orders continue to exclude retail coupons, retail bundle promotions, Site
Gifts, store credit, and affiliate commission. WooCommerce remains responsible
for inventory. Existing PRISM, ACH, and Zelle adapters remain in place.

Order metadata includes access source, access ID, intent ID, and the pricing
fingerprint. Item metadata includes unit price, applied pricing tier, minimum,
kit size, retail unit price, effective savings, pricing source, and rule
revision.

## Migration

Schema version 2 adds customer/source fields to Bulk sessions and a dedicated
access-request table through `dbDelta`. Existing records and legacy metadata
are retained. Old enabled rules continue to be interpreted, and old minimums
below one kit normalize to one complete kit at runtime without deleting their
stored pricing.

## Packaging

The installable ZIP must contain exactly one root folder:

```text
phaseone-bulk-orders/
  phaseone-bulk-orders.php
  includes/
  assets/
  README.md
```

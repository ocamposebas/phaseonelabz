# Phase One Site Gifts

Server-authoritative tiered gifts for the Phase One WooCommerce checkout.

## Source of truth

Rules are stored in the non-autoloaded `phaseone_site_gifts_config` option and
managed at **WooCommerce > Site Gifts**. No product IDs or thresholds are
hardcoded. The active mode can be `highest` or `cumulative`.

`PhaseOne_Site_Gifts_Pricing` is shared by the secure cart quote and PRISM
order creation. Eligible merchandise is the sum of paid product line totals
after Phase One product pricing and WooCommerce coupons, excluding gifts,
shipping, taxes, protection, and other fees.

Version 1.0.3 keeps H-Recon/Recon Water at its current WooCommerce catalog
price and outside the 5/10-item quantity tiers. The retired $15 Recon rule is
not calculated by either the quote or order-pricing service.

## Order behavior

Gift lines are normal `WC_Order_Item_Product` records with a zero subtotal and
total. They carry:

- `_phaseone_promotional_gift = yes`
- `_phaseone_gift_rule_id`
- `_phaseone_gift_threshold`
- `_phaseone_gift_mode`

Reconciliation is idempotent: one line per rule, invalid lines are removed,
and every pass uses the current rules. New orders only are considered, so
activation does not rewrite historical orders. WooCommerce inventory and stock
reservations remain authoritative.

For PRISM, bridge 1.6.2 invokes `phaseone_prism_after_gateway_verified` only
after the locked payment amount and hosted redirect have passed validation.
The zero-price gift therefore never enters the PRISM payment request.

## Installation

1. Install and activate **Phase One Site Gifts**.
2. Replace the installed PRISM bridge with the companion 1.7.1 package.
3. Deploy the Astro frontend from the matching source revision.
4. In **WooCommerce > Site Gifts**, add tiers and activate only the rules that
   have a valid, in-stock WooCommerce product or variation.
5. Purge page/CDN caches and test a new order in staging.

The frontend quote accepts the existing `PRISM_CHECKOUT_SHARED_SECRET` when it
is configured. Otherwise the Astro server uses its existing WooCommerce REST
consumer credentials. No credential is exposed to the browser.

## Diagnostics

Important availability and reconciliation errors are written to WooCommerce
logs with source `phaseone-site-gifts`. Normal cart evaluations are not logged.

Rollback is safe: deactivate Site Gifts and restore the previously installed bridge. Existing
zero-value gift order lines remain historical order data and are not modified.

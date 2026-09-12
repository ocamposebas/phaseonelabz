Phase One PRISM Checkout Bridge 1.7.0

Version 1.7.0 adds the isolated Phase One Bulk checkout adapter:
- Accepts only a valid server-authorized Bulk checkout intent.
- Uses the shared Bulk pricing engine and ignores browser-submitted prices.
- Excludes retail coupons, bundles, Recon promotions and Site Gifts for Bulk orders.
- Keeps the existing PRISM pricing lock, shipping and stock reservation behavior.
- Declares WooCommerce HPOS compatibility.

Version 1.6.2 adds the narrow Site Gifts integration:
- Reuses Phase One Site Gifts authoritative pricing when that plugin is active.
- Attaches promotional gift lines only after PRISM verifies the locked amount.
- Does not send gift products or zero-price overrides to the PRISM gateway.
- Preserves the 1.6.1 behavior unchanged when Site Gifts is inactive.

Version 1.6.1 fixes authoritative quantity pricing for Recon Water:
- Recognizes all Recon Water slugs/SKUs/names beginning with recon-water-.
- Excludes Recon Water from bundle-tier quantities and discounts.
- Keeps the two-unit purchase limit scoped to H-Recon only.
- Preserves the 1.6.0 PRISM pricing lock and gateway amount verification.

This version does not require editing wp-config.php.

Recommended setup:
1. Install and activate the plugin.
2. Open WordPress Admin > WooCommerce > PRISM Bridge.
3. Enter the same random private secret twice and save it.
4. In the Astro/Coolify application add:
   PRISM_CHECKOUT_SHARED_SECRET=<the exact same value>
5. Redeploy the Astro application.

The WordPress database stores only a SHA-256 hash of the secret.

Optional alternatives:
- PHASEONE_PRISM_BRIDGE_SECRET can still be defined in wp-config.php.
- PHASEONE_PRISM_BRIDGE_SECRET can be provided as a WordPress/PHP server environment variable.
- A runtime environment/wp-config value takes priority over the admin setting.

Version 1.2.0 added a private order-status endpoint for the Phase One frontend thank-you page.

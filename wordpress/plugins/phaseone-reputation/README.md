# Phase One Reputation

First-party reputation registry for the headless Phase One storefront.

## Responsibilities

- Exposes provider-specific aggregate ratings and review counts through
  `GET /wp-json/phaseone/v1/reputation`.
- Fetches Trustpilot aggregate metrics only through the official Business Units API.
- Refreshes server-side every six hours and hides figures after 24 hours without a
  successful refresh.
- Supports the official TrustBox as a lazy-loaded fallback when API access is not
  available.
- Registers external sources as public links. Aggregate metrics can only be supplied
  by a deliberate server-side adapter through
  `phaseone_reputation_external_provider_metrics`.
- Stores no review bodies and never calculates a combined rating.

## Explicit non-responsibilities

- This plugin does not send review invitations. The official Trustpilot WooCommerce
  plugin remains the sole owner of that flow.
- It does not modify checkout, orders, discounts, rewards, gifts, payments, bundles,
  or COAs.
- PepReview is reserved in the settings schema but remains disabled until its policy
  and moderation model are approved.

## Trustpilot setup

1. Install and activate the official `Trustpilot Reviews` WooCommerce plugin.
2. Connect the Trustpilot business account.
3. Set the invitation trigger to **Completed** only.
4. Do not start historical order synchronization.
5. Under WooCommerce > Reputation, configure the public profile and leave-review
   links.
6. Select Official API only if an API key and Business Unit ID are available.
   Prefer defining the key in `wp-config.php`:

   ```php
   define( 'PHASEONE_TRUSTPILOT_API_KEY', 'your-private-key' );
   ```

7. Otherwise select Official TrustBox and copy the Business Unit ID and template ID
   from Trustpilot's official embed code.


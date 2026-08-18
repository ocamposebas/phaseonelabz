# Phase One TikTok Attribution

WooCommerce server-side companion for TikTok Pixel `D9UBLSRC77UDKVSV1D90`.

## Install

1. Copy `phaseone-tiktok-attribution` to `wp-content/plugins/` and activate it.
2. Define the Events API token only on the WordPress server:

   ```php
   define( 'TIKTOK_CAPI_TOKEN', getenv( 'TIKTOK_CAPI_TOKEN' ) );
   ```

3. Set `TIKTOK_CAPI_TOKEN` in the WordPress host environment.
4. Confirm `/wp-json/phaseone/v1/tiktok-attribution/status` returns the expected pixel and `capi_configured: true`.

The plugin captures `tracking.ttclid` from the custom checkout request, stores it with the order, and sends `CompletePayment` only after WooCommerce marks that order paid. Browser and server use `po_<ORDER_ID>` as their shared event ID.

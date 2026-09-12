# Phase One Labz — Order COAs

This first-party WooCommerce bridge connects the existing COA Manager library to exact lots confirmed during packing.

## Data model

- COA Manager remains the only certificate library.
- Each `WC_Order_Item_Product` stores confirmed fulfillment assignments in `_phaseone_fulfillment_coas`.
- One line item may contain multiple assignments when units are packed from different lots.
- Historical orders without a confirmed fulfillment lot remain pending. A current shipping lot is never substituted for an unknown historical fulfillment lot.

## Fulfillment workflow

1. Install and activate the plugin.
2. Open **WooCommerce → Order COAs**.
3. Search by order number or exact customer email.
4. Select the COA/lot physically packed and its quantity.
5. Check the physical-confirmation checkbox and save.

The current shipping lot is shown first as a suggestion. The server will not save an assignment without explicit confirmation and validates the COA against the order item's variation, SKU, or product ID.

## Customer endpoint

`GET /wp-json/phaseone/v1/account/coas`

The route reuses the existing Bearer-token account authority. It returns only the authenticated customer's processing/completed orders, excludes fully refunded orders and fully refunded line items, and never trusts a customer or order ID supplied by the browser.

Responses are private and `no-store`. Existing public COA files remain public.

# Phase One Labz — Order COAs

Version 1.1.0 connects the existing COA Manager library to immutable WooCommerce order-item COA snapshots.

## Data model

- COA Manager remains the only certificate library.
- Each `WC_Order_Item_Product` stores assignments and its customer-facing certificate snapshot in `_phaseone_fulfillment_coas`.
- One line item may contain multiple assignments when units are packed from different lots.
- New order items automatically capture the matching current shipping COA at purchase time, falling back to the newest matching COA when no record is marked current.
- Editing or replacing the live COA later does not overwrite a previously saved order snapshot.
- The version 1.1.0 migration assigns the currently preferred COA to eligible historical order items that have no assignment. Existing confirmed assignments are preserved and only enriched with their own snapshot.

## Fulfillment workflow

1. Install or update the plugin.
2. New purchases capture their COA automatically.
3. Open **WooCommerce → Order COAs** to monitor the historical migration or correct a physical fulfillment lot.
4. Search by order number or exact customer email.
5. If the packed lot differs, remove the automatic assignment, select the physical COA/lot and quantity, confirm, and save.

Manual fulfillment changes still require explicit confirmation and the server validates the COA against the order item's variation, SKU, or product ID. Automatic and historical capture are idempotent and never replace an existing assignment.

## Customer endpoint

`GET /wp-json/phaseone/v1/account/coas`

The route reuses the existing Bearer-token account authority. It returns only the authenticated customer's processing/completed orders, excludes fully refunded orders and fully refunded line items, and never trusts a customer or order ID supplied by the browser.

Responses are private and `no-store`. Existing public COA files remain public.

# Phase One Labz — Order Evidence

Private packaging evidence for WooCommerce orders.

## Operator workflow

1. Install and activate the plugin in WordPress.
2. Open **WooCommerce → Order Evidence** while signed in as a shop manager or administrator.
3. Search by order number or the customer's exact billing email.
4. Choose the evidence type, tap **Open camera**, and capture one or more photos.
5. Leave **Show these photos to the customer** enabled and upload.

On a supported phone, the file control requests the rear camera directly. The same screen also allows gallery selection when needed.

## Customer experience

The plugin adds `packaging_evidence` metadata to each eligible order returned by the existing `/lab/v1/account-token` endpoint. The Astro storefront displays that evidence in the customer's **Account → Orders** gallery and streams each image through `/api/account/order-evidence`.

## Security model

- Photos are normalized to a maximum dimension of 2200 px.
- Every stored image is encrypted using Sodium secretbox or AES-256-GCM.
- Storage paths and file URLs are never returned to customers.
- The WordPress image endpoint reuses the existing account Bearer token and verifies the order's customer ID or billing email.
- Staff access requires the `manage_woocommerce` capability and a valid REST nonce.
- Customer images use `private, no-store` responses.
- Uploads and removals are recorded in WooCommerce order notes.

The encryption key is derived from the private WordPress authentication salts. Do not rotate those salts without first exporting or retiring existing evidence.


# Astro Starter Kit: Basics

## WordPress promotion and maintenance controls

The `Phase One Site Controls` plugin lives at
`wordpress/plugins/phaseone-site-controls`. After installing and activating it,
open **Site Controls** in WordPress to:

- show or hide a live countdown inside the existing homepage video hero;
- set its duration in hours, headline, supporting copy, and CTA;
- restart an active countdown without relying on a visitor's local clock;
- activate or disable the full-site maintenance experience.

The public configuration endpoint is
`/wp-json/phaseone/v1/site-control`. Astro derives it from the existing
`WOOCOMMERCE_URL`/`WORDPRESS_URL`, or it can be set explicitly:

```dotenv
PHASEONE_SITE_CONTROL_URL=https://your-wordpress.example/wp-json/phaseone/v1/site-control
```

To use the maintenance switch inside the private `/status` dashboard, copy the
secure token shown by the plugin into the Astro server environment:

```dotenv
PHASEONE_SITE_CONTROL_TOKEN=copy-the-token-from-wordpress
```

Keep this token server-side. The browser calls the protected Astro status API;
the token is never sent to visitors. Configuration is refreshed every 15
seconds, so an open homepage can show or hide the countdown and an open public
page can enter maintenance without a manual reload.

## Private system status

The internal dashboard is available at `/status` and is intentionally absent
from navigation and the sitemap. Both the page and `/api/status/health` require
the dedicated status session; customer and WordPress sessions do not grant
access.

Configure these server-side environment variables before deployment:

```dotenv
STATUS_ACCESS_PASSWORD=use-a-strong-private-password
STATUS_SESSION_SECRET=use-a-separate-long-random-secret
```

The password is required and must contain at least 12 characters. A separate
session secret is recommended; when omitted, the password signs the session.
Access is stored in a signed, HTTP-only, same-site cookie for 12 hours. If the
password is missing or invalid, the dashboard fails closed and exposes no
status snapshot.

The next maintenance window is scheduled automatically for the 25th day of
each month at 09:00 UTC for 90 minutes. The dashboard rotates three or four
clearly labeled planned tasks for each window. Verified WordPress plugin,
theme, and core updates are listed separately with their installed and
available versions; planned work is never presented as already completed.
The date and duration can be overridden with
`STATUS_MAINTENANCE_DAY_OF_MONTH`, `STATUS_MAINTENANCE_HOUR_UTC`, and
`STATUS_MAINTENANCE_DURATION_MINUTES`.

Maintenance uses a unified task list. Verified extension updates are labeled
`Plugins`, source changes found in local development are labeled `Development`,
and repeated live-service or browser failures are labeled `Bug`. Browser
diagnostics collect only sanitized error categories, messages, asset names, and
generic page paths; they never collect form values, query strings, cookies,
customer details, or full stack traces. A browser issue becomes actionable only
after three matching reports within 15 minutes. These aggregates are held in
memory and reset on restart; configure `STATUS_RELEASE_SHA` (or Coolify's
`SOURCE_COMMIT`) to identify the deployed revision in the private snapshot.

## TikTok purchase attribution

The storefront captures `ttclid` and TikTok campaign UTM fields on first load,
keeps them for 30 days, and forwards them through every custom checkout flow.
The browser pixel uses `D9UBLSRC77UDKVSV1D90` and fires `CompletePayment` only
after a card order is verified as paid.

Upload `wordpress/dist/phaseone-tiktok-attribution.zip` in WordPress under
Plugins > Add New Plugin > Upload Plugin, then activate it. Configure the Events
API token only on the WordPress server:

```dotenv
TIKTOK_CAPI_TOKEN=your-private-events-api-token
```

The plugin stores the click ID with the WooCommerce order and sends the same paid
event from the server. Both channels use `po_<ORDER_ID>` as `event_id`, so
TikTok can deduplicate them. Zelle and ACH orders are never reported merely for
being created; the server event waits for WooCommerce to confirm payment.

After deployment, verify that
`/wp-json/phaseone/v1/tiktok-attribution/status` reports the expected pixel and
`capi_configured: true`, then use TikTok Events Manager > Test Events for an
end-to-end paid test order.

## Signed checkout agreements

The custom checkout requires an electronic signature for every payment method.
Customers can draw with a mouse/finger or type their signature. Before payment,
the server verifies the WooCommerce order and stores:

- signer name, signature method, drawn PNG (when applicable), UTC timestamps,
  IP/user-agent evidence, order products, and a SHA-256 evidence hash;
- an immutable snapshot of the Terms and Conditions, Refund Policy, and
  Research Use Only Policy accepted at checkout;
- a ready-to-send PDF and email delivery status so WooCommerce events do not
  send duplicates.

The WordPress plugin at
`wordpress/plugins/phaseone-signed-agreements/phaseone-signed-agreements.php`
listens to the native
WooCommerce payment-complete, processing, and completed hooks. It sends the
executed PDF with `wp_mail()`, so it automatically uses the mail/SMTP delivery
already configured in WordPress. PRISM completes the WooCommerce order in the
normal way; there is no external payment webhook and there are no new SMTP environment
variables.

Upload `wordpress/dist/phaseone-signed-agreements.zip` from WordPress under
Plugins > Add New Plugin > Upload Plugin, then activate it. It has no settings
screen because it automatically uses WooCommerce and `wp_mail()`. The existing `WOOCOMMERCE_URL`,
`WOOCOMMERCE_CONSUMER_KEY`, and `WOOCOMMERCE_CONSUMER_SECRET` remain in use
because the checkout attaches the signed evidence to the order before sending
the customer to PRISM.

After activation, WordPress administrators can open WooCommerce > Signed
Agreements to search agreements, preview signatures, inspect order and
delivery status, securely view/download PDFs, and send or explicitly resend a
paid order agreement.

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

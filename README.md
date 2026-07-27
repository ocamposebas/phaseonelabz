# Astro Starter Kit: Basics

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

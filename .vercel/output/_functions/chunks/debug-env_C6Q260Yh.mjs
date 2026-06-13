const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "PUBLIC_RESTOCK_API_URL": "https://labone.local/wp-json/phase/v1/restocks", "PUBLIC_WOOCOMMERCE_URL": "https://labone.local/", "PUBLIC_WP_SITE_URL": "https://labone.local", "SITE": undefined, "SSR": true};
const prerender = false;
async function GET() {
  return new Response(
    JSON.stringify(
      {
        cwd: process.cwd(),
        WOOCOMMERCE_URL2: "http://labone.local:10007",
        WOOCOMMERCE_URL: "https://labone.local/",
        envKeys: Object.keys(Object.assign(__vite_import_meta_env__, { WOOCOMMERCE_URL: "https://labone.local/", WOOCOMMERCE_URL2: "http://labone.local:10007" })).filter(
          (key) => key.includes("WOO")
        )
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
